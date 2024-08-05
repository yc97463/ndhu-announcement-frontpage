import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, registerFont, loadImage, Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface News {
    title: string;
    timestamp: string;
    url: string;
    date: string;
    department: string;
    author: string;
    content: string;
    category: string;
    ogImage?: string;
}

interface CustomTextMetrics {
    width: number;
    // You can add other properties here if needed in the future
}

class OGImageGenerator {
    private readonly width: number = 1200;
    private readonly height: number = 630;
    private readonly fontFamily: string = 'Noto Sans TC';
    private fontsLoaded: boolean = false;

    constructor(
        // private readonly logoPath: string,
        private readonly outputDir: string
    ) {}

    private async loadFonts(): Promise<void> {
        if (this.fontsLoaded) return;

        const fontPaths = {
            regular: path.join(__dirname, 'assets', 'NotoSansTC-Regular.ttf'),
            bold: path.join(__dirname, 'assets', 'NotoSansTC-Bold.ttf')
        };

        try {
            registerFont(fontPaths.regular, { family: this.fontFamily, weight: '400' });
            registerFont(fontPaths.bold, { family: this.fontFamily, weight: '700' });
            this.fontsLoaded = true;
            console.log('All fonts loaded successfully.');
        } catch (error) {
            console.error('Error loading fonts:', error);
            throw new Error('Failed to load fonts. Please ensure all font files are present in the assets folder.');
        }
    }

    async generateOGImage(newsItem: News): Promise<string> {
        await this.loadFonts();

        const canvas = createCanvas(this.width, this.height);
        const context = canvas.getContext('2d');

        await this.drawBackground(context);
        // await this.drawLogo(context);
        this.drawTitle(context, newsItem.title);
        this.drawMetadata(context, newsItem.date, newsItem.category);
        this.drawContactInfo(context, newsItem.department, newsItem.author);

        const optimizedBuffer = await this.optimizeImage(canvas);
        const imagePath = await this.saveImage(optimizedBuffer, newsItem.timestamp);

        return imagePath;
    }

    private async drawBackground(context: CanvasRenderingContext2D): Promise<void> {
        context.fillStyle = '#ffffff';  // White background
        context.fillRect(0, 0, this.width, this.height);
    }

    // private async drawLogo(context: CanvasRenderingContext2D): Promise<void> {
    //     try {
    //         const logo = await loadImage(this.logoPath);
    //         const logoSize = 100;  // Adjust as needed
    //         context.drawImage(logo, 50, 50, logoSize, logoSize);
    //     } catch (error) {
    //         console.error('Error loading logo:', error);
    //     }
    // }

    private drawText(
        context: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        fontSize: number,
        isBold: boolean = false
    ): void {
        const weight = isBold ? '700' : '400';
        context.font = `${weight} ${fontSize}px "${this.fontFamily}"`;
        context.fillText(text, x, y, maxWidth);
    }

    private drawTitle(context: CanvasRenderingContext2D, title: string): void {
        const fontSize = 40;
        context.fillStyle = '#1f2937';
        this.wrapText(context, title, 50, 200, this.width - 100, 50, fontSize, true);
    }

    private drawMetadata(context: CanvasRenderingContext2D, date: string, category: string): void {
        const fontSize = 24;
        context.fillStyle = '#4b5563';
        this.drawText(context, `${date} · ${category}`, 50, this.height - 50, this.width - 100, fontSize);
    }

    private drawContactInfo(context: CanvasRenderingContext2D, department: string, author: string): void {
        const fontSize = 30;
        context.fillStyle = '#4b5563';
        this.drawText(context, `${department} ${author}`, 50, this.height - 100, this.width - 100, fontSize);
    }

    private wrapText(
        context: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
        fontSize: number,
        isBold: boolean = false
    ): void {
        const words = text.split('');
        let line = '';

        for (const char of words) {
            const testLine = line + char;
            const metrics = this.measureText(context, testLine, fontSize, isBold);

            if (metrics.width > maxWidth && line !== '') {
                this.drawText(context, line, x, y, maxWidth, fontSize, isBold);
                line = char;
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        this.drawText(context, line, x, y, maxWidth, fontSize, isBold);
    }

    private measureText(
        context: CanvasRenderingContext2D,
        text: string,
        fontSize: number,
        isBold: boolean
    ): CustomTextMetrics {
        const weight = isBold ? '700' : '400';
        context.font = `${weight} ${fontSize}px "${this.fontFamily}"`;
        return { width: context.measureText(text).width };
    }

    private async optimizeImage(canvas: Canvas): Promise<Buffer> {
        const buffer = canvas.toBuffer('image/png');
        return sharp(buffer)
            .webp({ quality: 90 })
            .toBuffer();
    }

    private async saveImage(buffer: Buffer, timestamp: string): Promise<string> {
        const imagePath = path.join(this.outputDir, `${timestamp}.webp`);
        await fs.writeFile(imagePath, buffer);
        return `/og/${timestamp}.webp`;
    }
}

export default OGImageGenerator;