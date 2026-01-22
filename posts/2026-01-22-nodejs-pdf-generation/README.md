# How to Create PDF Generation in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, PDF, Puppeteer, PDFKit, Documents

Description: Learn how to generate PDF documents in Node.js using Puppeteer, PDFKit, and other libraries for invoices, reports, and certificates.

---

PDF generation is a common requirement for creating invoices, reports, certificates, and other business documents. Node.js offers several libraries for creating PDFs programmatically.

## Using Puppeteer (HTML to PDF)

Puppeteer is ideal for converting HTML templates to PDF.

```bash
npm install puppeteer
```

### Basic HTML to PDF

```javascript
const puppeteer = require('puppeteer');

async function generatePDF(htmlContent, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0',
  });
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm',
    },
  });
  
  await browser.close();
}

// Usage
const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>Hello, PDF!</h1>
  <p>This is a generated PDF document.</p>
</body>
</html>
`;

await generatePDF(html, 'output.pdf');
```

### Generate Invoice PDF

```javascript
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class InvoiceGenerator {
  constructor() {
    this.browser = null;
  }
  
  async init() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
  
  async loadTemplate(templateName) {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(templateContent);
  }
  
  async generate(invoiceData) {
    const template = await this.loadTemplate('invoice');
    const html = template(invoiceData);
    
    const page = await this.browser.newPage();
    
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
    });
    
    await page.close();
    return pdfBuffer;
  }
}

// Invoice template (templates/invoice.hbs)
/*
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica', sans-serif; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company-name { font-size: 24px; font-weight: bold; color: #333; }
    .invoice-details { text-align: right; }
    .invoice-number { font-size: 20px; color: #4F46E5; }
    .addresses { display: flex; gap: 40px; margin-bottom: 40px; }
    .address { flex: 1; }
    .address h3 { margin-bottom: 10px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f9fafb; font-weight: 600; }
    .total-row { font-weight: bold; font-size: 18px; }
    .footer { margin-top: 60px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <div class="company-name">{{company.name}}</div>
      <div>{{company.address}}</div>
      <div>{{company.email}}</div>
    </div>
    <div class="invoice-details">
      <div class="invoice-number">Invoice #{{invoiceNumber}}</div>
      <div>Date: {{date}}</div>
      <div>Due: {{dueDate}}</div>
    </div>
  </div>
  
  <div class="addresses">
    <div class="address">
      <h3>Bill To:</h3>
      <div>{{customer.name}}</div>
      <div>{{customer.address}}</div>
      <div>{{customer.email}}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>${{unitPrice}}</td>
        <td>${{amount}}</td>
      </tr>
      {{/each}}
      <tr class="total-row">
        <td colspan="3">Total</td>
        <td>${{total}}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="footer">
    <p>Thank you for your business!</p>
    <p>Payment terms: Net 30</p>
  </div>
</body>
</html>
*/

// Usage
const generator = new InvoiceGenerator();
await generator.init();

const pdfBuffer = await generator.generate({
  invoiceNumber: 'INV-2024-001',
  date: '2024-01-15',
  dueDate: '2024-02-15',
  company: {
    name: 'My Company',
    address: '123 Business St, City',
    email: 'billing@company.com',
  },
  customer: {
    name: 'John Doe',
    address: '456 Customer Ave, Town',
    email: 'john@example.com',
  },
  items: [
    { description: 'Web Development', quantity: 40, unitPrice: 100, amount: 4000 },
    { description: 'Design Services', quantity: 20, unitPrice: 80, amount: 1600 },
  ],
  total: 5600,
});

await fs.writeFile('invoice.pdf', pdfBuffer);
await generator.close();
```

### Generate from URL

```javascript
async function pdfFromUrl(url, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(url, {
    waitUntil: 'networkidle0',
  });
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
  });
  
  await browser.close();
}

await pdfFromUrl('https://example.com/report', 'report.pdf');
```

## Using PDFKit (Programmatic PDF)

PDFKit creates PDFs programmatically without HTML.

```bash
npm install pdfkit
```

### Basic Document

```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');

function createPDF(outputPath) {
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(outputPath);
  
  doc.pipe(stream);
  
  // Add content
  doc
    .fontSize(25)
    .text('Hello, PDF!', 100, 100);
  
  doc
    .fontSize(12)
    .text('This is a paragraph of text.', 100, 150, {
      width: 400,
      align: 'justify',
    });
  
  // Add image
  doc.image('logo.png', 100, 250, { width: 100 });
  
  // Draw shapes
  doc
    .rect(100, 400, 200, 100)
    .fill('#4F46E5');
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
```

### Invoice with PDFKit

```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');

function createInvoice(invoice, outputPath) {
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);
  
  // Header
  generateHeader(doc, invoice);
  generateCustomerInfo(doc, invoice);
  generateInvoiceTable(doc, invoice);
  generateFooter(doc);
  
  doc.end();
  
  return new Promise((resolve) => {
    stream.on('finish', resolve);
  });
}

function generateHeader(doc, invoice) {
  doc
    .fillColor('#333')
    .fontSize(20)
    .text('My Company', 50, 50)
    .fontSize(10)
    .text('123 Business Street')
    .text('City, State 12345')
    .text('billing@company.com')
    .moveDown();
  
  doc
    .fillColor('#4F46E5')
    .fontSize(20)
    .text(`Invoice #${invoice.number}`, 400, 50, { align: 'right' })
    .fontSize(10)
    .fillColor('#333')
    .text(`Date: ${invoice.date}`, { align: 'right' })
    .text(`Due: ${invoice.dueDate}`, { align: 'right' });
}

function generateCustomerInfo(doc, invoice) {
  doc
    .fontSize(12)
    .text('Bill To:', 50, 150)
    .fontSize(10)
    .text(invoice.customer.name)
    .text(invoice.customer.address)
    .text(invoice.customer.email);
}

function generateInvoiceTable(doc, invoice) {
  const tableTop = 250;
  
  // Table header
  doc
    .fontSize(10)
    .fillColor('#666');
  
  generateTableRow(doc, tableTop, 'Description', 'Qty', 'Unit Price', 'Amount');
  
  doc
    .strokeColor('#ddd')
    .lineWidth(1)
    .moveTo(50, tableTop + 20)
    .lineTo(550, tableTop + 20)
    .stroke();
  
  // Table rows
  let position = tableTop + 30;
  doc.fillColor('#333');
  
  for (const item of invoice.items) {
    generateTableRow(
      doc,
      position,
      item.description,
      item.quantity,
      `$${item.unitPrice.toFixed(2)}`,
      `$${item.amount.toFixed(2)}`
    );
    position += 25;
  }
  
  // Total
  doc
    .strokeColor('#333')
    .lineWidth(2)
    .moveTo(350, position + 10)
    .lineTo(550, position + 10)
    .stroke();
  
  doc
    .fontSize(12)
    .fillColor('#333')
    .text('Total:', 350, position + 20)
    .text(`$${invoice.total.toFixed(2)}`, 450, position + 20, { align: 'right' });
}

function generateTableRow(doc, y, desc, qty, price, amount) {
  doc
    .text(desc, 50, y, { width: 200 })
    .text(qty.toString(), 280, y, { width: 50, align: 'center' })
    .text(price, 350, y, { width: 80, align: 'right' })
    .text(amount, 450, y, { width: 100, align: 'right' });
}

function generateFooter(doc) {
  doc
    .fontSize(10)
    .fillColor('#666')
    .text('Thank you for your business!', 50, 700, {
      align: 'center',
      width: 500,
    })
    .text('Payment is due within 30 days.', {
      align: 'center',
      width: 500,
    });
}

// Usage
await createInvoice({
  number: 'INV-2024-001',
  date: '2024-01-15',
  dueDate: '2024-02-15',
  customer: {
    name: 'John Doe',
    address: '456 Customer Ave',
    email: 'john@example.com',
  },
  items: [
    { description: 'Web Development', quantity: 40, unitPrice: 100, amount: 4000 },
    { description: 'Design Services', quantity: 20, unitPrice: 80, amount: 1600 },
  ],
  total: 5600,
}, 'invoice.pdf');
```

## Using pdf-lib (PDF Manipulation)

pdf-lib is great for modifying existing PDFs.

```bash
npm install pdf-lib
```

### Fill PDF Form

```javascript
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;

async function fillPDFForm(templatePath, data, outputPath) {
  const pdfBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const form = pdfDoc.getForm();
  
  // Fill text fields
  form.getTextField('name').setText(data.name);
  form.getTextField('email').setText(data.email);
  form.getTextField('date').setText(data.date);
  
  // Check checkboxes
  if (data.agreeTerms) {
    form.getCheckBox('terms').check();
  }
  
  // Select from dropdown
  form.getDropdown('country').select(data.country);
  
  // Flatten form (make fields non-editable)
  form.flatten();
  
  const modifiedPdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, modifiedPdfBytes);
}
```

### Merge PDFs

```javascript
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;

async function mergePDFs(pdfPaths, outputPath) {
  const mergedPdf = await PDFDocument.create();
  
  for (const pdfPath of pdfPaths) {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }
  
  const mergedPdfBytes = await mergedPdf.save();
  await fs.writeFile(outputPath, mergedPdfBytes);
}

// Usage
await mergePDFs(['doc1.pdf', 'doc2.pdf', 'doc3.pdf'], 'merged.pdf');
```

### Add Watermark

```javascript
const { PDFDocument, rgb, degrees } = require('pdf-lib');
const fs = require('fs').promises;

async function addWatermark(pdfPath, watermarkText, outputPath) {
  const pdfBytes = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const pages = pdfDoc.getPages();
  
  for (const page of pages) {
    const { width, height } = page.getSize();
    
    page.drawText(watermarkText, {
      x: width / 2 - 100,
      y: height / 2,
      size: 50,
      color: rgb(0.75, 0.75, 0.75),
      rotate: degrees(45),
      opacity: 0.3,
    });
  }
  
  const modifiedPdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, modifiedPdfBytes);
}

await addWatermark('document.pdf', 'CONFIDENTIAL', 'watermarked.pdf');
```

## Express API for PDF Generation

```javascript
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

let browser;

// Initialize browser on startup
async function initBrowser() {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
  });
}

initBrowser();

app.post('/api/pdf/invoice', async (req, res) => {
  try {
    const { invoiceData } = req.body;
    
    const page = await browser.newPage();
    const html = generateInvoiceHTML(invoiceData);
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });
    
    await page.close();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceData.number}.pdf`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await browser.close();
  process.exit(0);
});

app.listen(3000);
```

## Summary

| Library | Best For |
|---------|----------|
| Puppeteer | HTML to PDF, complex layouts |
| PDFKit | Programmatic PDF creation |
| pdf-lib | PDF manipulation, forms |
| pdfmake | Declarative PDF creation |

| Feature | Puppeteer | PDFKit | pdf-lib |
|---------|-----------|--------|---------|
| HTML support | Yes | No | No |
| Forms | No | No | Yes |
| Merge PDFs | No | No | Yes |
| Images | Yes | Yes | Yes |
| Tables | Yes | Manual | Manual |

| Use Case | Recommended Library |
|----------|---------------------|
| Invoice from template | Puppeteer + Handlebars |
| Fill existing PDF form | pdf-lib |
| Merge documents | pdf-lib |
| Complex reports | Puppeteer |
| Simple documents | PDFKit |
