# How to Build a Serverless PDF Generation Service Using Cloud Run and Puppeteer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Puppeteer, PDF Generation, Serverless, Node.js

Description: Build a scalable serverless PDF generation service on Google Cloud Run using Puppeteer to render HTML templates into pixel-perfect PDF documents.

---

Generating PDFs is one of those tasks that seems straightforward until you need pixel-perfect output with dynamic data, custom fonts, headers, footers, and page numbers. Most PDF libraries produce mediocre output. The trick that works consistently is rendering your document as HTML with CSS, then using a headless browser to convert it to PDF. This gives you the full power of CSS for layout, which is far more flexible than any PDF-specific API.

Puppeteer runs a headless Chrome instance and can generate PDFs from any HTML content. Cloud Run is a perfect fit for this because PDF generation is bursty - you might generate hundreds of PDFs at month-end for invoices, then nothing for days. Serverless lets you scale to handle the burst without paying for idle servers.

## Project Setup

Start with the dependencies. Puppeteer needs a specific Chrome build that runs in the container.

```bash
mkdir pdf-service && cd pdf-service
npm init -y
npm install puppeteer express handlebars @google-cloud/storage
```

## Building the PDF Service

The service accepts an HTML template name and data, renders the HTML, and converts it to PDF using Puppeteer.

```javascript
// server.js
const express = require('express');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '5mb' }));

const storage = new Storage();
const BUCKET_NAME = process.env.PDF_BUCKET || 'my-project-pdfs';

// Keep a browser instance alive for reuse across requests
let browser;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // Important for containerized environments
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });
  }
  return browser;
}

// Register Handlebars helpers for common formatting needs
Handlebars.registerHelper('currency', (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
});

Handlebars.registerHelper('date', (value) => {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

app.post('/generate', async (req, res) => {
  const { template, data, options = {} } = req.body;

  try {
    // Load and compile the template
    const templatePath = path.join(__dirname, 'templates', `${template}.hbs`);
    if (!fs.existsSync(templatePath)) {
      return res.status(400).json({ error: `Template '${template}' not found` });
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const compiledTemplate = Handlebars.compile(templateSource);
    const html = compiledTemplate(data);

    // Generate the PDF using Puppeteer
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    // Set the HTML content with a base URL for relative asset paths
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Configure PDF output options
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      margin: options.margin || {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      printBackground: true,
      displayHeaderFooter: options.showHeaderFooter || false,
      headerTemplate: options.headerTemplate || '',
      footerTemplate: options.footerTemplate || `
        <div style="font-size: 10px; text-align: center; width: 100%;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
    });

    await page.close();

    // Upload to Cloud Storage if a filename was specified
    if (options.saveTo) {
      const bucket = storage.bucket(BUCKET_NAME);
      const blob = bucket.file(options.saveTo);
      await blob.save(pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          template: template,
          generatedAt: new Date().toISOString(),
        },
      });

      // Generate a signed download URL
      const [signedUrl] = await blob.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });

      return res.json({
        success: true,
        url: signedUrl,
        size: pdfBuffer.length,
      });
    }

    // Return the PDF directly
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${template}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => res.send('OK'));

const port = parseInt(process.env.PORT || '8080');
app.listen(port, () => {
  console.log(`PDF service running on port ${port}`);
});

// Clean up the browser on shutdown
process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});
```

## Creating an Invoice Template

Here is a professional invoice template using Handlebars and CSS.

```html
<!-- templates/invoice.hbs -->
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      color: #333;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3b82f6;
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #1e40af;
    }
    .invoice-title {
      font-size: 32px;
      color: #3b82f6;
      text-align: right;
    }
    .invoice-number {
      font-size: 14px;
      color: #666;
      text-align: right;
    }
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .address-block h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background-color: #f0f4ff;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #3b82f6;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .text-right { text-align: right; }
    .totals {
      float: right;
      width: 300px;
    }
    .totals table {
      margin-bottom: 0;
    }
    .totals .grand-total td {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      border-top: 2px solid #3b82f6;
    }
    .notes {
      clear: both;
      margin-top: 40px;
      padding: 15px;
      background-color: #f8fafc;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">{{company.name}}</div>
      <div>{{company.address}}</div>
      <div>{{company.email}}</div>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">#{{invoice.number}}</div>
      <div>Date: {{date invoice.date}}</div>
      <div>Due: {{date invoice.dueDate}}</div>
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>Bill To</h3>
      <div><strong>{{customer.name}}</strong></div>
      <div>{{customer.address}}</div>
      <div>{{customer.email}}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{this.description}}</td>
        <td class="text-right">{{this.quantity}}</td>
        <td class="text-right">{{currency this.unitPrice}}</td>
        <td class="text-right">{{currency this.amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Subtotal</td>
        <td class="text-right">{{currency totals.subtotal}}</td>
      </tr>
      <tr>
        <td>Tax ({{totals.taxRate}}%)</td>
        <td class="text-right">{{currency totals.tax}}</td>
      </tr>
      <tr class="grand-total">
        <td>Total</td>
        <td class="text-right">{{currency totals.total}}</td>
      </tr>
    </table>
  </div>

  {{#if notes}}
  <div class="notes">
    <strong>Notes:</strong> {{notes}}
  </div>
  {{/if}}
</body>
</html>
```

## The Dockerfile

Puppeteer needs Chrome installed in the container. Use the official Puppeteer base image to avoid dependency headaches.

```dockerfile
# Dockerfile
FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

# Switch to root to install dependencies, then back to pptruser
USER root
COPY package*.json ./
RUN npm ci --production

COPY . .
RUN chown -R pptruser:pptruser /app
USER pptruser

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

EXPOSE 8080
CMD ["node", "server.js"]
```

## Deploying to Cloud Run

```bash
# Build and deploy
gcloud run deploy pdf-service \
  --source=. \
  --region=us-central1 \
  --memory=1Gi \
  --cpu=2 \
  --concurrency=5 \
  --timeout=60 \
  --max-instances=20 \
  --no-allow-unauthenticated

# Create the storage bucket for generated PDFs
gcloud storage buckets create gs://my-project-pdfs --location=us-central1
```

Note the low concurrency setting. Puppeteer is memory-intensive, so each instance should only handle a few concurrent requests.

## Using the Service

```bash
# Generate an invoice PDF
curl -X POST https://pdf-service-xxxx.run.app/generate \
  -H "Content-Type: application/json" \
  -d '{
    "template": "invoice",
    "data": {
      "company": {"name": "Acme Corp", "address": "123 Main St", "email": "billing@acme.com"},
      "customer": {"name": "John Doe", "address": "456 Oak Ave", "email": "john@example.com"},
      "invoice": {"number": "INV-2026-001", "date": "2026-02-17", "dueDate": "2026-03-17"},
      "items": [
        {"description": "Web Development", "quantity": 40, "unitPrice": 150, "amount": 6000},
        {"description": "Design Work", "quantity": 20, "unitPrice": 120, "amount": 2400}
      ],
      "totals": {"subtotal": 8400, "taxRate": 10, "tax": 840, "total": 9240}
    },
    "options": {"saveTo": "invoices/INV-2026-001.pdf"}
  }'
```

## Batch PDF Generation

For generating many PDFs at once (like monthly invoices), combine with Cloud Tasks to process them reliably.

```python
# batch_generate.py - Enqueue PDF generation tasks
from google.cloud import tasks_v2
import json

tasks_client = tasks_v2.CloudTasksClient()
queue_path = tasks_client.queue_path('my-project', 'us-central1', 'pdf-generation')

def enqueue_batch(invoices):
    """Enqueue multiple PDF generation tasks."""
    for invoice in invoices:
        task = {
            'http_request': {
                'http_method': tasks_v2.HttpMethod.POST,
                'url': 'https://pdf-service-xxxx.run.app/generate',
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'template': 'invoice',
                    'data': invoice,
                    'options': {'saveTo': f'invoices/{invoice["invoice"]["number"]}.pdf'},
                }).encode(),
            },
        }
        tasks_client.create_task(request={'parent': queue_path, 'task': task})
```

## Wrapping Up

Puppeteer on Cloud Run is a reliable way to generate PDFs at scale. The HTML-to-PDF approach gives you full CSS control over the layout, which is much more productive than using low-level PDF libraries. Keep the concurrency low because Chrome is memory-hungry, and reuse the browser instance across requests within a container to avoid the overhead of launching Chrome for every PDF.

Monitor your PDF service with OneUptime to track generation times, memory usage, and failure rates. When a template change causes rendering failures or generation times spike, you want to catch it immediately rather than discovering it when a customer complains about a missing invoice.
