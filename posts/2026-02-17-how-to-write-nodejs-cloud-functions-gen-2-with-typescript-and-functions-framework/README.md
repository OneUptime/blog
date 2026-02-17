# How to Write Node.js Cloud Functions Gen 2 with TypeScript and the Functions Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, TypeScript, Node.js, Serverless

Description: Learn how to write Cloud Functions Gen 2 in TypeScript using the Functions Framework with proper type safety, testing, and deployment configuration.

---

Cloud Functions Gen 2 is built on Cloud Run, which means better performance, longer timeouts, and concurrency support compared to Gen 1. Writing your functions in TypeScript adds type safety that catches errors at compile time instead of in production. The Functions Framework provides a local development experience that closely matches the deployed environment. In this post, I will cover the full workflow from setup to deployment.

## Why TypeScript for Cloud Functions?

When your function receives a Pub/Sub message or an HTTP request, you need to know the shape of that data. With plain JavaScript, you discover structural issues at runtime - usually in production. TypeScript catches these at build time. The Functions Framework has excellent TypeScript type definitions, so your editor can tell you exactly what properties are available on event objects.

## Project Setup

Initialize a TypeScript project for Cloud Functions.

```bash
# Create the project directory
mkdir my-cloud-function && cd my-cloud-function

# Initialize the project
npm init -y

# Install the Functions Framework and TypeScript dependencies
npm install @google-cloud/functions-framework

# Install TypeScript and types as dev dependencies
npm install --save-dev typescript @types/node
```

## TypeScript Configuration

Configure TypeScript for a Cloud Functions project.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

## Writing an HTTP Function

HTTP functions handle incoming HTTP requests - similar to Express route handlers.

```typescript
// src/index.ts - HTTP Cloud Function with TypeScript
import { HttpFunction } from '@google-cloud/functions-framework';

// Define the shape of your request body
interface CreateUserRequest {
  name: string;
  email: string;
  role?: string;
}

// Define the response structure
interface ApiResponse<T> {
  data?: T;
  error?: string;
  timestamp: string;
}

// The HttpFunction type provides proper typing for req and res
export const createUser: HttpFunction = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    const response: ApiResponse<null> = {
      error: `Method ${req.method} not allowed`,
      timestamp: new Date().toISOString(),
    };
    res.status(405).json(response);
    return;
  }

  try {
    // TypeScript ensures we handle the request body correctly
    const body = req.body as CreateUserRequest;

    // Validate required fields
    if (!body.name || !body.email) {
      const response: ApiResponse<null> = {
        error: 'Name and email are required',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      const response: ApiResponse<null> = {
        error: 'Invalid email format',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    // Process the request (create user in database, etc.)
    const user = {
      id: `user-${Date.now()}`,
      name: body.name,
      email: body.email,
      role: body.role || 'member',
      createdAt: new Date().toISOString(),
    };

    console.log(`Created user: ${user.id}`);

    const response: ApiResponse<typeof user> = {
      data: user,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating user:', error);
    const response: ApiResponse<null> = {
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
};
```

## Writing a CloudEvent Function (Pub/Sub Trigger)

CloudEvent functions handle events from services like Pub/Sub, Cloud Storage, and Firestore.

```typescript
// src/pubsub-handler.ts - Pub/Sub triggered Cloud Function
import { CloudEvent } from '@google-cloud/functions-framework';

// Define the structure of Pub/Sub CloudEvent data
interface PubSubData {
  message: {
    data: string;        // Base64-encoded message data
    messageId: string;
    publishTime: string;
    attributes?: Record<string, string>;
  };
  subscription: string;
}

// Define your message payload type
interface OrderEvent {
  orderId: string;
  customerId: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  eventType: 'created' | 'updated' | 'cancelled';
}

// CloudEvent function with typed event data
export const processOrder = (event: CloudEvent<PubSubData>): void => {
  // Access the Pub/Sub message data
  const pubsubMessage = event.data?.message;

  if (!pubsubMessage?.data) {
    console.error('No message data received');
    return;
  }

  // Decode the base64 message data
  const decodedData = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
  const orderEvent: OrderEvent = JSON.parse(decodedData);

  // TypeScript gives us autocomplete and type checking here
  console.log(`Processing order ${orderEvent.orderId} for customer ${orderEvent.customerId}`);
  console.log(`Event type: ${orderEvent.eventType}`);
  console.log(`Total: $${orderEvent.totalAmount}`);
  console.log(`Items: ${orderEvent.items.length}`);

  // Access message attributes if present
  const attributes = pubsubMessage.attributes;
  if (attributes?.priority) {
    console.log(`Priority: ${attributes.priority}`);
  }

  // Handle each event type with type safety
  switch (orderEvent.eventType) {
    case 'created':
      handleOrderCreated(orderEvent);
      break;
    case 'updated':
      handleOrderUpdated(orderEvent);
      break;
    case 'cancelled':
      handleOrderCancelled(orderEvent);
      break;
    default:
      // TypeScript's exhaustive check - this will never be reached
      // if all cases are handled
      const _exhaustive: never = orderEvent.eventType;
      console.error(`Unknown event type: ${_exhaustive}`);
  }
};

function handleOrderCreated(order: OrderEvent): void {
  console.log(`New order created: ${order.orderId}`);
  // Send confirmation email, update inventory, etc.
}

function handleOrderUpdated(order: OrderEvent): void {
  console.log(`Order updated: ${order.orderId}`);
}

function handleOrderCancelled(order: OrderEvent): void {
  console.log(`Order cancelled: ${order.orderId}`);
  // Process refund, restore inventory, etc.
}
```

## Writing a Cloud Storage Trigger

Handle file upload events from Cloud Storage.

```typescript
// src/storage-handler.ts - Cloud Storage triggered function
import { CloudEvent } from '@google-cloud/functions-framework';

// Define the Cloud Storage event data structure
interface StorageObjectData {
  bucket: string;
  name: string;
  metageneration: string;
  timeCreated: string;
  updated: string;
  size: string;
  contentType: string;
  metadata?: Record<string, string>;
}

export const processUpload = (event: CloudEvent<StorageObjectData>): void => {
  const file = event.data;

  if (!file) {
    console.error('No file data in event');
    return;
  }

  // TypeScript provides autocomplete for all these properties
  console.log(`File uploaded: ${file.name}`);
  console.log(`Bucket: ${file.bucket}`);
  console.log(`Content type: ${file.contentType}`);
  console.log(`Size: ${parseInt(file.size) / 1024} KB`);

  // Process based on file type
  if (file.contentType.startsWith('image/')) {
    processImage(file);
  } else if (file.contentType === 'application/pdf') {
    processPdf(file);
  } else {
    console.log(`Skipping unsupported content type: ${file.contentType}`);
  }
};

function processImage(file: StorageObjectData): void {
  console.log(`Processing image: gs://${file.bucket}/${file.name}`);
  // Resize, generate thumbnails, run Vision API, etc.
}

function processPdf(file: StorageObjectData): void {
  console.log(`Processing PDF: gs://${file.bucket}/${file.name}`);
  // Extract text, convert pages, etc.
}
```

## Package.json Configuration

Configure the build scripts and entry point.

```json
{
  "name": "my-cloud-function",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "functions-framework --target=createUser --source=dist",
    "dev": "tsc --watch & functions-framework --target=createUser --source=dist",
    "test": "jest",
    "deploy:http": "npm run build && gcloud functions deploy create-user --gen2 --runtime=nodejs20 --region=us-central1 --source=. --entry-point=createUser --trigger-http --allow-unauthenticated",
    "deploy:pubsub": "npm run build && gcloud functions deploy process-order --gen2 --runtime=nodejs20 --region=us-central1 --source=. --entry-point=processOrder --trigger-topic=order-events"
  },
  "dependencies": {
    "@google-cloud/functions-framework": "^3.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.11.5"
  }
}
```

## Local Development and Testing

The Functions Framework lets you run your function locally.

```bash
# Build the TypeScript code
npm run build

# Start the local server (for HTTP functions)
npx functions-framework --target=createUser --source=dist --port=8080

# Test with curl
curl -X POST http://localhost:8080 \
    -H "Content-Type: application/json" \
    -d '{"name": "Alice", "email": "alice@example.com"}'
```

## Writing Unit Tests

Test your functions with Jest and the Functions Framework test helpers.

```typescript
// test/index.test.ts - Unit tests for Cloud Functions
import { createUser } from '../src/index';
import { Request, Response } from 'express';

// Helper to create mock request and response objects
function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'POST',
    body: {},
    headers: {},
    ...overrides,
  } as Request;
}

function createMockRes(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('createUser', () => {
  it('should create a user with valid input', async () => {
    const req = createMockReq({
      method: 'POST',
      body: { name: 'Alice', email: 'alice@example.com' },
    });
    const res = createMockRes();

    await createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Alice',
          email: 'alice@example.com',
        }),
      }),
    );
  });

  it('should return 400 for missing name', async () => {
    const req = createMockReq({
      method: 'POST',
      body: { email: 'alice@example.com' },
    });
    const res = createMockRes();

    await createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 405 for non-POST requests', async () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();

    await createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });
});
```

## Deploying Cloud Functions Gen 2

Deploy your TypeScript functions after building.

```bash
# Build the TypeScript code first
npm run build

# Deploy an HTTP function
gcloud functions deploy create-user \
    --gen2 \
    --runtime=nodejs20 \
    --region=us-central1 \
    --source=. \
    --entry-point=createUser \
    --trigger-http \
    --memory=256Mi \
    --timeout=60s \
    --max-instances=10 \
    --allow-unauthenticated

# Deploy a Pub/Sub triggered function
gcloud functions deploy process-order \
    --gen2 \
    --runtime=nodejs20 \
    --region=us-central1 \
    --source=. \
    --entry-point=processOrder \
    --trigger-topic=order-events \
    --memory=256Mi \
    --timeout=540s \
    --max-instances=20

# Deploy a Cloud Storage triggered function
gcloud functions deploy process-upload \
    --gen2 \
    --runtime=nodejs20 \
    --region=us-central1 \
    --source=. \
    --entry-point=processUpload \
    --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
    --trigger-event-filters="bucket=my-upload-bucket" \
    --memory=512Mi \
    --timeout=300s
```

## Handling Environment Variables

Use environment variables with proper typing.

```typescript
// src/config.ts - Typed environment configuration
interface AppConfig {
  projectId: string;
  region: string;
  databaseUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export function getConfig(): AppConfig {
  const projectId = process.env.GCP_PROJECT;
  const databaseUrl = process.env.DATABASE_URL;

  if (!projectId) {
    throw new Error('GCP_PROJECT environment variable is required');
  }

  return {
    projectId,
    region: process.env.GCP_REGION || 'us-central1',
    databaseUrl: databaseUrl || '',
    logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info',
  };
}
```

## Including .gcloudignore

Exclude unnecessary files from the deployment package.

```
# .gcloudignore - Files to exclude from deployment
node_modules/
src/
test/
.git/
.gitignore
tsconfig.json
jest.config.js
*.test.ts
*.spec.ts
README.md
```

Make sure the `dist` directory is included since that contains the compiled JavaScript that Cloud Functions will run.

## Monitoring Cloud Functions

Cloud Functions Gen 2 benefits from monitoring just like any other service. OneUptime (https://oneuptime.com) can monitor your HTTP function endpoints, track invocation latency, and alert you when functions start erroring, helping you maintain reliable serverless services.

## Summary

Writing Cloud Functions Gen 2 with TypeScript gives you type safety across your entire function - from event parsing to response formatting. The Functions Framework provides proper TypeScript types for HTTP functions, CloudEvents, and background functions. The development workflow is straightforward: write TypeScript, build to JavaScript, test locally with the Functions Framework, and deploy. The type system catches issues at build time that would otherwise surface as runtime errors in production, making your serverless functions more reliable from the start.
