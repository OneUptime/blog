# How to Set Up Distributed Tracing with Cloud Trace and OpenTelemetry in a Node.js Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Trace, OpenTelemetry, Node.js, Distributed Tracing

Description: A hands-on guide to instrumenting a Node.js application with OpenTelemetry and exporting traces to Google Cloud Trace for distributed request tracking and latency analysis.

---

When you have a request flowing through multiple services - an API gateway, a business logic service, a database, maybe a cache - figuring out where time is being spent becomes nearly impossible without distributed tracing. Cloud Trace, combined with OpenTelemetry, gives you visibility into every hop a request takes and exactly how long each one takes.

OpenTelemetry has become the standard for instrumentation, and Google Cloud Trace has solid support for it. Let me show you how to wire them together in a Node.js application.

## What You Will Build

By the end of this guide, you will have a Node.js application that:
- Automatically instruments incoming HTTP requests
- Creates spans for outgoing HTTP calls
- Propagates trace context across service boundaries
- Exports all trace data to Google Cloud Trace

## Step 1: Install Dependencies

You need the OpenTelemetry SDK, the Cloud Trace exporter, and some auto-instrumentation packages.

```bash
# Install the core OpenTelemetry packages and the Cloud Trace exporter
npm install @opentelemetry/sdk-node \
  @opentelemetry/api \
  @opentelemetry/auto-instrumentations-node \
  @google-cloud/opentelemetry-cloud-trace-exporter \
  @opentelemetry/sdk-trace-node \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

## Step 2: Create the Tracing Configuration

Create a tracing setup file that initializes OpenTelemetry before your application starts. This is important - the instrumentation needs to be set up before any other modules are imported.

This file configures the OpenTelemetry SDK with the Cloud Trace exporter and auto-instrumentation for common Node.js libraries.

```javascript
// tracing.js - Must be loaded before any other application code
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { TraceExporter } = require('@google-cloud/opentelemetry-cloud-trace-exporter');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');

// Create the Cloud Trace exporter
// It automatically uses Application Default Credentials
const traceExporter = new TraceExporter({
  // projectId is auto-detected on GCP, set it explicitly for local dev
  // projectId: 'your-project-id',
});

// Configure the OpenTelemetry SDK
const sdk = new NodeSDK({
  // Define resource attributes that identify this service
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'my-api-service',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
  // Use the Cloud Trace exporter
  traceExporter: traceExporter,
  // Auto-instrument common libraries (Express, HTTP, gRPC, etc.)
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation to reduce noise
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // Configure HTTP instrumentation
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingPaths: ['/health', '/readiness'],
      },
    }),
  ],
});

// Start the SDK
sdk.start();

// Gracefully shut down on process exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing shutdown complete'))
    .catch((err) => console.error('Error shutting down tracing', err))
    .finally(() => process.exit(0));
});

module.exports = sdk;
```

## Step 3: Load Tracing Before Your App

The tracing setup must load before Express, any HTTP clients, or any other instrumented libraries. There are two ways to do this.

Option 1: Require it at the top of your entry point file.

```javascript
// index.js - Entry point of your application
// IMPORTANT: This must be the very first require
require('./tracing');

const express = require('express');
const axios = require('axios');

const app = express();

// A simple endpoint that makes an outgoing HTTP call
app.get('/api/users/:id', async (req, res) => {
  try {
    // This outgoing call will automatically create a child span
    const response = await axios.get(
      `http://user-service:3001/users/${req.params.id}`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

Option 2: Use the `--require` flag when starting the process.

```bash
# Start the app with tracing pre-loaded
node --require ./tracing.js index.js
```

## Step 4: Add Custom Spans

Auto-instrumentation covers HTTP requests, but you often want to trace specific operations like database queries or business logic.

This example shows how to create custom spans for operations that matter to your application.

```javascript
// services/userService.js
const { trace } = require('@opentelemetry/api');

// Get a tracer instance for this module
const tracer = trace.getTracer('user-service');

async function getUserWithDetails(userId) {
  // Create a custom span for the entire operation
  return tracer.startActiveSpan('getUserWithDetails', async (span) => {
    try {
      // Add attributes to help with debugging
      span.setAttribute('user.id', userId);

      // Create a child span for the database query
      const user = await tracer.startActiveSpan('db.query.user', async (dbSpan) => {
        dbSpan.setAttribute('db.system', 'postgresql');
        dbSpan.setAttribute('db.statement', 'SELECT * FROM users WHERE id = $1');
        const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        dbSpan.end();
        return result.rows[0];
      });

      if (!user) {
        span.setAttribute('user.found', false);
        span.end();
        return null;
      }

      span.setAttribute('user.found', true);

      // Create another child span for fetching preferences
      const preferences = await tracer.startActiveSpan('db.query.preferences', async (prefSpan) => {
        prefSpan.setAttribute('db.system', 'postgresql');
        const result = await db.query(
          'SELECT * FROM preferences WHERE user_id = $1',
          [userId]
        );
        prefSpan.end();
        return result.rows;
      });

      span.end();
      return { ...user, preferences };

    } catch (error) {
      // Record the error on the span
      span.recordException(error);
      span.setStatus({ code: trace.SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    }
  });
}

module.exports = { getUserWithDetails };
```

## Step 5: Propagate Context Across Services

When one service calls another, trace context needs to be propagated so that spans from both services show up in the same trace. OpenTelemetry handles this automatically for HTTP calls through the W3C Trace Context headers.

If you are using a message queue or any non-HTTP communication, you need to propagate context manually.

```javascript
// Producer side - inject context into the message
const { context, propagation } = require('@opentelemetry/api');

function publishMessage(queue, payload) {
  const carrier = {};
  // Inject the current trace context into the carrier object
  propagation.inject(context.active(), carrier);

  // Include the carrier as message headers
  queue.publish({
    body: JSON.stringify(payload),
    headers: carrier,
  });
}

// Consumer side - extract context from the message
function processMessage(message) {
  const headers = message.headers;
  // Extract the trace context from the message headers
  const extractedContext = propagation.extract(context.active(), headers);

  // Run the processing within the extracted context
  context.with(extractedContext, () => {
    const span = tracer.startSpan('processMessage');
    // ... process the message
    span.end();
  });
}
```

## Step 6: Deploy and Verify

Deploy your application to GCP (Cloud Run, GKE, or Compute Engine). Make sure the service account has the `roles/cloudtrace.agent` role.

```bash
# Grant the Cloud Trace agent role to the service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudtrace.agent"
```

After deploying, send some requests to your application and then check Cloud Trace in the Cloud Console. Navigate to **Trace > Trace Explorer** to see your traces.

## Local Development Setup

For local development, you need to authenticate with Google Cloud and set the project ID.

```bash
# Set up Application Default Credentials for local development
gcloud auth application-default login

# Set the project ID as an environment variable
export GOOGLE_CLOUD_PROJECT=your-project-id

# Start the application
node --require ./tracing.js index.js
```

## Dockerfile Example

Here is a Dockerfile that properly sets up tracing for a containerized Node.js application.

```dockerfile
FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Use the --require flag to load tracing before anything else
CMD ["node", "--require", "./tracing.js", "index.js"]
```

## Wrapping Up

Distributed tracing with OpenTelemetry and Cloud Trace gives you the visibility you need to debug latency issues and understand request flows across services. The auto-instrumentation handles most of the heavy lifting for HTTP-based communication, and custom spans let you add detail where it matters. Once you have traces flowing, you will wonder how you ever debugged production issues without them.
