const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Index" });
});

let browser;

const initializeBrowser = async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath:"/usr/bin/google-chrome",
    defaultViewport: { height: 1920, width: 1920 },
  });
  
};

initializeBrowser();

const creepjs = async function (page) {
  console.log("Waiting for Selector...");
  await new Promise((r) => setTimeout(r, 10000)); // 10-second delay
  await page.waitForSelector("div#fingerprint-data");
  console.log("Selector found");
  return await page.evaluate(() => document.documentElement.outerHTML);
};

const fp = async function (page) {
  const formattedData = {};
  const context = page.browser().defaultBrowserContext();

  await context.overridePermissions("https://demo.fingerprint.com/playground", [
    "clipboard-read",
    "clipboard-write",
    "clipboard-sanitized-write",
    
  ]);

  // await page.bringToFront();
  await page.waitForSelector('button[aria-label="Copy to clipboard"]',{timeout: 60000});

  const copyButtons = await page.$$('button[aria-label="Copy to clipboard"]');
  const title = await page.$$("h4");

  await new Promise((r) => setTimeout(r, 1000));

  function convertObjectsToStrings(obj) {
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        obj[key] = JSON.stringify(obj[key]);
      }
    }
  }

  for (let i = 0; i < copyButtons.length; i++) {
    let button = copyButtons[i];

    await new Promise((r) => setTimeout(r, 100));

    try {
      await button.click();
      console.log("Button clicked");
    } catch (error) {
      console.log("Failed to click button:", error);
    } finally {
      const clipboardData = await page.evaluate(() =>
        navigator.clipboard.readText()
      );
      const curTitle = await page.evaluate(
        (el) => el.textContent.trim(),
        title[i]
      );

      let parsedData;
      try {
        parsedData = JSON.parse(clipboardData);
        if ("products" in parsedData) {
          parsedData = parsedData["products"];
        }
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        parsedData = clipboardData; // Keep as string if parsing fails
      }

      convertObjectsToStrings(parsedData);

      formattedData[curTitle] = parsedData;
    }
  }

  return formattedData;
};

const processPuppeteer = async function (url) {
  const page = await browser.newPage();
  console.log("Navigating to the URL");

  const maxRetries = 3;
  let attempts = 0;
  let htmlContent = null;

  while (attempts < maxRetries) {
    try {
      let response = await page.goto(url, { waitUntil: "networkidle0", timeout: 90000 });

      // Check if the page navigated to about:blank or if the status code is not 200, and reload if necessary
      if (page.url() === 'about:blank' || response.status() !== 200) {
        console.log('Page navigated to about:blank or did not return status 200, reloading...');
        response = await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
      }

      if (url.includes("creepjs")) {
        htmlContent = await creepjs(page);
      } else if (url.includes("playground")) {
        htmlContent = await fp(page);
      } else if (url.includes("amiunique")) {
        await page.waitForSelector(".v-chip.theme--dark.v-size--default",{waitUntil:60000});
        console.log("Got Amiunique");
        htmlContent = await page.content();
      } else {
        await new Promise((r) => setTimeout(r, 10000));
        // const context = page.browser().defaultBrowserContext();
        htmlContent = await page.content();
      }
      await page.close();
      return htmlContent;
    } catch (err) {
      console.error(`Error navigating to the URL (attempt ${attempts + 1}):`, err);
      attempts++;
      if (attempts >= maxRetries) {
        await page.close();
        throw new Error("Error fetching HTML content after multiple attempts");
      }
    }
  }
};


app.get("/", async (req, res) => {
  res.json({ message: "Index" });
});

app.get("/getWS", async (req, res) => {
  res.json({ WSurl: browser.wsEndpoint() });
});

app.post("/html", async (req, res) => {
  try {
    const url = req.body.url;
    if (!url) {
      return res.status(400).json({ error: "URL is required in request body" });
    }

    console.log(`Fetching HTML from: ${url}`);
    const htmlContent = await processPuppeteer(url);
    console.log("HTML content fetched successfully");
    res.json({ htmlContent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching HTML content" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
