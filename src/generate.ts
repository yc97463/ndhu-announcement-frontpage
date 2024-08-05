import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import OGImageGenerator from './OGImageGenerator.js';

interface News {
    title: string;
    timestamp: string;
    url: string;
    date: string;
    department: string;
    author: string;
    content: string;
    category?: string;
    ogImage?: string;
    hasAttachment?: boolean;
}

const baseUrl = 'https://raw.githubusercontent.com/yc97463/ndhu-announcement/gh-pages';
const category = [
    {
        id: 0,
        name: "全部消息",
        category: "latest",
    },
    {
        id: 1,
        name: "行政公告",
        category: "administration",
    },
    {
        id: 2,
        name: "活動公告",
        category: "events",
    },
    {
        id: 3,
        name: "課程公告",
        category: "course",
    },
    {
        id: 4,
        name: "招生公告",
        category: "admission",
    },
    {
        id: 5,
        name: "研討會",
        category: "conference",
    },
    {
        id: 6,
        name: "獎助學金",
        category: "pt-scholarship",
    },
    {
        id: 7,
        name: "徵才資訊",
        category: "carreer",
    },
    {
        id: 8,
        name: "其他公告",
        category: "other",
    },
];

// Determine __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Use __dirname to read the file
const template = fs.readFileSync(path.join(__dirname, 'template.ejs'), 'utf-8');

function ensureDirSync(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function getOgDescription(content: string): string {
    try {
        const parts = content.split('<hr class="clear-contentunit"/>');
        if (parts.length > 1) {
            const innerContent = parts[1].split('<hr/>')[0];
            const preTagContent = innerContent.split('<pre>')[1]?.split('</pre>')[0];
            return preTagContent ? `${preTagContent.substring(0, 50)} (...more)` : '';
        }
    } catch (error) {
        console.error('Error processing content for og:description', error);
    }
    return '';
}

const fetchNewsData = async (url: string): Promise<News[]> => {
    const response = await fetch(url);

    // Use type assertion here
    const data = (await response.json()) as News[];

    // Optionally, validate the structure of data here
    if (!Array.isArray(data)) {
        throw new Error("Data is not an array");
    }

    return data;
};

// Add this new function to generate OG images
async function createOGImageForNewsItem(newsItem: News, outputDir: string): Promise<string> {
    const generator = new OGImageGenerator(
        // path.join(__dirname, 'assets', 'logo.png'), // Correct path to your logo
        outputDir
    );

    try {
        const ogImagePath = await generator.generateOGImage(newsItem);
        console.log(`Generated OG image for "${newsItem.title}"`);
        return ogImagePath;
    } catch (error) {
        console.error(`Failed to generate OG image for "${newsItem.title}":`, error);
        return ''; // Or a default image path
    }
}

function checkAttachment(content: string): boolean {
    try {
        const parts = content.split('<hr class="clear-contentunit"/>');
        if (parts.length < 2) return false;
        const innerContent = parts[1].split('<hr/>');
        if (innerContent.length < 2) return false;
        return innerContent[1].includes('/thumb/');
    } catch (error) {
        console.error('Error processing content for attachment', error);
        return false;
    }
}

category.map(async (item) => {
    console.log(`Generating ${item.name}...`);
    if (item.id === 0) {
        console.log('Skip generating "全部消息"');
        return;
    }

    // 5 pages of simple news list
    for (let i = 1; i <= 5; i++) {
        console.log(`Fetching ${item.name} page ${i}...`);

        const news_list_url = `${baseUrl}/${item.category}/${i}.json`;
        let newsData: News[] = [];
        try {
            newsData = await fetchNewsData(news_list_url);
            console.log(`Fetched ${newsData.length} news items`);
        } catch (error) {
            console.error('Error fetching news data:', error);
        }

        // for each news item, generate a html file
        const outputDir = path.join(__dirname, 'dist');
        ensureDirSync(outputDir);

        newsData.forEach(async (newsItem, index) => {
            console.log(`Generating ${item.category}/${newsItem.timestamp}.html...`);
            console.log(`\t ${item.name} \t ${newsItem.title}`);

            const news_detail_url = `${baseUrl}/article/${newsItem.timestamp}.json`;
            let newsDetail: News[] = [];
            try {
                newsDetail = await fetchNewsData(news_detail_url);
            } catch (error) {
                console.error('Error fetching news detail:', error);
            }

            // add "category" item to the news detail
            newsDetail[0].category = item.name;
            newsDetail[0].hasAttachment = checkAttachment(newsDetail[0].content);

            // Generate OG image
            const ogImageOutputDir = path.join(__dirname, 'dist', 'og');
            ensureDirSync(ogImageOutputDir);
            const ogImagePath = await createOGImageForNewsItem(newsDetail[0], ogImageOutputDir);

            // Add ogImage to newsDetail
            newsDetail[0].ogImage = ogImagePath;

            const html = ejs.render(template, { ...newsDetail[0], getOgDescription });
            const outputPath = path.join(outputDir, `${newsItem.timestamp}.html`);
            fs.writeFileSync(outputPath, html);
        });
        console.log(`Generated ${item.name} page ${i}`);
    }
    console.log(`Generated ${item.name}`);

});

