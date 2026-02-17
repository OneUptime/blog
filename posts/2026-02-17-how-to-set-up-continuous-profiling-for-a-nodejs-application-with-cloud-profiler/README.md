# How to Set Up Continuous Profiling for a Node.js Application with Cloud Profiler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Profiler, Node.js, Continuous Profiling, Performance

Description: A complete guide to setting up Google Cloud Profiler for continuous CPU and heap profiling of Node.js applications, with deployment examples for Cloud Run and GKE.

---

Node.js performance issues are tricky. The single-threaded event loop means that one slow synchronous operation can block everything. CPU-intensive code in a request handler stalls all other requests. Memory leaks from closures and event listeners slowly degrade performance until the process runs out of memory.

Cloud Profiler helps you find these problems in production by continuously collecting CPU and heap profiles with minimal overhead. Unlike attaching a profiler to a running process for a few minutes, continuous profiling gives you always-available data that shows how your Node.js application behaves under real production load.

## How Cloud Profiler Works with Node.js

The `@google-cloud/profiler` package uses V8's built-in profiling APIs to collect:

- **CPU (wall-clock) profiles**: Shows where elapsed time is spent, including async operations.
- **Heap profiles**: Shows memory allocation by function, helping identify memory leaks and high-allocation code paths.

The profiler collects a 10-second profile approximately once per minute. During collection, it samples the call stack at a fixed interval. Between collection windows, there is zero overhead.

## Step 1: Install the Package

```bash
# Install the Cloud Profiler package
npm install @google-cloud/profiler
```

## Step 2: Initialize the Profiler

The profiler must be started before your application code loads. This is because it needs to instrument V8's profiling hooks before any code runs.

Create a dedicated profiler initialization file:

```javascript
// profiler.js - Initialize Cloud Profiler
// This must be required before any other application code

const profiler = require('@google-cloud/profiler');

profiler.start({
  // Service name as it appears in Cloud Profiler UI
  serviceContext: {
    service: process.env.SERVICE_NAME || 'my-node-service',
    version: process.env.APP_VERSION || '1.0.0',
  },
  // Project ID is auto-detected on GCP
  // projectId: 'your-project-id',

  // Enable heap profiling (disabled by default)
  heapProfiler: true,

  // Log level for profiler diagnostics (0=silent, 1=error, 2=warn, 3=info, 4=debug)
  logLevel: 1,
});
```

## Step 3: Load the Profiler in Your Application

Option 1: Require it as the first line of your entry point.

```javascript
// index.js - Application entry point
require('./profiler'); // Must be the very first require

const express = require('express');
const app = express();

app.get('/api/users', async (req, res) => {
  const users = await fetchUsers();
  res.json(users);
});

app.get('/api/reports', async (req, res) => {
  // This endpoint does CPU-intensive data processing
  const data = await fetchReportData();
  const report = generateReport(data); // Will show up in CPU profiles
  res.json(report);
});

app.listen(process.env.PORT || 8080, () => {
  console.log('Server started');
});
```

Option 2: Use the `--require` flag (works better with TypeScript and module-based projects).

```bash
# Start with profiler pre-loaded
node --require ./profiler.js index.js
```

## Step 4: Deploy to Cloud Run

Here is a Dockerfile optimized for Cloud Run with profiling enabled.

```dockerfile
FROM node:20-slim

WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Cloud Run provides PORT environment variable
ENV SERVICE_NAME=my-node-service

# Use --require to load the profiler before the app
CMD ["node", "--require", "./profiler.js", "index.js"]
```

Deploy to Cloud Run:

```bash
# Deploy to Cloud Run with the profiler
gcloud run deploy my-node-service \
  --source . \
  --region us-central1 \
  --set-env-vars="APP_VERSION=$(git rev-parse --short HEAD)" \
  --allow-unauthenticated
```

## Step 5: Deploy to GKE

For GKE, set up Workload Identity so the profiler can authenticate with Cloud Profiler.

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-node-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-node-service
  template:
    metadata:
      labels:
        app: my-node-service
    spec:
      serviceAccountName: profiler-sa  # Must have cloudprofiler.agent role
      containers:
        - name: app
          image: gcr.io/YOUR_PROJECT/my-node-service:latest
          ports:
            - containerPort: 8080
          env:
            - name: SERVICE_NAME
              value: "my-node-service"
            - name: APP_VERSION
              value: "2.0.0"
            - name: NODE_OPTIONS
              value: "--max-old-space-size=512"
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

## Understanding Node.js CPU Profiles

When you view CPU profiles in Cloud Profiler, the flame graph shows the V8 call stack. Here is what to look for:

### Event Loop Blocking

If you see a wide bar for a synchronous function, it is blocking the event loop. All other requests wait while this function executes.

Common blockers:
- `JSON.parse()` or `JSON.stringify()` on large objects
- Synchronous file I/O (`fs.readFileSync`)
- Heavy regex operations
- Large array sorting or filtering
- Cryptographic operations without the async variants

```javascript
// BAD: Synchronous JSON parsing blocks the event loop
app.post('/api/import', (req, res) => {
  const data = JSON.parse(req.body); // Blocks if body is large
  processData(data);
  res.json({ status: 'ok' });
});

// BETTER: Use streaming JSON parsing for large payloads
const JSONStream = require('jsonstream');

app.post('/api/import', (req, res) => {
  const parser = JSONStream.parse('*');
  req.pipe(parser);

  const items = [];
  parser.on('data', (item) => items.push(item));
  parser.on('end', () => {
    processData(items);
    res.json({ status: 'ok' });
  });
});
```

### Async Operations in Wall-Clock Profiles

Wall-clock profiles show time spent waiting for async operations. If you see functions like `TCP.onread` or database driver internals taking significant time, your service is spending most of its time waiting on I/O. This is normal for I/O-bound services but can indicate inefficient database queries or slow downstream services.

## Understanding Node.js Heap Profiles

Heap profiles show which functions are allocating the most memory. This is crucial for finding memory leaks.

### Common Node.js Memory Leak Patterns

**Event listener accumulation:**

```javascript
// LEAKY: Adding a listener every request without removing it
app.get('/api/events', (req, res) => {
  const listener = (data) => {
    // This listener is never removed
  };
  eventEmitter.on('update', listener);
  // Missing: eventEmitter.removeListener('update', listener)
  res.json({ status: 'subscribed' });
});

// FIXED: Clean up listeners
app.get('/api/events', (req, res) => {
  const listener = (data) => {
    res.json(data);
    eventEmitter.removeListener('update', listener);
  };
  eventEmitter.once('update', listener); // Use 'once' for single-use listeners
});
```

**Closure-captured variables:**

```javascript
// LEAKY: Large data captured in closure stays in memory
function createHandler(largeConfig) {
  // largeConfig is captured and never freed while handler exists
  return (req, res) => {
    // Only uses one small field from largeConfig
    res.json({ version: largeConfig.version });
  };
}

// FIXED: Only capture what you need
function createHandler(largeConfig) {
  const version = largeConfig.version; // Capture only the needed value
  return (req, res) => {
    res.json({ version });
  };
}
```

**Growing caches without eviction:**

```javascript
// LEAKY: Cache grows without bound
const cache = new Map();

function getCachedData(key) {
  if (cache.has(key)) return cache.get(key);
  const data = fetchFromDB(key);
  cache.set(key, data); // Never evicted
  return data;
}

// FIXED: Use an LRU cache with a size limit
const LRU = require('lru-cache');
const cache = new LRU({ max: 1000 }); // Max 1000 entries

function getCachedData(key) {
  if (cache.has(key)) return cache.get(key);
  const data = fetchFromDB(key);
  cache.set(key, data); // Automatically evicts oldest when full
  return data;
}
```

## Monitoring Memory Usage Alongside Profiling

Set up a simple memory monitoring endpoint to track memory trends.

```javascript
// health.js - Memory monitoring endpoint
app.get('/debug/memory', (req, res) => {
  const usage = process.memoryUsage();
  res.json({
    rss_mb: Math.round(usage.rss / 1024 / 1024),
    heap_total_mb: Math.round(usage.heapTotal / 1024 / 1024),
    heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024),
    external_mb: Math.round(usage.external / 1024 / 1024),
    array_buffers_mb: Math.round(usage.arrayBuffers / 1024 / 1024),
  });
});
```

## Local Development

For local development, the profiler will not connect to Cloud Profiler unless you have credentials configured.

```bash
# Set up credentials for local profiling
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project-id

# Run with profiling enabled
node --require ./profiler.js index.js
```

Alternatively, disable the profiler locally and use Chrome DevTools for local profiling:

```javascript
// profiler.js - Skip in development
if (process.env.NODE_ENV === 'production') {
  const profiler = require('@google-cloud/profiler');
  profiler.start({
    serviceContext: {
      service: process.env.SERVICE_NAME || 'my-node-service',
      version: process.env.APP_VERSION || '1.0.0',
    },
    heapProfiler: true,
  });
}
```

## Wrapping Up

Continuous profiling for Node.js applications is easy to set up and provides insights you cannot get from metrics alone. A few lines of code give you always-available flame graphs that show exactly where CPU time is spent and where memory is being allocated. Focus on event loop blocking for CPU issues and closure-captured references for memory issues. Check the profiles after every deployment and you will catch performance problems before they affect your users.
