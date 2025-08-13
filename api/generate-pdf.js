// ✅ Disable Next.js body parsing so binary stays intact
export const config = {
  api: {
    bodyParser: false,
  },
};

import fs from "fs";
import path from "path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
export default async function handler(req, res) {
  // Always set these first
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ Handle OPTIONS preflight correctly
  if (req.method === "OPTIONS") {
    return res.status(200).json({ message: "CORS preflight OK" });
  }


  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let bodyData = "";
    // ✅ Manually read incoming POST data
    await new Promise((resolve, reject) => {
      req.on("data", chunk => (bodyData += chunk));
      req.on("end", resolve);
      req.on("error", reject);
    });

    const {
      users,
      heading,
      sub_heading,
      banner_sec_image_base64,
      from_us_to_you_title,
      from_us_to_you_cnt,
      cnt_address_sec,
      cnt_sec_image_base64,
      in_addition_title,
      in_addition_cnt,
      footer_cnt
    } = JSON.parse(bodyData);

    // ✅ Build HTML for PDF
    let html = `
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
          }
          .container {
              max-width: 100%;
              width: 48rem;
              margin: 0 auto;
              min-height: calc(100vh - 80px);
              page-break-after: always;
          }
          h1, h3, p {
              text-align: center;
              margin: 0; 
              color: #932313;               
          }
          p {
              font-weight: 700;
              font-size:14px;
          }
          h3 {
              color: #70ad5b;
          }
          h1 {
              font-size: 28px;
              margin-bottom: 10px;
          }
          .address-sec {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-top: 1rem;
          }
          .address p {
              text-align: left;
          }
          .static-content-section {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 8px;
              margin-top: 5px;
          }
          .static-title {
              border: 5px solid #932313;
              padding: 10px;
              text-align: center;
              margin-bottom: 8px;
              font-weight: 700;
          }
          .static-subcnt-div {
              border: 2px solid #932313;
              padding: 10px;
              text-align: center;
              margin-bottom: 8px;
          }
          .static-sub-image {
              border: 2px solid #932313;
              padding: 10px;
              text-align: center;
              margin-bottom: 8px;
          }
          .footer-section {
              border: 5px solid #932313;
              padding: 10px;
              text-align: center;
              font-size: 18px;
              font-weight: 700;
          }
          .static-cnt-div {
              display: grid;
              grid-template-rows: auto 1fr;
          }
          .static-subcnt-div p {
              margin-bottom: 1rem;
          }
          #downloadBtn, #backBtn {
              position: fixed;
              right: 10%;
              padding: 10px 20px;
              border: none;
              border-radius: 8px;
              color: white;
              font-weight: 700;
              cursor: pointer;
              z-index: 1000;
          }
          #downloadBtn {
              top: 10%;
              background-color: #8f5a34;
          }
          #downloadBtn:hover {
              background-color: #bf7f51;
          }
          #backBtn {
              top: 20%;
              background-color: #8f5a34;
          }
          #backBtn:hover {
              background-color: #bf7f51;
          }
          @media print {
              #downloadBtn, #backBtn {
                  display: none;
              }
          }
        </style>
      </head>
      <body>
    `;

    users.forEach(user => {
      html += `
        <section class="container">
                <h1>${heading || ""}</h1>
                <h3>${sub_heading || ""}</h3>
                <div class="address-sec">
                    <div class="address">
                        <p style='padding-bottom:5px;'>${user.first_name} ${user.last_name},</p>
                        ${user.barcode_base64 ? `<div class="barcode-sec"><img src="${user.barcode_base64}" alt="Barcode" width="300" /></div>` : "<p>No Barcode</p>"}
                        <p>${user.mailing_address}</p>
                        <p>${user.mailing_town}, ${user.mailing_zip}, ${user.mailing_carrier_route}, ${user.county}, ${user.state}</p>
                    </div>
                    <div class="image-sec">
                        ${banner_sec_image_base64 ? `<img src="${banner_sec_image_base64}" alt="banner Image" width="300" />` : "<p>Image Not Found</p>"}
                    </div>
                </div>

                <div class="static-content-section">
                    <div class="static-cnt-div section1">
                        <div class="static-title">${from_us_to_you_title}</div>
                        <div class="static-subcnt-div">
                            <p>Hello ${user.first_name}, </p>
                            <p>${from_us_to_you_cnt ? from_us_to_you_cnt.replace(/\n/g, "<br>") : ""}</p>
                        </div>
                    </div>
                    <div class="static-cnt-div section2">
                        <div class="static-subcnt-div">
                            <p>${cnt_address_sec}</p>                        
                        </div>
                        <div class="static-sub-image">
                            ${cnt_sec_image_base64 ? `<img src="${cnt_sec_image_base64}" alt="Content Image" />` : "<p>Image Not Found</p>"}
                        </div>
                    </div>
                    <div class="static-cnt-div section3">
                        <div class="static-title">${in_addition_title}</div>
                        <div class="static-subcnt-div">
                            <p>${in_addition_cnt}</p>
                        </div>
                    </div>
                </div>
                <div class="footer-section">${footer_cnt}</div>
            </section>
      `;
    });

    html += "</body></html>";
    const isLocal = !process.env.AWS_REGION;

    let browser;

    if (isLocal) {
      const puppeteerImport = await import("puppeteer");
      browser = await puppeteerImport.default.launch({
        headless: true,
        args: [],
        executablePath: puppeteerImport.default.executablePath(),
      });
    } else {
      const executablePath =
        typeof chromium.executablePath === "function"
          ? await chromium.executablePath()
          : chromium.executablePath;

      browser = await puppeteer.launch({
        args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      });
    }

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,         // <-- critical for background-color / background-image
      preferCSSPageSize: true,       // use CSS page sizes if you define them
      margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' }
    });

    await browser.close();

    // ✅ Send raw PDF without corruption
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=generated.pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "PDF generation failed - from API" });
  }
}
