# How to Set Up Docker for PDF Generation with Headless Chrome

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, PDF Generation, Headless Chrome, Puppeteer, Node.js, Document Generation

Description: Generate high-quality PDF documents from HTML templates using headless Chrome inside Docker containers for reliable document output.

---

Generating PDFs from HTML is one of those tasks that sounds simple but gets complicated fast. CSS rendering differences, missing fonts, and inconsistent page breaks plague most PDF libraries. Headless Chrome solves these problems by rendering HTML exactly as a browser would, then exporting the result as a PDF. Running this in Docker locks down the rendering environment so your PDFs look identical in development and production.

## Why Headless Chrome for PDFs?

Traditional PDF libraries like wkhtmltopdf or ReportLab each have limitations. wkhtmltopdf uses an outdated WebKit engine that struggles with modern CSS. ReportLab requires building layouts programmatically rather than using HTML/CSS. Headless Chrome, on the other hand, renders modern CSS Grid, Flexbox, and web fonts perfectly because it is a full browser.

The tradeoff is resource usage. Chrome consumes more memory than lightweight PDF libraries. But for most use cases, the rendering quality justifies the cost.

## The Dockerfile

Here is a Docker image optimized for PDF generation:

```dockerfile
# Dockerfile - PDF generation service with headless Chrome
FROM node:20-slim

# Install Chromium and comprehensive font packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libnss3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY src/ ./src/
COPY templates/ ./templates/

RUN mkdir -p /app/output

EXPOSE 3000

CMD ["node", "src/server.js"]
```

Font packages matter enormously for PDF generation. Without them, text renders in a fallback font that looks wrong. The Noto font family covers virtually every writing system in existence.

## The PDF Generation API

Build an Express server that accepts HTML or a template name and returns a PDF:

```javascript
// src/server.js - HTTP API for generating PDFs from HTML templates
const express = require('express');
const { generatePDF } = require('./pdf-generator');
const { renderTemplate } = require('./template-engine');

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;

// Generate PDF from raw HTML content
app.post('/pdf/from-html', async (req, res) => {
  const { html, options = {} } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'html field is required' });
  }

  try {
    const pdfBuffer = await generatePDF(html, options);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${options.filename || 'document'}.pdf"`
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Generate PDF from a named template with data
app.post('/pdf/from-template', async (req, res) => {
  const { template, data = {}, options = {} } = req.body;

  if (!template) {
    return res.status(400).json({ error: 'template name is required' });
  }

  try {
    const html = await renderTemplate(template, data);
    const pdfBuffer = await generatePDF(html, options);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${options.filename || template}.pdf"`
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Generate PDF from a public URL
app.post('/pdf/from-url', async (req, res) => {
  const { url, options = {} } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  try {
    const pdfBuffer = await generatePDF(null, { ...options, url });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${options.filename || 'page'}.pdf"`
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`PDF service running on port ${PORT}`);
});
```

## The PDF Generator Module

This module handles the Puppeteer interaction for PDF creation:

```javascript
// src/pdf-generator.js - Core PDF generation logic with Chrome
const puppeteer = require('puppeteer-core');

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
let browser = null;

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;

  browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none'
    ]
  });

  return browser;
}

async function generatePDF(html, options = {}) {
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    if (options.url) {
      // Load content from a URL
      await page.goto(options.url, { waitUntil: 'networkidle2', timeout: 30000 });
    } else {
      // Load raw HTML content directly into the page
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    }

    // Configure PDF output with sensible defaults
    const pdfOptions = {
      format: options.format || 'A4',
      printBackground: true,
      margin: {
        top: options.marginTop || '20mm',
        bottom: options.marginBottom || '20mm',
        left: options.marginLeft || '15mm',
        right: options.marginRight || '15mm'
      },
      displayHeaderFooter: !!options.headerTemplate || !!options.footerTemplate,
      headerTemplate: options.headerTemplate || '',
      footerTemplate: options.footerTemplate || '',
      preferCSSPageSize: options.preferCSSPageSize || false,
      landscape: options.landscape || false
    };

    return await page.pdf(pdfOptions);
  } finally {
    await page.close();
  }
}

module.exports = { generatePDF };
```

## HTML Templates

Create reusable templates for common document types. Here is an invoice template:

```html
<!-- templates/invoice.html - Invoice template with print-optimized CSS -->
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans', sans-serif; color: #333; font-size: 14px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
    .invoice-title { font-size: 32px; color: #666; text-align: right; }
    .invoice-meta { text-align: right; margin-top: 8px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th { background: #f1f5f9; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .amount { text-align: right; }
    .total-row { font-weight: bold; font-size: 16px; }
    .total-row td { border-top: 2px solid #333; }

    /* CSS page break controls for multi-page invoices */
    @media print {
      .page-break { page-break-before: always; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">{{companyName}}</div>
      <p>{{companyAddress}}</p>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">
        <p>#{{invoiceNumber}}</p>
        <p>Date: {{date}}</p>
        <p>Due: {{dueDate}}</p>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th class="amount">Unit Price</th>
        <th class="amount">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td class="amount">${{unitPrice}}</td>
        <td class="amount">${{total}}</td>
      </tr>
      {{/items}}
      <tr class="total-row">
        <td colspan="3">Total</td>
        <td class="amount">${{grandTotal}}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
```

The template engine processes these templates:

```javascript
// src/template-engine.js - Simple Mustache-style template rendering
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');

async function renderTemplate(templateName, data) {
  const templatePath = path.join(TEMPLATE_DIR, `${templateName}.html`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');
  return Mustache.render(templateHtml, data);
}

module.exports = { renderTemplate };
```

## Docker Compose Setup

```yaml
# docker-compose.yml - PDF generation service
version: "3.8"

services:
  pdf-service:
    build: .
    container_name: pdf-service
    ports:
      - "3000:3000"
    volumes:
      - ./output:/app/output
      - ./templates:/app/templates
    shm_size: "1g"
    environment:
      PORT: 3000
      NODE_ENV: production
    restart: unless-stopped
```

## Generating PDFs

Generate a PDF from an invoice template:

```bash
# Create an invoice PDF from a template with data
curl -X POST http://localhost:3000/pdf/from-template \
  -H "Content-Type: application/json" \
  -d '{
    "template": "invoice",
    "data": {
      "companyName": "Acme Corp",
      "companyAddress": "123 Main St, Springfield",
      "invoiceNumber": "INV-2026-001",
      "date": "2026-02-08",
      "dueDate": "2026-03-08",
      "items": [
        {"description": "Web Development", "quantity": 40, "unitPrice": "150.00", "total": "6000.00"},
        {"description": "Design Work", "quantity": 20, "unitPrice": "120.00", "total": "2400.00"}
      ],
      "grandTotal": "8400.00"
    },
    "options": {"filename": "invoice-2026-001"}
  }' --output invoice.pdf
```

Generate a PDF from raw HTML:

```bash
# Generate a simple PDF from inline HTML
curl -X POST http://localhost:3000/pdf/from-html \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<h1>Hello World</h1><p>This PDF was generated by headless Chrome in Docker.</p>",
    "options": {"format": "Letter", "landscape": true}
  }' --output hello.pdf
```

## Adding Headers and Footers

Chrome's PDF generation supports custom headers and footers:

```bash
# Generate PDF with page numbers in the footer
curl -X POST http://localhost:3000/pdf/from-html \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<h1>Report</h1><p>Content goes here...</p>",
    "options": {
      "headerTemplate": "<div style=\"font-size:10px; width:100%; text-align:center;\">Confidential Report</div>",
      "footerTemplate": "<div style=\"font-size:10px; width:100%; text-align:center;\">Page <span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span></div>",
      "marginTop": "30mm",
      "marginBottom": "30mm"
    }
  }' --output report.pdf
```

## Wrapping Up

Headless Chrome in Docker provides the most accurate HTML-to-PDF conversion available. The rendering quality matches what you see in a browser, which means your CSS skills transfer directly to PDF layout. By wrapping the generator in an HTTP API, any service in your infrastructure can produce PDFs on demand. The Docker setup ensures consistent output regardless of the host environment, and the template system keeps document designs manageable and reusable.
