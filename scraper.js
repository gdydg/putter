const puppeteer = require('puppeteer');
const fs = require('fs');

const targetUrl = process.env.TARGET_URL || 'https://gemini.google.com';
const outputFile = 'paths.txt';

(async () => {
    // 针对 CI/CD 环境优化启动参数，增加 --disable-dev-shm-usage 防止内存溢出崩溃
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    const page = await browser.newPage();

    // 伪装成正常的 Windows Chrome 浏览器，防止被反爬虫机制拦截导致无限加载
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const resourceUrls = new Set();

    page.on('response', response => {
        const url = response.url();
        if (!url.startsWith('data:')) {
            resourceUrls.add(url);
        }
    });

    console.log(`🚀 正在启动抓取任务，目标网址: ${targetUrl} ...`);

    try {
        // 放宽等待条件为 networkidle2 (允许保留少许后台连接)
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log(`✅ 页面主要内容加载完成！`);
    } catch (error) {
        // 如果依然超时，我们只记录警告，不让程序崩溃
        console.warn(`⚠️ 提示: 页面加载超时或遇到跳转 (${error.message})`);
        console.log(`💡 但这不影响结果，我们已经成功拦截到了加载过程中的文件路径。`);
    } finally {
        // 将保存文件的逻辑移到 finally 块，确保无论是否超时，都会保存已抓取到的数据
        console.log(`📊 统计：共拦截到 ${resourceUrls.size} 个路径。`);
        
        if (resourceUrls.size > 0) {
            const urlsArray = Array.from(resourceUrls).join('\n');
            fs.writeFileSync(outputFile, urlsArray, 'utf-8');
            console.log(`💾 结果已成功保存到: ${outputFile}`);
        } else {
            console.log(`❌ 未抓取到任何有效路径，可能是网页拒绝访问。`);
            // 创建一个空文件防止 upload-artifact 报错
            fs.writeFileSync(outputFile, 'No paths captured.', 'utf-8'); 
        }

        await browser.close();
    }
})();
