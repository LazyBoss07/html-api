const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Index' });
});

const creepjs = async function (page) {
  console.log("Waiting for Selector...");
  await new Promise((r) => setTimeout(r, 10000)); // 10-second delay
  await page.waitForSelector('div#fingerprint-data');
  console.log("Selected");
  return await page.evaluate(() => document.documentElement.outerHTML);
};

const gethtml = async function(url) {
  const browser = await puppeteer.launch({
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'],  
    // executablePath:"/usr/bin/google-chrome",
    defaultViewport:{height:1920,width:1920}
  });
  const page = await browser.newPage();
  console.log("Got the URL");

  try {
    let htmlContent=null;
    await page.goto(url,{ waitUntil: 'networkidle0',timeout:60000});
    if(url.includes('creepjs')) { 
    htmlContent = await creepjs(page);
    }else{
    await new Promise((r) => setTimeout(r, 10000));
    htmlContent = await page.content();
    }
    await browser.close();
    // console.log(htmlContent);
    return htmlContent;
  } catch (err) {
    console.error("Error navigating to the URL:", err);
    await browser.close();
    throw new Error('Error fetching HTML content');
  }
};

const saveHtmlToFile = async (htmlContent) => {
  console.log("File Handling");
  const systemName = os.hostname(); // Get system hostname
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-"); // Format timestamp
  const filename = `${systemName}_${timestamp}.html`; // Construct filename
  const filePath = path.join(__dirname, filename);
  console.log("Writing File");
  fs.writeFileSync(filePath, htmlContent);
  return filePath;
};

app.get('/html', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'URL query parameter is required' });
    }

    console.log(`Fetching HTML from: ${url}`);
    const htmlContent = await gethtml(url);
    console.log("Creating File");
    const filePath = await saveHtmlToFile(htmlContent);
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ error: "Failed to send file" });
      } else {
        console.log(`File sent successfully: ${filePath}`);

        // Delete the file after sending
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting file:", unlinkErr);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching HTML content' });
  }
});

app.post('/html1', async (req, res) => {
  try {
    const url = req.body.url;
    if (!url) {
      return res.status(400).json({ error: 'URL is required in request body' });
    }

    console.log(`Fetching HTML from: ${url}`);
    const htmlContent = await gethtml(url);
    
    const filePath = await saveHtmlToFile(htmlContent);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ error: "Failed to send file" });
      } else {
        console.log(`File sent successfully: ${filePath}`);

        // Delete the file after sending
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting file:", unlinkErr);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      }
    });

  }
// }});}
   catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching HTML content' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
