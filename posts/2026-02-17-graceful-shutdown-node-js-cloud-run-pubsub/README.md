# How to Use Graceful Shutdown in a Node.js Cloud Run Service with Active Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Node.js, Pub/Sub, Graceful Shutdown, Google Cloud

Description: Implement graceful shutdown in a Node.js Cloud Run service to properly close Pub/Sub connections and prevent message loss during instance termination.

---

When Cloud Run decides to terminate one of your instances - due to scale-down, a new revision deployment, or resource pressure - it sends a SIGTERM signal to your container. You then have a limited window of 10 seconds to finish what you are doing before the process is killed. If your service has active Pub/Sub connections, open database transactions, or in-flight HTTP requests, failing to handle this signal properly can result in lost messages, incomplete operations, and data inconsistency.

In this post, I will walk through implementing graceful shutdown for a Node.js service on Cloud Run that has active Pub/Sub pull subscriptions, HTTP request handling, and background tasks.

## Understanding the Shutdown Sequence

When Cloud Run sends SIGTERM to your container, here is what needs to happen:

1. Stop accepting new HTTP requests
2. Stop pulling new Pub/Sub messages
3. Wait for in-flight HTTP requests to complete
4. Wait for currently processing Pub/Sub messages to finish
5. Acknowledge or nack any remaining messages
6. Close database connections and flush buffers
7. Exit the process

If you do not handle SIGTERM, Node.js will just terminate immediately, which can leave messages unacknowledged (causing redelivery) or operations half-complete.

## Basic Graceful Shutdown Pattern

```javascript
// server.js - Express server with graceful shutdown
const express = require('express');
const http = require('http');

const app = express();
app.use(express.json());

// Track whether we are shutting down
let isShuttingDown = false;

// Middleware to reject new requests during shutdown
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.status(503).json({ error: 'Server is shutting down' });
    return;
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: isShuttingDown ? 'shutting_down' : 'healthy' });
});

// Create HTTP server (not using app.listen so we can call server.close)
const server = http.createServer(app);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle SIGTERM from Cloud Run
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');
  isShuttingDown = true;

  // Stop accepting new connections
  // Existing connections will be allowed to finish
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Give in-flight requests time to complete
  const shutdownTimeout = setTimeout(() => {
    console.log('Shutdown timeout reached, forcing exit');
    process.exit(1);
  }, 9000); // Cloud Run sends SIGKILL after 10s

  // Wait for cleanup to finish
  try {
    await cleanup();
    clearTimeout(shutdownTimeout);
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
});

async function cleanup() {
  // Placeholder - we will fill this in
  console.log('Running cleanup tasks');
}
```

## Adding Pub/Sub Pull Subscription Handling

Now let's add a Pub/Sub pull subscription and handle its shutdown properly.

```javascript
// pubsub-consumer.js - Pub/Sub consumer with graceful shutdown
const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub({ projectId: 'your-project-id' });

// Track active message processing
const activeMessages = new Set();
let subscription = null;

async function startConsumer(subscriptionName) {
  subscription = pubsub.subscription(subscriptionName, {
    // Flow control - do not pull more messages than we can handle
    flowControl: {
      maxMessages: 10,
      allowExcessMessages: false,
    },
    // Set the maximum lease extension while processing
    maxAckDeadline: { seconds: 60 },
  });

  // Handle incoming messages
  subscription.on('message', async (message) => {
    const messageId = message.id;
    activeMessages.add(messageId);

    console.log(`Processing message ${messageId}`);

    try {
      // Parse and process the message
      const data = JSON.parse(message.data.toString());
      await processMessage(data);

      // Acknowledge successful processing
      message.ack();
      console.log(`Acknowledged message ${messageId}`);
    } catch (error) {
      console.error(`Failed to process message ${messageId}:`, error);
      // Nack to trigger redelivery
      message.nack();
    } finally {
      activeMessages.delete(messageId);
    }
  });

  subscription.on('error', (error) => {
    console.error('Subscription error:', error);
  });

  console.log(`Listening on subscription: ${subscriptionName}`);
}

async function processMessage(data) {
  // Simulate processing that takes some time
  console.log('Processing:', data);
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

// Stop the consumer and wait for in-flight messages
async function stopConsumer() {
  if (!subscription) return;

  console.log('Stopping Pub/Sub consumer...');
  console.log(`Active messages: ${activeMessages.size}`);

  // Close the subscription to stop pulling new messages
  await subscription.close();

  // Wait for active messages to finish processing
  const maxWait = 8000; // Cloud Run sends SIGKILL after 10 seconds
  const startTime = Date.now();

  while (activeMessages.size > 0 && (Date.now() - startTime) < maxWait) {
    console.log(`Waiting for ${activeMessages.size} active messages...`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (activeMessages.size > 0) {
    console.warn(`${activeMessages.size} messages still active after timeout`);
    // These messages will be redelivered by Pub/Sub since they were not acked
  }

  console.log('Pub/Sub consumer stopped');
}

module.exports = { startConsumer, stopConsumer };
```

## Tracking In-Flight HTTP Requests

Track active HTTP requests so we can wait for them during shutdown.

```javascript
// request-tracker.js - Track active HTTP requests
let activeRequests = 0;

// Middleware to track request lifecycle
function trackRequests(req, res, next) {
  activeRequests++;

  let done = false;
  const decrement = () => {
    if (done) return;
    done = true;
    activeRequests--;
  };

  // Decrement when the response finishes or the connection closes early
  res.on('finish', decrement);
  res.on('close', decrement);

  next();
}

function getActiveRequestCount() {
  return activeRequests;
}

async function waitForRequests(timeoutMs = 15000) {
  const startTime = Date.now();

  while (activeRequests > 0 && (Date.now() - startTime) < timeoutMs) {
    console.log(`Waiting for ${activeRequests} active requests...`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (activeRequests > 0) {
    console.warn(`${activeRequests} requests still active after timeout`);
  }
}

module.exports = { trackRequests, getActiveRequestCount, waitForRequests };
```

## Putting It All Together

Here is the complete service with all shutdown handling integrated.

```javascript
// app.js - Complete service with graceful shutdown
const express = require('express');
const http = require('http');
const { startConsumer, stopConsumer } = require('./pubsub-consumer');
const { trackRequests, getActiveRequestCount, waitForRequests } = require('./request-tracker');

const app = express();
app.use(express.json());

let isShuttingDown = false;

// Track active requests
app.use(trackRequests);

// Reject requests during shutdown
app.use((req, res, next) => {
  if (isShuttingDown) {
    return res.status(503).json({ error: 'Service is shutting down' });
  }
  next();
});

// Liveness check
app.get('/health', (req, res) => {
  res.json({
    status: isShuttingDown ? 'shutting_down' : 'healthy',
    activeRequests: getActiveRequestCount(),
  });
});

// Simulate a slow API endpoint
app.post('/api/process', async (req, res) => {
  // Simulate work that takes 3 seconds
  await new Promise((resolve) => setTimeout(resolve, 3000));
  res.json({ status: 'done', data: req.body });
});

const server = http.createServer(app);

// Keep the shutdown timeout under Cloud Run's 10-second shutdown window
const SHUTDOWN_TIMEOUT = 9000;

process.on('SIGTERM', async () => {
  const shutdownStart = Date.now();
  console.log('SIGTERM received - starting graceful shutdown');
  isShuttingDown = true;

  // Safety timeout to force exit if cleanup hangs
  const forceExit = setTimeout(() => {
    console.error('Forced exit after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    // Step 1: Stop accepting new HTTP connections
    console.log('Closing HTTP server...');
    const closeServer = new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Step 2: Stop the Pub/Sub consumer
    console.log('Stopping Pub/Sub consumer...');
    const stopPubSub = stopConsumer();

    // Step 3: Wait for in-flight HTTP requests and Pub/Sub messages
    console.log('Waiting for in-flight requests...');
    await Promise.all([closeServer, stopPubSub, waitForRequests(8000)]);

    // Step 4: Close any other resources
    console.log('Closing database connections...');
    // await closeDatabase();

    // Step 5: Flush any pending buffers
    console.log('Flushing buffers...');
    // await flushMetrics();
    // await flushLogs();

    const duration = Date.now() - shutdownStart;
    console.log(`Graceful shutdown complete in ${duration}ms`);

    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    clearTimeout(forceExit);
    process.exit(1);
  }
});

// Start the service
async function start() {
  const PORT = process.env.PORT || 8080;

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

  // Start the Pub/Sub consumer
  try {
    await startConsumer('my-subscription');
  } catch (error) {
    console.error('Failed to start Pub/Sub consumer:', error);
  }
}

start().catch((error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});
```

## Configuring Cloud Run for Background Processing

Cloud Run gives your container 10 seconds after SIGTERM before killing it. For services that process Pub/Sub messages in the background, configure CPU to remain allocated outside request handling.

```bash
# Deploy with CPU allocated outside request handling

gcloud run deploy my-service \
  --source . \
  --region us-central1 \
  --platform managed \
  --port 8080 \
  --no-cpu-throttling \
  --min-instances 1 \
  --set-env-vars "NODE_ENV=production"
```

The `--no-cpu-throttling` flag is important for this pattern - without it, Cloud Run only allocates CPU during request processing and during startup or shutdown, which can starve a pull subscriber that is doing background work between HTTP requests.

## Testing Graceful Shutdown Locally

You can test the shutdown sequence locally by sending SIGTERM to your process.

```bash
# Start the service
node app.js &
SERVICE_PID=$!

# Send some requests
curl -X POST http://localhost:8080/api/process -H "Content-Type: application/json" -d '{"test": true}' &

# Send SIGTERM while requests are in flight
sleep 1
kill -SIGTERM $SERVICE_PID

# Watch the output for the shutdown sequence
wait $SERVICE_PID
```

## Common Mistakes to Avoid

A few things that can go wrong with graceful shutdown:

- Using `process.exit(0)` in the SIGTERM handler without waiting for cleanup. This kills the process immediately.
- Not handling the case where cleanup itself throws an error. Always use try-catch around your shutdown logic.
- Setting up SIGTERM handlers but not testing them. The shutdown path is just as important as the happy path.
- Forgetting that Cloud Run can throttle CPU outside request processing. Background Pub/Sub consumers need CPU allocated even when the service is not handling HTTP requests.
- Not setting a force-exit timeout. If your cleanup hangs, the container will be killed anyway, but without a clean exit code.

Graceful shutdown is one of those things that seems simple but has real impact on reliability. When your Node.js service on Cloud Run handles SIGTERM properly - stopping new work, completing in-flight work, and cleaning up resources - you avoid message loss, data corruption, and mysterious errors that only happen during deployments or scale-down events.
