// @ts-nocheck
const FS = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const blockResourcesPlugin = require("puppeteer-extra-plugin-block-resources")();
puppeteer.use(blockResourcesPlugin);

const LAUNCH_PUPPETEER_OPTS = {
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu",
    "--window-size=1920x1080",
  ],
};

const PAGE_PUPPETEER_OPTS = {
  waitUntil: "domcontentloaded",
  timeout: 3000000,
};

blockResourcesPlugin.blockedTypes.add("media");
blockResourcesPlugin.blockedTypes.add("stylesheet");
blockResourcesPlugin.blockedTypes.add("image");
blockResourcesPlugin.blockedTypes.add("font");
blockResourcesPlugin.blockedTypes.add("texttrack");
blockResourcesPlugin.blockedTypes.add("eventsource");
blockResourcesPlugin.blockedTypes.add("websocket");
blockResourcesPlugin.blockedTypes.add("manifest");
blockResourcesPlugin.blockedTypes.add("other");

async function getData() {
  const browser = await puppeteer.launch(LAUNCH_PUPPETEER_OPTS);
  const page = await browser.newPage();

  const csvFile = [];
  let counter = 1;

  for (let index = 0; index < counter; index++) {
    await page.goto(
      `https://www.dns-shop.ru/catalog/17a8d26216404e77/vstraivaemye-xolodilniki/?p=${counter}`,
      PAGE_PUPPETEER_OPTS
    );
    await page.waitForTimeout(20000);

    const sentenceData = await page.evaluate(() => {
      const info = [];
      const namesList = [];
      const linksList = [];
      const pricesList = [];

      const sentences = document.querySelector(
        ".products-list__content"
      ).innerHTML;

      let prices = sentences.match(
        /(<div class="product-buy__price">\b([^>]*)\/div)|(product-buy__price_active">\b([^>]*)<span class)/gm
      );
      pricesList.push(prices.toString().match(/\d+\s\d+/gm));

      let names = sentences.match(/\/"><span>.*?>*?<\/span>/gm);
      names.forEach((el) => {
        namesList.push(el.slice(9, -7));
      });

      let links = sentences.match(/ck" href=.*?>*?"><s/gm);
      links.forEach((el) => {
        linksList.push("https://www.dns-shop.ru" + el.slice(10, -4));
      });

      for (let index = 0; index < namesList.length; index++) {
        info.push({
          link: linksList[index],
          name: namesList[index],
          price: pricesList[0][index],
        });
      }
      return info;
    });

    console.log("Продуктов в списке:", sentenceData.length + csvFile.length);
    sentenceData.length < 18 ? (counter = 1) : (counter += 1);
    sentenceData.forEach((el) => csvFile.push(el));
  }

  await browser.close();
  const separator = ",";
  return FS.writeFileSync(
    "data.csv",
    csvFile
      .map(
        (row) => `${row.link}${separator}"${row.name}"${separator}${row.price}`
      )
      .join("\n")
  );
}

getData();
