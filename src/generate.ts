import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import OGImageGenerator from './OGImageGenerator.js';

interface Attachment {
    fileName: string;
    fileSize: string;
    filePath: string;
    thumbPath: string;
}

interface News {
    title: string;
    timestamp: string;
    url: string;
    date: string;
    department: string;
    author: {
        department: string;
        name: string;
        email: string;
        phone: string;
    };
    content: string;
    category?: string;
    ogImage?: string;
    attachments: Attachment[];
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

const fetchNewsData = async (url: string, retries = 3): Promise<News[]> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        try {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
                return data;
            } else if (typeof data === 'object' && data !== null) {
                return [data];
            } else {
                console.log('Unexpected data format:', data);
                throw new Error("Data is neither an array nor a valid news object");
            }
        } catch (jsonError) {
            console.error(`Error parsing JSON from ${url}:`, jsonError);
            if (retries > 0) {
                console.log(`Retrying fetch for ${url}. Attempts left: ${retries - 1}`);
                return fetchNewsData(url, retries - 1);
            } else {
                throw new Error("Failed to parse JSON after multiple attempts");
            }
        }
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        if (retries > 0) {
            console.log(`Retrying fetch for ${url}. Attempts left: ${retries - 1}`);
            return fetchNewsData(url, retries - 1);
        } else {
            console.error(`Failed to fetch data from ${url} after multiple attempts`);
            return []; // Return an empty array after all retries fail
        }
    }
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
            let newsDetail: News[] = await fetchNewsData(news_detail_url);

            // add "category" item to the news detail
            newsDetail[0].category = item.name;

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