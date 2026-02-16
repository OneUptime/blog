# How to Implement Azure Queue Storage Message Processing with Azure Functions in TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Queue Storage, Azure Functions, TypeScript, Serverless, Message Processing, Node.js, Cloud

Description: Process Azure Queue Storage messages with Azure Functions in TypeScript for reliable background job processing and task queuing.

---

Azure Queue Storage is the simplest queuing service in Azure. It does not have the advanced features of Service Bus - no topics, no sessions, no dead letter queues out of the box - but it is cheap, reliable, and pairs perfectly with Azure Functions for background processing. If you need a straightforward way to decouple work from your API and process it asynchronously, Queue Storage with Functions is hard to beat.

In this post, we will build a TypeScript Azure Functions project that processes Queue Storage messages for common scenarios: image processing, email sending, and data export.

## When to Use Queue Storage vs. Service Bus

Queue Storage is a good fit when you need:
- Simple FIFO-ish queuing (not guaranteed strict FIFO)
- Low cost (pennies per million messages)
- Messages up to 64KB
- Up to 500 messages dequeued per batch

Service Bus is better when you need:
- Topics and subscriptions (publish-subscribe)
- Sessions (ordered message processing per entity)
- Dead letter queues
- Messages up to 256KB (or 100MB with Premium)
- Guaranteed FIFO within a session

## Project Setup

```bash
# Create a new Azure Functions project with TypeScript
func init queue-processor --typescript
cd queue-processor

# Install dependencies
npm install @azure/storage-queue uuid
```

## Function 1: Queue-Triggered Image Processor

When an image is uploaded to your API, enqueue a processing job instead of processing it synchronously. The queue-triggered function picks it up and does the heavy work.

```typescript
// src/functions/processImage.ts
// Queue-triggered function that processes uploaded images
import { app, InvocationContext } from '@azure/functions';

// Define the shape of our queue message
interface ImageProcessingJob {
  imageId: string;
  blobUrl: string;
  operations: string[];  // e.g., ['resize', 'thumbnail', 'watermark']
  callbackUrl?: string;
  requestedAt: string;
}

async function processImage(
  message: ImageProcessingJob,
  context: InvocationContext
): Promise<void> {
  context.log(`Processing image ${message.imageId}`);
  context.log(`Operations: ${message.operations.join(', ')}`);

  const startTime = Date.now();

  try {
    for (const operation of message.operations) {
      switch (operation) {
        case 'resize':
          await resizeImage(message.blobUrl, context);
          break;
        case 'thumbnail':
          await generateThumbnail(message.blobUrl, context);
          break;
        case 'watermark':
          await addWatermark(message.blobUrl, context);
          break;
        default:
          context.warn(`Unknown operation: ${operation}`);
      }
    }

    const duration = Date.now() - startTime;
    context.log(`Image ${message.imageId} processed in ${duration}ms`);

    // Notify the callback URL if provided
    if (message.callbackUrl) {
      await notifyCallback(message.callbackUrl, {
        imageId: message.imageId,
        status: 'completed',
        duration,
      });
    }
  } catch (error) {
    context.error(`Failed to process image ${message.imageId}: ${error}`);
    // The function will throw, causing the message to be retried
    throw error;
  }
}

async function resizeImage(blobUrl: string, context: InvocationContext) {
  // Placeholder for actual image resizing logic
  context.log(`Resizing image at ${blobUrl}`);
  // In production: download blob, resize with sharp, upload result
}

async function generateThumbnail(blobUrl: string, context: InvocationContext) {
  context.log(`Generating thumbnail for ${blobUrl}`);
}

async function addWatermark(blobUrl: string, context: InvocationContext) {
  context.log(`Adding watermark to ${blobUrl}`);
}

async function notifyCallback(url: string, data: any) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Register the queue trigger
app.storageQueue('processImage', {
  queueName: 'image-processing',
  connection: 'AzureWebJobsStorage',
  handler: processImage,
});
```

## Function 2: Email Queue Processor

Process email sending requests from a queue with retry logic and rate limiting.

```typescript
// src/functions/sendEmail.ts
// Queue-triggered function for sending emails
import { app, InvocationContext } from '@azure/functions';

interface EmailJob {
  to: string;
  subject: string;
  templateId: string;
  templateData: Record<string, string>;
  priority: 'high' | 'normal' | 'low';
  retryCount?: number;
}

async function sendEmail(
  message: EmailJob,
  context: InvocationContext
): Promise<void> {
  const retryCount = message.retryCount || 0;
  context.log(`Sending email to ${message.to} (attempt ${retryCount + 1})`);

  try {
    // Build the email from the template
    const emailContent = buildEmailFromTemplate(
      message.templateId,
      message.templateData
    );

    // Send via your email provider (SendGrid, Mailgun, etc.)
    const result = await sendViaProvider({
      to: message.to,
      subject: message.subject,
      html: emailContent,
    });

    context.log(`Email sent to ${message.to}: ${result.messageId}`);
  } catch (error) {
    context.error(`Email send failed: ${error}`);

    // If we have not exceeded max retries, re-enqueue with a delay
    if (retryCount < 3) {
      context.log(`Re-queuing for retry (attempt ${retryCount + 1} of 3)`);
      // The message will be retried by the Azure Functions runtime
      // because we threw an error
    }

    throw error;
  }
}

function buildEmailFromTemplate(
  templateId: string,
  data: Record<string, string>
): string {
  // Placeholder - in production, load templates from storage or a template engine
  const templates: Record<string, string> = {
    'order-confirmation': `<h1>Order Confirmed</h1><p>Order ID: ${data.orderId}</p>`,
    'shipping-notification': `<h1>Order Shipped</h1><p>Tracking: ${data.trackingNumber}</p>`,
    'welcome': `<h1>Welcome, ${data.name}!</h1><p>Thanks for signing up.</p>`,
  };

  return templates[templateId] || `<p>Template ${templateId} not found</p>`;
}

async function sendViaProvider(email: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId: string }> {
  // Placeholder for actual email sending
  return { messageId: `msg-${Date.now()}` };
}

app.storageQueue('sendEmail', {
  queueName: 'email-queue',
  connection: 'AzureWebJobsStorage',
  handler: sendEmail,
});
```

## Function 3: Data Export Queue Processor

Handle long-running data export requests that would time out in a REST API.

```typescript
// src/functions/exportData.ts
// Queue-triggered function for processing data export requests
import { app, InvocationContext, output } from '@azure/functions';

interface ExportJob {
  exportId: string;
  userId: string;
  format: 'csv' | 'json' | 'xlsx';
  filters: {
    startDate: string;
    endDate: string;
    categories?: string[];
  };
}

// Define blob output binding for the exported file
const blobOutput = output.storageBlob({
  path: 'exports/{exportId}.{format}',
  connection: 'AzureWebJobsStorage',
});

async function exportData(
  message: ExportJob,
  context: InvocationContext
): Promise<void> {
  context.log(`Starting export ${message.exportId} for user ${message.userId}`);
  context.log(`Format: ${message.format}, Date range: ${message.filters.startDate} to ${message.filters.endDate}`);

  try {
    // Step 1: Query the data
    const data = await queryData(message.filters);
    context.log(`Retrieved ${data.length} records for export`);

    // Step 2: Format the data
    let formattedData: string;
    switch (message.format) {
      case 'csv':
        formattedData = convertToCsv(data);
        break;
      case 'json':
        formattedData = JSON.stringify(data, null, 2);
        break;
      default:
        formattedData = JSON.stringify(data);
    }

    // Step 3: Write to blob storage via the output binding
    context.extraOutputs.set(blobOutput, formattedData);

    context.log(`Export ${message.exportId} completed: ${data.length} records`);
  } catch (error) {
    context.error(`Export ${message.exportId} failed: ${error}`);
    throw error;
  }
}

async function queryData(filters: ExportJob['filters']): Promise<any[]> {
  // Placeholder - query your database here
  return [
    { id: 1, name: 'Product A', category: 'Electronics', price: 29.99 },
    { id: 2, name: 'Product B', category: 'Books', price: 14.99 },
  ];
}

function convertToCsv(data: any[]): string {
  if (data.length === 0) return '';

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

app.storageQueue('exportData', {
  queueName: 'export-requests',
  connection: 'AzureWebJobsStorage',
  extraOutputs: [blobOutput],
  handler: exportData,
});
```

## Enqueuing Messages from Your API

Here is how to add messages to the queue from an Express.js API.

```typescript
// api/src/queue-client.ts
// Helper to enqueue messages to Azure Queue Storage
import { QueueClient, QueueServiceClient } from '@azure/storage-queue';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const queueService = QueueServiceClient.fromConnectionString(connectionString);

// Cache queue clients to avoid recreating them
const queueClients: Map<string, QueueClient> = new Map();

async function getQueueClient(queueName: string): Promise<QueueClient> {
  if (!queueClients.has(queueName)) {
    const client = queueService.getQueueClient(queueName);
    await client.createIfNotExists(); // Ensure the queue exists
    queueClients.set(queueName, client);
  }
  return queueClients.get(queueName)!;
}

// Enqueue a message with optional visibility delay
export async function enqueue(
  queueName: string,
  message: any,
  visibilityTimeoutSeconds?: number
): Promise<string> {
  const client = await getQueueClient(queueName);

  // Queue Storage requires base64-encoded message content
  const encoded = Buffer.from(JSON.stringify(message)).toString('base64');

  const result = await client.sendMessage(encoded, {
    visibilityTimeout: visibilityTimeoutSeconds,
  });

  return result.messageId;
}

// Usage examples:
// await enqueue('image-processing', { imageId: '123', blobUrl: '...', operations: ['resize'] });
// await enqueue('email-queue', { to: 'user@example.com', subject: 'Welcome', templateId: 'welcome' });
// await enqueue('export-requests', { exportId: 'exp-1', userId: 'user-1', format: 'csv', filters: {...} });
```

## Configuration

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=...;EndpointSuffix=core.windows.net",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}
```

## Monitoring and Observability

Monitor queue depth to detect processing bottlenecks.

```typescript
// monitor/queue-metrics.ts
// Script to check queue depth for monitoring
import { QueueServiceClient } from '@azure/storage-queue';

async function checkQueueDepth(connectionString: string, queueName: string) {
  const service = QueueServiceClient.fromConnectionString(connectionString);
  const queue = service.getQueueClient(queueName);
  const properties = await queue.getProperties();

  const messageCount = properties.approximateMessagesCount || 0;
  console.log(`Queue "${queueName}": ~${messageCount} messages`);

  // Alert if queue is backing up
  if (messageCount > 1000) {
    console.warn(`WARNING: ${queueName} has ${messageCount} messages - possible processing bottleneck`);
  }

  return messageCount;
}
```

## Deployment

```bash
# Deploy the Functions project to Azure
func azure functionapp publish queue-processor-app

# Verify the functions are registered
func azure functionapp list-functions queue-processor-app
```

## Summary

Azure Queue Storage with Azure Functions in TypeScript gives you a simple, cost-effective way to process background jobs. The queue trigger automatically scales your functions based on queue depth - more messages means more function instances. The pattern works well for image processing, email sending, data exports, and any task that is too slow or resource-intensive for a synchronous API response. If you need more advanced features like dead letter queues, message sessions, or publish-subscribe patterns, step up to Azure Service Bus. But for straightforward job queuing, Queue Storage is the simpler and cheaper choice.
