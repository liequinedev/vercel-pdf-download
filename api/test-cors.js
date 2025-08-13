export const config = {
  api: {
    bodyParser: false,
  },
};

import fs from "fs";
import path from "path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// ===== Logger =====
function logToFile(message) {
  const logFile = path.join(process.cwd(), "logs.txt");
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  logToFile("Rejected non-POST request");
  res.json({ message: 'CORS works!' });
}
