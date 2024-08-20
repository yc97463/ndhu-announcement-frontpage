import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

interface Announcement {
    title: string;
    timestamp: string;
    url: string;
    date: string;
    department: string;
    attachmentCount: number;
}

interface Category {
    id: number;
    name: string;
    category: string;
}

const baseUrl = 'https://raw.githubusercontent.com/yc97463/ndhu-announcement/gh-pages';
const categories: Category[] = [
    { id: 0, name: "全部消息", category: "latest" },
    { id: 1, name: "行政公告", category: "administration" },
    { id: 2, name: "活動公告", category: "events" },
    { id: 3, name: "課程公告", category: "course" },
    { id: 4, name: "招生公告", category: "admission" },
    { id: 5, name: "研討會", category: "conference" },
    { id: 6, name: "獎助學金", category: "pt-scholarship" },
    { id: 7, name: "徵才資訊", category: "carreer" },
    { id: 8, name: "其他公告", category: "other" },
];

// Determine __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Use __dirname to read the file
const template = fs.readFileSync(path.join(__dirname, 'index.ejs'), 'utf-8');

function ensureDirSync(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

const fetchAnnouncementData = async (url: string, retries = 3): Promise<Announcement[]> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [data];
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        if (retries > 0) {
            console.log(`Retrying fetch for ${url}. Attempts left: ${retries - 1}`);
            return fetchAnnouncementData(url, retries - 1);
        } else {
            console.error(`Failed to fetch data from ${url} after multiple attempts`);
            return [];
        }
    }
};

async function generateIndexPage() {
    console.log('Generating index page...');

    const allAnnouncements: { category: Category; announcements: Announcement[] }[] = [];

    for (const category of categories) {
        console.log(`Fetching ${category.name}...`);
        const url = `${baseUrl}/${category.category}/1.json`;
        const announcements = await fetchAnnouncementData(url);
        allAnnouncements.push({ category, announcements });
    }

    const outputDir = path.join(__dirname, 'dist');
    ensureDirSync(outputDir);

    const html = ejs.render(template, { categories, allAnnouncements });
    const outputPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(outputPath, html);

    console.log('Generated index page');
}

generateIndexPage().catch(console.error);