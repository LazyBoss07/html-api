const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());
app.get('/', (req, res) => {
  res.json({ message: 'Index' });
});

const gethtml = async function(url) {
  const browser = await puppeteer.launch({
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'],  
  });
  const page = await browser.newPage();
  console.log("Got the URL");

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const htmlContent = await page.content();
    await browser.close();
    return htmlContent;
  } catch (err) {
    console.error("Error navigating to the URL:", err);
    await browser.close();
    throw new Error('Error fetching HTML content');
  }
};

app.get('/html', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'URL query parameter is required' });
    }

    console.log(`Sending URL: ${url}`);
    const htmlContent = await gethtml(url); 
    console.log("Sent received data");
    res.json({ html: htmlContent });

  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Error fetching HTML content' });
  }
});
app.post('/html1', async (req, res) => {
  try {
    const url = req.body.url;
    console.log(url);
    if (!url) {
      return res.status(400).json({ error: 'URL query parameter is required' });
    }

    console.log(`Sending URL: ${url}`);
    const htmlContent = await gethtml(url);
    console.log("Sent received data");
    res.json({ html: htmlContent });

  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Error fetching HTML content' });
  }
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
