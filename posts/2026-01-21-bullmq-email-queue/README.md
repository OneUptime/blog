# How to Build an Email Queue with BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Email Queue, Nodemailer, SendGrid, Rate Limiting, Transactional Email

Description: A comprehensive guide to building a production-ready email queue with BullMQ, including template rendering, rate limiting, retry strategies, provider failover, and email tracking.

---

Email sending is one of the most common use cases for job queues. By queuing emails, you can handle spikes in traffic, implement retry logic, rate limit to avoid provider limits, and track delivery status. This guide covers building a robust email queue with BullMQ.

## Basic Email Queue Setup

Create a simple email queue:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import nodemailer from 'nodemailer';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Email job data interface
interface EmailJobData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
  metadata?: Record<string, any>;
}

// Create email queue
const emailQueue = new Queue<EmailJobData>('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // Start with 1 minute
    },
    removeOnComplete: {
      age: 86400, // Keep for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed for 7 days
    },
  },
});

// Create email transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email worker
const emailWorker = new Worker<EmailJobData>(
  'emails',
  async (job) => {
    const { to, subject, html, text, from, replyTo, attachments } = job.data;

    const result = await transporter.sendMail({
      from: from || process.env.DEFAULT_FROM_EMAIL,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text,
      replyTo,
      attachments,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  },
  {
    connection,
    concurrency: 5,
  }
);

// Error handling
emailWorker.on('failed', (job, error) => {
  console.error(`Email job ${job?.id} failed:`, error.message);
});

emailWorker.on('completed', (job, result) => {
  console.log(`Email sent: ${result.messageId}`);
});
```

## Email Service with Templates

Create a service with template support:

```typescript
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailOptions {
  to: string | string[];
  template: string;
  data: Record<string, any>;
  attachments?: EmailJobData['attachments'];
  priority?: 'high' | 'normal' | 'low';
  delay?: number;
  scheduledFor?: Date;
}

class EmailService {
  private queue: Queue<EmailJobData>;
  private templates: Map<string, EmailTemplate> = new Map();
  private compiledTemplates: Map<string, {
    subject: Handlebars.TemplateDelegate;
    html: Handlebars.TemplateDelegate;
    text?: Handlebars.TemplateDelegate;
  }> = new Map();

  constructor(queue: Queue<EmailJobData>) {
    this.queue = queue;
  }

  async loadTemplates(templatesDir: string): Promise<void> {
    const files = await fs.readdir(templatesDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const templateName = file.replace('.json', '');
        const content = await fs.readFile(
          path.join(templatesDir, file),
          'utf-8'
        );
        const template = JSON.parse(content) as EmailTemplate;

        this.templates.set(templateName, template);
        this.compiledTemplates.set(templateName, {
          subject: Handlebars.compile(template.subject),
          html: Handlebars.compile(template.html),
          text: template.text ? Handlebars.compile(template.text) : undefined,
        });
      }
    }

    console.log(`Loaded ${this.templates.size} email templates`);
  }

  async send(options: SendEmailOptions): Promise<Job<EmailJobData>> {
    const compiled = this.compiledTemplates.get(options.template);
    if (!compiled) {
      throw new Error(`Template ${options.template} not found`);
    }

    const emailData: EmailJobData = {
      to: options.to,
      subject: compiled.subject(options.data),
      html: compiled.html(options.data),
      text: compiled.text?.(options.data),
      attachments: options.attachments,
      metadata: {
        template: options.template,
        templateData: options.data,
      },
    };

    const jobOptions: any = {};

    if (options.priority === 'high') {
      jobOptions.priority = 1;
    } else if (options.priority === 'low') {
      jobOptions.priority = 10;
    }

    if (options.delay) {
      jobOptions.delay = options.delay;
    } else if (options.scheduledFor) {
      jobOptions.delay = options.scheduledFor.getTime() - Date.now();
    }

    return this.queue.add('send-email', emailData, jobOptions);
  }

  async sendBulk(
    recipients: Array<{ to: string; data: Record<string, any> }>,
    template: string,
    commonData?: Record<string, any>
  ): Promise<Job<EmailJobData>[]> {
    const jobs = recipients.map((recipient) => ({
      name: 'send-email',
      data: {
        to: recipient.to,
        ...this.renderTemplate(template, { ...commonData, ...recipient.data }),
        metadata: {
          template,
          bulk: true,
        },
      } as EmailJobData,
    }));

    return this.queue.addBulk(jobs);
  }

  private renderTemplate(
    templateName: string,
    data: Record<string, any>
  ): { subject: string; html: string; text?: string } {
    const compiled = this.compiledTemplates.get(templateName);
    if (!compiled) {
      throw new Error(`Template ${templateName} not found`);
    }

    return {
      subject: compiled.subject(data),
      html: compiled.html(data),
      text: compiled.text?.(data),
    };
  }
}
```

## Rate-Limited Email Sending

Implement rate limiting for email providers:

```typescript
// Rate-limited email worker
const rateLimitedWorker = new Worker<EmailJobData>(
  'emails',
  async (job) => {
    const result = await transporter.sendMail({
      from: process.env.DEFAULT_FROM_EMAIL,
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
      text: job.data.text,
    });

    return { messageId: result.messageId };
  },
  {
    connection,
    concurrency: 10,
    limiter: {
      max: 100, // Max 100 emails
      duration: 60000, // Per minute
    },
  }
);

// Per-domain rate limiting
class DomainRateLimiter {
  private domainLimits: Map<string, { max: number; duration: number }> = new Map([
    ['gmail.com', { max: 50, duration: 60000 }],
    ['outlook.com', { max: 50, duration: 60000 }],
    ['yahoo.com', { max: 30, duration: 60000 }],
  ]);

  private domainQueues: Map<string, Queue<EmailJobData>> = new Map();

  constructor(private connection: Redis) {}

  getQueueForEmail(email: string): Queue<EmailJobData> {
    const domain = email.split('@')[1].toLowerCase();
    const limits = this.domainLimits.get(domain) || { max: 100, duration: 60000 };

    if (!this.domainQueues.has(domain)) {
      const queue = new Queue<EmailJobData>(`emails-${domain}`, {
        connection: this.connection,
      });

      // Create worker with domain-specific rate limit
      new Worker<EmailJobData>(
        `emails-${domain}`,
        async (job) => sendEmail(job.data),
        {
          connection: this.connection,
          limiter: limits,
        }
      );

      this.domainQueues.set(domain, queue);
    }

    return this.domainQueues.get(domain)!;
  }
}
```

## Provider Failover

Implement failover between email providers:

```typescript
interface EmailProvider {
  name: string;
  send: (email: EmailJobData) => Promise<{ messageId: string }>;
  isAvailable: () => Promise<boolean>;
}

class SmtpProvider implements EmailProvider {
  name = 'smtp';
  private transporter: nodemailer.Transporter;

  constructor(config: nodemailer.TransportOptions) {
    this.transporter = nodemailer.createTransport(config);
  }

  async send(email: EmailJobData): Promise<{ messageId: string }> {
    const result = await this.transporter.sendMail({
      from: process.env.DEFAULT_FROM_EMAIL,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return { messageId: result.messageId };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

class SendGridProvider implements EmailProvider {
  name = 'sendgrid';

  async send(email: EmailJobData): Promise<{ messageId: string }> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.to }] }],
        from: { email: process.env.DEFAULT_FROM_EMAIL },
        subject: email.subject,
        content: [
          { type: 'text/plain', value: email.text || '' },
          { type: 'text/html', value: email.html || '' },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid error: ${response.statusText}`);
    }

    const messageId = response.headers.get('X-Message-Id') || Date.now().toString();
    return { messageId };
  }

  async isAvailable(): Promise<boolean> {
    // Check SendGrid status
    return true;
  }
}

class FailoverEmailService {
  private providers: EmailProvider[];
  private currentProviderIndex = 0;

  constructor(providers: EmailProvider[]) {
    this.providers = providers;
  }

  async send(email: EmailJobData): Promise<{ messageId: string; provider: string }> {
    const errors: Error[] = [];

    for (let i = 0; i < this.providers.length; i++) {
      const providerIndex = (this.currentProviderIndex + i) % this.providers.length;
      const provider = this.providers[providerIndex];

      try {
        if (await provider.isAvailable()) {
          const result = await provider.send(email);
          this.currentProviderIndex = providerIndex;
          return { ...result, provider: provider.name };
        }
      } catch (error) {
        errors.push(error as Error);
        console.error(`Provider ${provider.name} failed:`, (error as Error).message);
      }
    }

    throw new Error(`All providers failed: ${errors.map((e) => e.message).join(', ')}`);
  }
}

// Worker with failover
const failoverService = new FailoverEmailService([
  new SmtpProvider({ /* config */ }),
  new SendGridProvider(),
]);

const failoverWorker = new Worker<EmailJobData>(
  'emails',
  async (job) => {
    return failoverService.send(job.data);
  },
  { connection }
);
```

## Email Tracking

Track email delivery and opens:

```typescript
import { v4 as uuidv4 } from 'uuid';

interface TrackedEmailJobData extends EmailJobData {
  trackingId: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

class EmailTracker {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async prepareTrackedEmail(
    email: EmailJobData,
    options: { trackOpens?: boolean; trackClicks?: boolean } = {}
  ): Promise<TrackedEmailJobData> {
    const trackingId = uuidv4();

    let html = email.html || '';

    // Add open tracking pixel
    if (options.trackOpens && html) {
      const trackingPixel = `<img src="${process.env.APP_URL}/track/open/${trackingId}" width="1" height="1" />`;
      html = html.replace('</body>', `${trackingPixel}</body>`);
    }

    // Replace links with tracked links
    if (options.trackClicks && html) {
      html = html.replace(
        /href="(https?:\/\/[^"]+)"/g,
        (match, url) => {
          const encodedUrl = encodeURIComponent(url);
          return `href="${process.env.APP_URL}/track/click/${trackingId}?url=${encodedUrl}"`;
        }
      );
    }

    // Store tracking data
    await this.redis.hset(`email:tracking:${trackingId}`, {
      to: Array.isArray(email.to) ? email.to.join(',') : email.to,
      subject: email.subject,
      createdAt: Date.now().toString(),
      status: 'queued',
    });

    return {
      ...email,
      html,
      trackingId,
      trackOpens: options.trackOpens,
      trackClicks: options.trackClicks,
    };
  }

  async recordSent(trackingId: string, messageId: string): Promise<void> {
    await this.redis.hset(`email:tracking:${trackingId}`, {
      status: 'sent',
      messageId,
      sentAt: Date.now().toString(),
    });
  }

  async recordOpen(trackingId: string): Promise<void> {
    const key = `email:tracking:${trackingId}`;
    const opens = await this.redis.hincrby(key, 'opens', 1);

    if (opens === 1) {
      await this.redis.hset(key, 'firstOpenAt', Date.now().toString());
    }
    await this.redis.hset(key, 'lastOpenAt', Date.now().toString());
  }

  async recordClick(trackingId: string, url: string): Promise<void> {
    const key = `email:tracking:${trackingId}`;
    await this.redis.hincrby(key, 'clicks', 1);
    await this.redis.rpush(`email:tracking:${trackingId}:clicks`, JSON.stringify({
      url,
      timestamp: Date.now(),
    }));
  }

  async getTrackingData(trackingId: string): Promise<Record<string, string> | null> {
    const data = await this.redis.hgetall(`email:tracking:${trackingId}`);
    return Object.keys(data).length > 0 ? data : null;
  }
}

// Express routes for tracking
import express from 'express';

const app = express();
const tracker = new EmailTracker(connection);

app.get('/track/open/:trackingId', async (req, res) => {
  await tracker.recordOpen(req.params.trackingId);

  // Return 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  res.set('Content-Type', 'image/gif');
  res.send(pixel);
});

app.get('/track/click/:trackingId', async (req, res) => {
  const { url } = req.query;
  if (url) {
    await tracker.recordClick(req.params.trackingId, url as string);
    res.redirect(url as string);
  } else {
    res.status(400).send('Missing URL');
  }
});
```

## Scheduled and Recurring Emails

Send scheduled and recurring emails:

```typescript
// Scheduled email
await emailService.send({
  to: 'user@example.com',
  template: 'reminder',
  data: { userName: 'John' },
  scheduledFor: new Date('2024-12-25T09:00:00Z'),
});

// Recurring emails with repeatable jobs
async function setupRecurringEmails(queue: Queue<EmailJobData>): Promise<void> {
  // Daily digest
  await queue.add(
    'daily-digest',
    {
      to: 'subscribers',
      subject: 'Daily Digest',
      html: '<p>Template will be rendered at processing time</p>',
      metadata: { type: 'digest', frequency: 'daily' },
    },
    {
      repeat: {
        pattern: '0 9 * * *', // 9 AM daily
        tz: 'America/New_York',
      },
      jobId: 'daily-digest',
    }
  );

  // Weekly newsletter
  await queue.add(
    'weekly-newsletter',
    {
      to: 'subscribers',
      subject: 'Weekly Newsletter',
      html: '<p>Template will be rendered at processing time</p>',
      metadata: { type: 'newsletter', frequency: 'weekly' },
    },
    {
      repeat: {
        pattern: '0 10 * * 1', // Monday 10 AM
        tz: 'America/New_York',
      },
      jobId: 'weekly-newsletter',
    }
  );
}

// Worker that handles recurring emails
const recurringWorker = new Worker<EmailJobData>(
  'emails',
  async (job) => {
    if (job.data.metadata?.type === 'digest') {
      // Fetch subscribers and send individual emails
      const subscribers = await getSubscribers();
      const emailService = new EmailService(emailQueue);

      await emailService.sendBulk(
        subscribers.map((s) => ({ to: s.email, data: { name: s.name } })),
        'daily-digest'
      );

      return { sent: subscribers.length };
    }

    // Regular email
    return sendEmail(job.data);
  },
  { connection }
);
```

## Complete Email Service

Putting it all together:

```typescript
class ProductionEmailService {
  private queue: Queue<EmailJobData>;
  private tracker: EmailTracker;
  private templates: Map<string, any> = new Map();

  constructor(connection: Redis) {
    this.queue = new Queue('emails', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      },
    });
    this.tracker = new EmailTracker(connection);
  }

  async send(options: {
    to: string | string[];
    template: string;
    data: Record<string, any>;
    priority?: 'high' | 'normal' | 'low';
    trackOpens?: boolean;
    trackClicks?: boolean;
  }): Promise<{ jobId: string; trackingId: string }> {
    const emailData = this.renderTemplate(options.template, options.data);

    const trackedEmail = await this.tracker.prepareTrackedEmail(
      { ...emailData, to: options.to },
      { trackOpens: options.trackOpens, trackClicks: options.trackClicks }
    );

    const job = await this.queue.add('send-email', trackedEmail, {
      priority: options.priority === 'high' ? 1 : options.priority === 'low' ? 10 : 5,
    });

    return {
      jobId: job.id!,
      trackingId: trackedEmail.trackingId,
    };
  }

  private renderTemplate(name: string, data: Record<string, any>): Partial<EmailJobData> {
    const template = this.templates.get(name);
    if (!template) throw new Error(`Template ${name} not found`);
    return template.render(data);
  }
}
```

## Best Practices

1. **Use templates** - Separate content from sending logic.

2. **Implement rate limiting** - Respect provider limits.

3. **Add retry with backoff** - Handle temporary failures.

4. **Track delivery status** - Monitor open and click rates.

5. **Use provider failover** - Don't depend on single provider.

6. **Validate email addresses** - Reject invalid emails early.

7. **Handle bounces** - Process bounce notifications.

8. **Segment by priority** - Send transactional emails first.

9. **Monitor queue health** - Alert on growing backlogs.

10. **Comply with regulations** - Handle unsubscribes properly.

## Conclusion

Building an email queue with BullMQ provides reliability, scalability, and flexibility for email sending. By implementing templates, rate limiting, provider failover, and tracking, you can create a production-ready email system that handles high volumes while maintaining deliverability and providing insights into email performance.
