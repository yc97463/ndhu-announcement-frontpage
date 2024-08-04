import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

interface News {
    title: string;
    timestamp: string;
    url: string;
    date: string;
    department: string;
    author: string;
    content: string;
    category: string;
}

const baseUrl = 'https://yc97463.github.io/ndhu-announcement';
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

category.map(async (item) => {
    // 5 pages of simple news list
    for (let i = 1; i <= 5; i++) {
        const news_list_url = `${baseUrl}/${item.category}/${i}.json`;
        // fetch the json
        const newsData: News[] = await fetch(news_list_url).then((res) => res.json());
        // for each news item, generate a html file

        const outputDir = path.join(__dirname, 'dist', item.category);
        ensureDirSync(outputDir);

        newsData.forEach(async (newsItem, index) => {
            const news_detail_url = `${baseUrl}/article/${newsItem.timestamp}.json`;
            let newsDetail: News[] = await fetch(news_detail_url).then((res) => res.json());
            // add "category" item to the news detail
            newsDetail[0].category = item.name;

            const html = ejs.render(template, { ...newsDetail[0], getOgDescription });
            const outputPath = path.join(outputDir, `${newsItem.timestamp}.html`);
            fs.writeFileSync(outputPath, html);
        });
    }

});

