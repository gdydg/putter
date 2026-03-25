const puppeteer = require('puppeteer');
const fs = require('fs');

// 从环境变量读取目标 URL，如果没有则使用默认值
const targetUrl = process.env.TARGET_URL || 'https://gemini.google.com';
const outputFile = 'paths.txt';

(async () => {
    // 针对 CI/CD 环境优化启动参数
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    const resourceUrls = new Set();

    page.on('response', response => {
        const url = response.url();
        if (!url.startsWith('data:')) {
            resourceUrls.add(url);
        }
    });

    console.log(`🚀 正在启动抓取任务，目标网址: ${targetUrl} ...`);

    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });
        console.log(`✅ 抓取完成！共拦截到 ${resourceUrls.size} 个路径。`);

        // 将 Set 转换为数组，并用换行符连接，最后写入 txt 文件
        const urlsArray = Array.from(resourceUrls).join('\n');
        fs.writeFileSync(outputFile, urlsArray, 'utf-8');
        console.log(`💾 结果已成功保存到: ${outputFile}`);

    } catch (error) {
        console.error('❌ 抓取过程中出现错误:', error);
    } finally {
        await browser.close();
    }
})();
