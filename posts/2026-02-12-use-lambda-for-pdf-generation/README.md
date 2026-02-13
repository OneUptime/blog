# How to Use Lambda for PDF Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, PDF, Serverless

Description: Build a serverless PDF generation service using AWS Lambda that creates invoices, reports, and documents on demand without managing any servers.

---

Generating PDFs is a common requirement - invoices, reports, certificates, receipts, you name it. Traditionally you'd need a server running a PDF library, maybe a headless browser for HTML-to-PDF conversion. With Lambda, you can generate PDFs on demand, pay only for the generation time, and scale automatically when a batch of 1,000 invoices needs to go out at month-end.

There are two main approaches: using a PDF library to build documents programmatically, or rendering HTML templates into PDFs with a headless browser. We'll cover both.

## Approach 1: Programmatic PDF Generation with PDFKit

PDFKit is a lightweight library that lets you build PDFs from code. It's great for structured documents like invoices and receipts where you have full control over the layout.

First, set up your project:

```bash
# Initialize project and install PDFKit
mkdir pdf-generator && cd pdf-generator
npm init -y
npm install @aws-sdk/client-s3 pdfkit
```

Here's a Lambda function that generates an invoice PDF:

```javascript
// Lambda function that generates invoice PDFs and stores them in S3
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: 'us-east-1' });

exports.handler = async (event) => {
  const invoice = event;  // Invoice data passed in the event

  // Create a new PDF document
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];

  // Collect the PDF output into a buffer
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfPromise = new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  // Header
  doc.fontSize(24).text('INVOICE', { align: 'right' });
  doc.moveDown();
  doc.fontSize(10).text(`Invoice #: ${invoice.number}`, { align: 'right' });
  doc.text(`Date: ${invoice.date}`, { align: 'right' });
  doc.text(`Due Date: ${invoice.dueDate}`, { align: 'right' });

  doc.moveDown(2);

  // Customer info
  doc.fontSize(12).text('Bill To:');
  doc.fontSize(10).text(invoice.customer.name);
  doc.text(invoice.customer.address);
  doc.text(invoice.customer.email);

  doc.moveDown(2);

  // Table header
  const tableTop = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Item', 50, tableTop);
  doc.text('Qty', 300, tableTop, { width: 50, align: 'right' });
  doc.text('Price', 370, tableTop, { width: 80, align: 'right' });
  doc.text('Total', 460, tableTop, { width: 80, align: 'right' });

  // Draw a line under the header
  doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

  // Table rows
  let y = tableTop + 25;
  doc.font('Helvetica');

  for (const item of invoice.items) {
    doc.text(item.description, 50, y);
    doc.text(item.quantity.toString(), 300, y, { width: 50, align: 'right' });
    doc.text(`$${item.price.toFixed(2)}`, 370, y, { width: 80, align: 'right' });
    doc.text(`$${(item.quantity * item.price).toFixed(2)}`, 460, y, { width: 80, align: 'right' });
    y += 20;
  }

  // Total
  doc.moveTo(370, y + 5).lineTo(540, y + 5).stroke();
  doc.font('Helvetica-Bold');
  doc.text(`Total: $${invoice.total.toFixed(2)}`, 370, y + 15, { width: 170, align: 'right' });

  doc.end();

  // Wait for the PDF to be fully generated
  const pdfBuffer = await pdfPromise;

  // Upload to S3
  const key = `invoices/${invoice.number}.pdf`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.OUTPUT_BUCKET,
    Key: key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Invoice generated',
      key: key,
      size: pdfBuffer.length,
    }),
  };
};
```

## Testing the Function

You can invoke it with sample invoice data:

```bash
# Test the PDF generation function
aws lambda invoke \
  --function-name pdf-generator \
  --payload '{
    "number": "INV-2026-001",
    "date": "2026-02-12",
    "dueDate": "2026-03-12",
    "customer": {
      "name": "Acme Corp",
      "address": "123 Main St, Springfield",
      "email": "billing@acme.com"
    },
    "items": [
      {"description": "Web Development", "quantity": 40, "price": 150},
      {"description": "Design Services", "quantity": 10, "price": 120}
    ],
    "total": 7200
  }' \
  response.json
```

## Approach 2: HTML-to-PDF with Puppeteer

For complex layouts, using HTML and CSS is much easier than positioning elements programmatically. Puppeteer runs a headless Chromium browser that can render HTML and export it as a PDF.

The challenge is that Chromium is large - too large for a regular Lambda deployment package. You need to use a Lambda Layer with a pre-built Chromium binary.

Install the dependencies:

```bash
# Use chromium that's pre-compiled for Lambda
npm install @sparticuz/chromium puppeteer-core
```

Here's the Lambda function:

```javascript
// Lambda function that renders HTML templates to PDF using Puppeteer
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: 'us-east-1' });

exports.handler = async (event) => {
  // Launch headless Chromium
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();

    // Build the HTML content from the event data
    const html = generateInvoiceHTML(event);

    // Set the page content and wait for any CSS/fonts to load
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate the PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });

    // Upload to S3
    const key = `reports/${event.reportId}.pdf`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.OUTPUT_BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    }));

    return { statusCode: 200, body: JSON.stringify({ key, size: pdfBuffer.length }) };
  } finally {
    // Always close the browser to free resources
    await browser.close();
  }
};

function generateInvoiceHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .company-name { font-size: 24px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
        td { padding: 10px; border-bottom: 1px solid #eee; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${data.companyName}</div>
        <div>
          <strong>Invoice #${data.invoiceNumber}</strong><br/>
          Date: ${data.date}
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>$${item.rate.toFixed(2)}</td>
              <td>$${(item.quantity * item.rate).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="total">Total: $${data.total.toFixed(2)}</div>
    </body>
    </html>
  `;
}
```

## Lambda Configuration for Puppeteer

Chromium needs more resources than a typical Lambda function:

```yaml
# CloudFormation config for the Puppeteer-based PDF generator
PdfGeneratorFunction:
  Type: AWS::Lambda::Function
  Properties:
    FunctionName: html-to-pdf
    Runtime: nodejs20.x
    Handler: index.handler
    MemorySize: 2048    # Chromium needs at least 1.5GB
    Timeout: 60         # HTML rendering can take time
    EphemeralStorage:
      Size: 1024        # Extra disk space for Chromium
    Role: !GetAtt LambdaRole.Arn
    Environment:
      Variables:
        OUTPUT_BUCKET: !Ref PdfBucket
```

## Serving PDFs via API Gateway

You can return the PDF directly through API Gateway with the right binary media type configuration:

```javascript
// Return PDF directly in API Gateway response
exports.handler = async (event) => {
  const pdfBuffer = await generatePdf(event);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report.pdf"`,
    },
    // API Gateway expects base64-encoded binary responses
    body: pdfBuffer.toString('base64'),
    isBase64Encoded: true,
  };
};
```

Make sure to configure the binary media types in API Gateway:

```bash
# Add PDF as a binary media type in API Gateway
aws apigateway update-rest-api \
  --rest-api-id abc123 \
  --patch-operations op=add,path=/binaryMediaTypes/application~1pdf
```

## Batch PDF Generation

For generating many PDFs at once (like monthly invoices for all customers), use Step Functions to orchestrate the process:

```javascript
// Generate PDFs in parallel batches using a Map state
// This would be the Step Functions definition
const definition = {
  StartAt: "GeneratePDFs",
  States: {
    GeneratePDFs: {
      Type: "Map",
      MaxConcurrency: 10,  // Process 10 invoices at a time
      Iterator: {
        StartAt: "GenerateOne",
        States: {
          GenerateOne: {
            Type: "Task",
            Resource: "arn:aws:lambda:us-east-1:123456789012:function:pdf-generator",
            End: true,
          }
        }
      },
      End: true,
    }
  }
};
```

For more on Step Functions orchestration, see our guide on [chaining Lambda functions with Step Functions](https://oneuptime.com/blog/post/2026-02-12-chain-lambda-functions-with-step-functions/view).

## Python Alternative

If you're a Python shop, here's a quick example using ReportLab:

```python
# Python PDF generation with ReportLab
import json
import boto3
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

s3 = boto3.client('s3')

def handler(event, context):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Draw the invoice
    c.setFont("Helvetica-Bold", 24)
    c.drawRightString(width - 50, height - 50, "INVOICE")

    c.setFont("Helvetica", 12)
    c.drawString(50, height - 100, f"Invoice #: {event['number']}")
    c.drawString(50, height - 120, f"Date: {event['date']}")
    c.drawString(50, height - 140, f"Customer: {event['customer']['name']}")

    # Add line items
    y = height - 200
    for item in event['items']:
        c.drawString(50, y, item['description'])
        c.drawRightString(width - 50, y, f"${item['quantity'] * item['price']:.2f}")
        y -= 20

    c.save()
    buffer.seek(0)

    # Upload to S3
    key = f"invoices/{event['number']}.pdf"
    s3.put_object(Bucket='my-pdf-bucket', Key=key, Body=buffer, ContentType='application/pdf')

    return {'statusCode': 200, 'body': json.dumps({'key': key})}
```

## Performance Tips

- PDFKit is much faster than Puppeteer. If your layout doesn't need HTML/CSS, go with PDFKit.
- For Puppeteer, reuse the browser instance across warm invocations by storing it outside the handler.
- Set Lambda memory to at least 2048 MB for Puppeteer, 512 MB for PDFKit.
- Use `/tmp` for any temporary files - Lambda gives you up to 10 GB of ephemeral storage.
- If generating many PDFs, use S3 multipart upload for files larger than 100 MB.

## Wrapping Up

Lambda-based PDF generation removes the need to maintain PDF rendering infrastructure. For simple, structured documents like invoices and receipts, PDFKit gives you fast, lightweight generation. For complex layouts with rich styling, Puppeteer with headless Chromium lets you use HTML and CSS to design your documents. Either way, you get a serverless, scalable, pay-per-use PDF pipeline.
