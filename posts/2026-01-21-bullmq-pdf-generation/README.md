# How to Build a PDF Generation Queue with BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, PDF Generation, Puppeteer, PDFKit, Reports, Document Processing

Description: A comprehensive guide to building a PDF generation queue with BullMQ, including report generation, invoice creation, HTML to PDF conversion, and handling high-volume document processing.

---

PDF generation can be resource-intensive and time-consuming. By offloading PDF creation to BullMQ workers, you can handle document generation asynchronously while maintaining application responsiveness. This guide covers building a robust PDF generation system.

## Basic PDF Generation Setup

Set up a simple PDF queue:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

interface PDFJobData {
  type: 'report' | 'invoice' | 'certificate' | 'custom';
  data: Record<string, any>;
  outputPath: string;
  template?: string;
  options?: {
    pageSize?: 'A4' | 'Letter' | 'Legal';
    orientation?: 'portrait' | 'landscape';
    margins?: { top: number; bottom: number; left: number; right: number };
  };
}

interface PDFResult {
  path: string;
  size: number;
  pages: number;
  generatedAt: Date;
}

const pdfQueue = new Queue<PDFJobData>('pdf-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

const pdfWorker = new Worker<PDFJobData, PDFResult>(
  'pdf-generation',
  async (job) => {
    const { type, data, outputPath, options } = job.data;

    await job.log(`Generating ${type} PDF`);

    const doc = new PDFDocument({
      size: options?.pageSize || 'A4',
      layout: options?.orientation || 'portrait',
      margins: options?.margins || { top: 50, bottom: 50, left: 50, right: 50 },
      autoFirstPage: true,
      bufferPages: true,
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Generate content based on type
    switch (type) {
      case 'report':
        await generateReport(doc, data, job);
        break;
      case 'invoice':
        await generateInvoice(doc, data, job);
        break;
      case 'certificate':
        await generateCertificate(doc, data, job);
        break;
      default:
        throw new Error(`Unknown PDF type: ${type}`);
    }

    doc.end();

    // Wait for file to be written
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const stats = fs.statSync(outputPath);
    const pageCount = doc.bufferedPageRange().count;

    return {
      path: outputPath,
      size: stats.size,
      pages: pageCount,
      generatedAt: new Date(),
    };
  },
  {
    connection,
    concurrency: 2, // PDF generation is memory-intensive
  }
);

async function generateReport(
  doc: PDFKit.PDFDocument,
  data: any,
  job: Job
): Promise<void> {
  // Title
  doc.fontSize(24).text(data.title, { align: 'center' });
  doc.moveDown();

  await job.updateProgress(10);

  // Summary
  doc.fontSize(12).text(data.summary);
  doc.moveDown();

  await job.updateProgress(30);

  // Sections
  for (let i = 0; i < data.sections?.length || 0; i++) {
    const section = data.sections[i];
    doc.fontSize(16).text(section.title);
    doc.fontSize(12).text(section.content);
    doc.moveDown();

    await job.updateProgress(30 + ((i + 1) / data.sections.length) * 60);
  }

  // Footer
  doc.fontSize(10).text(`Generated on ${new Date().toLocaleDateString()}`, {
    align: 'right',
  });
}

async function generateInvoice(
  doc: PDFKit.PDFDocument,
  data: any,
  job: Job
): Promise<void> {
  // Implementation for invoice generation
}

async function generateCertificate(
  doc: PDFKit.PDFDocument,
  data: any,
  job: Job
): Promise<void> {
  // Implementation for certificate generation
}
```

## HTML to PDF with Puppeteer

Convert HTML templates to PDF:

```typescript
import puppeteer, { Browser, PDFOptions } from 'puppeteer';

interface HTMLToPDFJobData {
  html?: string;
  url?: string;
  templatePath?: string;
  templateData?: Record<string, any>;
  outputPath: string;
  pdfOptions?: PDFOptions;
  waitFor?: string | number;
}

class HTMLToPDFService {
  private queue: Queue<HTMLToPDFJobData>;
  private browser: Browser | null = null;

  constructor(connection: Redis) {
    this.queue = new Queue('html-to-pdf', { connection });

    new Worker<HTMLToPDFJobData>(
      'html-to-pdf',
      async (job) => this.processJob(job),
      {
        connection,
        concurrency: 2,
      }
    );
  }

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }

  async generatePDF(options: HTMLToPDFJobData): Promise<Job<HTMLToPDFJobData>> {
    return this.queue.add('generate', options);
  }

  private async processJob(job: Job<HTMLToPDFJobData>): Promise<PDFResult> {
    const { html, url, templatePath, templateData, outputPath, pdfOptions, waitFor } = job.data;

    if (!this.browser) {
      await this.init();
    }

    const page = await this.browser!.newPage();

    try {
      await job.log('Opening page');

      if (html) {
        await page.setContent(html, { waitUntil: 'networkidle0' });
      } else if (url) {
        await page.goto(url, { waitUntil: 'networkidle0' });
      } else if (templatePath) {
        const template = await this.loadTemplate(templatePath);
        const renderedHtml = this.renderTemplate(template, templateData || {});
        await page.setContent(renderedHtml, { waitUntil: 'networkidle0' });
      }

      await job.updateProgress(50);

      // Wait for specific element or timeout
      if (waitFor) {
        if (typeof waitFor === 'string') {
          await page.waitForSelector(waitFor);
        } else {
          await new Promise((r) => setTimeout(r, waitFor));
        }
      }

      await job.log('Generating PDF');

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        ...pdfOptions,
      });

      await job.updateProgress(100);

      const stats = fs.statSync(outputPath);

      return {
        path: outputPath,
        size: stats.size,
        pages: 1, // Would need to parse PDF for actual count
        generatedAt: new Date(),
      };
    } finally {
      await page.close();
    }
  }

  private async loadTemplate(templatePath: string): Promise<string> {
    return fs.promises.readFile(templatePath, 'utf-8');
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template rendering (use Handlebars or similar in production)
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
```

## Invoice Generation Service

Create a dedicated invoice service:

```typescript
interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
  customer: {
    name: string;
    address: string;
    email: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    tax?: number;
  }>;
  notes?: string;
  currency?: string;
}

class InvoiceService {
  private queue: Queue<{ invoice: InvoiceData; outputPath: string }>;

  constructor(connection: Redis) {
    this.queue = new Queue('invoices', { connection });

    new Worker(
      'invoices',
      async (job) => this.generateInvoice(job),
      {
        connection,
        concurrency: 3,
      }
    );
  }

  async createInvoice(
    invoice: InvoiceData,
    outputPath?: string
  ): Promise<Job> {
    const path = outputPath || `/tmp/invoices/invoice_${invoice.invoiceNumber}.pdf`;

    return this.queue.add('generate', { invoice, outputPath: path });
  }

  private async generateInvoice(job: Job): Promise<PDFResult> {
    const { invoice, outputPath } = job.data;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Header with logo
    if (invoice.company.logo) {
      doc.image(invoice.company.logo, 50, 45, { width: 100 });
    }

    doc
      .fontSize(20)
      .text('INVOICE', 400, 50, { align: 'right' })
      .fontSize(10)
      .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 80, { align: 'right' })
      .text(`Date: ${invoice.date.toLocaleDateString()}`, { align: 'right' })
      .text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, { align: 'right' });

    await job.updateProgress(20);

    // Company info
    doc
      .fontSize(12)
      .text(invoice.company.name, 50, 130)
      .fontSize(10)
      .text(invoice.company.address)
      .text(invoice.company.phone)
      .text(invoice.company.email);

    // Bill To
    doc
      .fontSize(12)
      .text('Bill To:', 50, 220)
      .fontSize(10)
      .text(invoice.customer.name)
      .text(invoice.customer.address)
      .text(invoice.customer.email);

    await job.updateProgress(40);

    // Items table
    const tableTop = 320;
    const currency = invoice.currency || '$';

    // Table header
    doc
      .fontSize(10)
      .text('Description', 50, tableTop)
      .text('Qty', 300, tableTop, { width: 50, align: 'center' })
      .text('Unit Price', 350, tableTop, { width: 80, align: 'right' })
      .text('Amount', 430, tableTop, { width: 80, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(510, tableTop + 15).stroke();

    let y = tableTop + 25;
    let subtotal = 0;
    let totalTax = 0;

    for (const item of invoice.items) {
      const amount = item.quantity * item.unitPrice;
      const tax = item.tax ? amount * (item.tax / 100) : 0;
      subtotal += amount;
      totalTax += tax;

      doc
        .text(item.description, 50, y, { width: 240 })
        .text(item.quantity.toString(), 300, y, { width: 50, align: 'center' })
        .text(`${currency}${item.unitPrice.toFixed(2)}`, 350, y, { width: 80, align: 'right' })
        .text(`${currency}${amount.toFixed(2)}`, 430, y, { width: 80, align: 'right' });

      y += 20;
    }

    await job.updateProgress(70);

    // Totals
    y += 20;
    doc.moveTo(350, y).lineTo(510, y).stroke();
    y += 10;

    doc
      .text('Subtotal:', 350, y, { width: 80, align: 'right' })
      .text(`${currency}${subtotal.toFixed(2)}`, 430, y, { width: 80, align: 'right' });

    y += 20;
    doc
      .text('Tax:', 350, y, { width: 80, align: 'right' })
      .text(`${currency}${totalTax.toFixed(2)}`, 430, y, { width: 80, align: 'right' });

    y += 20;
    doc.fontSize(12);
    doc
      .text('Total:', 350, y, { width: 80, align: 'right' })
      .text(`${currency}${(subtotal + totalTax).toFixed(2)}`, 430, y, { width: 80, align: 'right' });

    await job.updateProgress(90);

    // Notes
    if (invoice.notes) {
      doc
        .fontSize(10)
        .text('Notes:', 50, y + 50)
        .text(invoice.notes, 50, y + 65, { width: 400 });
    }

    // Footer
    doc
      .fontSize(8)
      .text('Thank you for your business!', 50, 750, { align: 'center', width: 500 });

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    await job.updateProgress(100);

    const stats = await fs.promises.stat(outputPath);

    return {
      path: outputPath,
      size: stats.size,
      pages: 1,
      generatedAt: new Date(),
    };
  }
}
```

## Report Builder with Multiple Formats

Support multiple output formats:

```typescript
interface ReportJobData {
  reportType: string;
  format: 'pdf' | 'html' | 'csv' | 'xlsx';
  data: any;
  outputPath: string;
  options?: Record<string, any>;
}

class ReportBuilderService {
  private queue: Queue<ReportJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('reports', { connection });

    new Worker<ReportJobData>(
      'reports',
      async (job) => this.generateReport(job),
      {
        connection,
        concurrency: 2,
      }
    );
  }

  async createReport(options: ReportJobData): Promise<Job<ReportJobData>> {
    return this.queue.add('generate', options);
  }

  private async generateReport(job: Job<ReportJobData>): Promise<any> {
    const { reportType, format, data, outputPath, options } = job.data;

    await job.log(`Generating ${reportType} report in ${format} format`);

    switch (format) {
      case 'pdf':
        return this.generatePDF(reportType, data, outputPath, options, job);
      case 'html':
        return this.generateHTML(reportType, data, outputPath, options);
      case 'csv':
        return this.generateCSV(data, outputPath);
      case 'xlsx':
        return this.generateXLSX(data, outputPath);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async generatePDF(
    reportType: string,
    data: any,
    outputPath: string,
    options: any,
    job: Job
  ): Promise<PDFResult> {
    // PDF generation logic
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Generate content based on report type
    doc.fontSize(24).text(`${reportType} Report`, { align: 'center' });
    doc.moveDown();

    // Add data tables, charts, etc.
    if (data.tables) {
      for (const table of data.tables) {
        await this.addTable(doc, table);
      }
    }

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const stats = await fs.promises.stat(outputPath);

    return {
      path: outputPath,
      size: stats.size,
      pages: 1,
      generatedAt: new Date(),
    };
  }

  private async generateHTML(
    reportType: string,
    data: any,
    outputPath: string,
    options: any
  ): Promise<any> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportType} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
          </style>
        </head>
        <body>
          <h1>${reportType} Report</h1>
          ${this.renderDataAsHTML(data)}
        </body>
      </html>
    `;

    await fs.promises.writeFile(outputPath, html, 'utf-8');

    return { path: outputPath, format: 'html' };
  }

  private async generateCSV(data: any, outputPath: string): Promise<any> {
    if (!data.rows || !data.headers) {
      throw new Error('CSV requires rows and headers');
    }

    const lines = [
      data.headers.join(','),
      ...data.rows.map((row: any[]) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ];

    await fs.promises.writeFile(outputPath, lines.join('\n'), 'utf-8');

    return { path: outputPath, format: 'csv', rows: data.rows.length };
  }

  private async generateXLSX(data: any, outputPath: string): Promise<any> {
    // Would use a library like exceljs
    throw new Error('XLSX generation not implemented');
  }

  private async addTable(doc: PDFKit.PDFDocument, table: any): Promise<void> {
    // Table rendering logic
  }

  private renderDataAsHTML(data: any): string {
    if (data.tables) {
      return data.tables
        .map(
          (table: any) => `
          <h2>${table.title}</h2>
          <table>
            <thead>
              <tr>${table.headers.map((h: string) => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${table.rows
                .map(
                  (row: any[]) =>
                    `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
                )
                .join('')}
            </tbody>
          </table>
        `
        )
        .join('');
    }
    return JSON.stringify(data, null, 2);
  }
}
```

## Batch PDF Generation

Generate multiple PDFs efficiently:

```typescript
interface BatchPDFJobData {
  documents: Array<{
    id: string;
    type: string;
    data: any;
  }>;
  outputDir: string;
  template: string;
}

class BatchPDFService {
  private queue: Queue<BatchPDFJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('batch-pdf', { connection });

    new Worker<BatchPDFJobData>(
      'batch-pdf',
      async (job) => this.processBatch(job),
      {
        connection,
        concurrency: 1,
      }
    );
  }

  async generateBatch(options: BatchPDFJobData): Promise<Job<BatchPDFJobData>> {
    return this.queue.add('batch', options);
  }

  private async processBatch(job: Job<BatchPDFJobData>): Promise<any> {
    const { documents, outputDir, template } = job.data;
    const results = [];
    const errors = [];

    await fs.promises.mkdir(outputDir, { recursive: true });

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      try {
        const outputPath = path.join(outputDir, `${doc.id}.pdf`);
        await this.generateSinglePDF(doc, outputPath, template);

        results.push({
          id: doc.id,
          success: true,
          path: outputPath,
        });
      } catch (error) {
        errors.push({
          id: doc.id,
          success: false,
          error: (error as Error).message,
        });
      }

      await job.updateProgress(((i + 1) / documents.length) * 100);
    }

    return {
      total: documents.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  private async generateSinglePDF(
    document: any,
    outputPath: string,
    template: string
  ): Promise<void> {
    // Generate individual PDF
  }
}
```

## Best Practices

1. **Limit concurrency** - PDF generation is memory-intensive.

2. **Use streams** - Stream PDFs to files instead of buffering.

3. **Clean up temporary files** - Remove intermediate files.

4. **Cache templates** - Compile templates once.

5. **Monitor memory** - Watch for memory leaks with Puppeteer.

6. **Use progress updates** - Track long-running generations.

7. **Implement timeouts** - Prevent stuck generations.

8. **Validate data** - Check data before generation.

9. **Store generated PDFs** - Upload to S3 or similar storage.

10. **Support webhooks** - Notify when generation completes.

## Conclusion

Building a PDF generation queue with BullMQ enables scalable document processing. Whether generating invoices, reports, or certificates, offloading to workers keeps your application responsive while handling complex document creation. Use appropriate concurrency limits and memory management to ensure reliable operation under load.
