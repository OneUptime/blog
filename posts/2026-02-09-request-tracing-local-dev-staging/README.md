# How to Implement Request Tracing Headers in Local Development Against Kubernetes Staging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Tracing, Development, Observability

Description: Implement request tracing headers to debug distributed applications by following requests from local development through staging Kubernetes services with correlation IDs and distributed tracing.

---

Debugging distributed systems requires understanding request flow across multiple services. When developing locally against staging Kubernetes services, you need to trace requests through the entire call chain to identify bottlenecks and failures.

Request tracing headers provide correlation IDs that follow requests across service boundaries. This guide shows you how to implement tracing headers that work from local development through staging environments, integrating with observability tools for complete visibility.

## Understanding Distributed Tracing

Distributed tracing tracks requests as they flow through multiple services. Each request gets a unique trace ID that persists across service calls, allowing you to reconstruct the complete execution path.

Key concepts:
- **Trace ID**: Unique identifier for the entire request chain
- **Span ID**: Identifier for a single operation within a trace
- **Parent Span**: The calling span in the request chain
- **Baggage**: Key-value pairs propagated across services

## Implementing Basic Tracing Headers

Start with simple correlation headers in your local application:

```javascript
// tracer.js
const { v4: uuidv4 } = require('uuid');

class RequestTracer {
  constructor() {
    this.serviceName = process.env.SERVICE_NAME || 'local-dev';
  }

  // Generate trace ID for new requests
  generateTraceId() {
    return uuidv4();
  }

  // Create tracing headers
  createHeaders(existingTraceId = null) {
    const traceId = existingTraceId || this.generateTraceId();
    const spanId = uuidv4();

    return {
      'X-Trace-Id': traceId,
      'X-Span-Id': spanId,
      'X-Parent-Span-Id': existingTraceId ? spanId : null,
      'X-Service-Name': this.serviceName,
      'X-Timestamp': Date.now().toString(),
      'X-Source': 'local-dev'
    };
  }

  // Extract trace context from incoming request
  extractContext(req) {
    return {
      traceId: req.headers['x-trace-id'],
      spanId: req.headers['x-span-id'],
      parentSpanId: req.headers['x-parent-span-id'],
      serviceName: req.headers['x-service-name']
    };
  }

  // Propagate context to outgoing requests
  propagateContext(context) {
    const newSpanId = uuidv4();

    return {
      'X-Trace-Id': context.traceId,
      'X-Span-Id': newSpanId,
      'X-Parent-Span-Id': context.spanId,
      'X-Service-Name': this.serviceName
    };
  }
}

module.exports = new RequestTracer();
```

Integrate with Express middleware:

```javascript
// middleware/tracing.js
const tracer = require('../tracer');

function tracingMiddleware(req, res, next) {
  // Extract or create trace context
  const context = tracer.extractContext(req);

  if (!context.traceId) {
    // New request chain, generate trace ID
    const headers = tracer.createHeaders();
    req.traceId = headers['X-Trace-Id'];
    req.spanId = headers['X-Span-Id'];
  } else {
    // Continue existing trace
    req.traceId = context.traceId;
    req.spanId = context.spanId;
  }

  // Add trace ID to response headers
  res.setHeader('X-Trace-Id', req.traceId);

  // Log request with trace context
  console.log(`[${req.traceId}] ${req.method} ${req.path}`);

  next();
}

module.exports = tracingMiddleware;
```

Use in your application:

```javascript
// app.js
const express = require('express');
const tracingMiddleware = require('./middleware/tracing');
const tracer = require('./tracer');

const app = express();

// Apply tracing middleware
app.use(tracingMiddleware);

// Example route that calls staging services
app.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    // Propagate trace context to staging service
    const context = {
      traceId: req.traceId,
      spanId: req.spanId
    };

    const headers = tracer.propagateContext(context);

    // Call staging user service
    const userResponse = await fetch(
      `https://user-service.staging.k8s.company.com/users/${userId}`,
      { headers }
    );

    const user = await userResponse.json();

    // Call staging orders service
    const ordersResponse = await fetch(
      `https://orders-service.staging.k8s.company.com/users/${userId}/orders`,
      { headers }
    );

    const orders = await ordersResponse.json();

    res.json({ user, orders });
  } catch (error) {
    console.error(`[${req.traceId}] Error:`, error.message);
    res.status(500).json({ error: 'Internal server error', traceId: req.traceId });
  }
});

app.listen(3000, () => {
  console.log('Local dev server running on port 3000');
});
```

## Integrating with OpenTelemetry

Implement standardized tracing with OpenTelemetry:

```javascript
// otel-config.js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');

function initializeTracing() {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'local-dev',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'development',
      'dev.local': true
    }),
  });

  // Export to Jaeger running in staging cluster
  const jaegerExporter = new JaegerExporter({
    endpoint: 'http://jaeger-collector.staging.k8s.company.com:14268/api/traces',
    tags: {
      'source': 'local-dev',
      'developer': process.env.USER
    }
  });

  provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
  provider.register();

  // Auto-instrument HTTP and Express
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation({
        requestHook: (span, request) => {
          span.setAttribute('http.target', request.path);
          span.setAttribute('dev.local', true);
        }
      }),
      new ExpressInstrumentation()
    ],
  });

  console.log('OpenTelemetry tracing initialized');
}

module.exports = { initializeTracing };
```

Use in your application:

```javascript
// app.js
const { initializeTracing } = require('./otel-config');

// Initialize tracing before requiring other modules
initializeTracing();

const express = require('express');
const app = express();

// Routes are automatically instrumented
app.get('/api/data', async (req, res) => {
  // OpenTelemetry automatically propagates trace context
  const response = await fetch('https://api.staging.k8s.company.com/data');
  const data = await response.json();
  res.json(data);
});

app.listen(3000);
```

## Port Forwarding Jaeger UI

Access the tracing UI from your local machine:

```bash
#!/bin/bash
# forward-jaeger.sh

echo "Setting up port forwards to staging observability stack..."

# Forward Jaeger UI
kubectl port-forward -n observability svc/jaeger-query 16686:16686 &
JAEGER_PID=$!

echo "Jaeger UI available at: http://localhost:16686"

# Forward Prometheus for metrics correlation
kubectl port-forward -n observability svc/prometheus 9090:9090 &
PROM_PID=$!

echo "Prometheus available at: http://localhost:9090"

# Cleanup on exit
trap "kill $JAEGER_PID $PROM_PID 2>/dev/null" EXIT

echo "Press Ctrl+C to stop port forwards"
wait
```

## Building a Trace Visualization Tool

Create a simple CLI tool to follow traces:

```javascript
// trace-viewer.js
const axios = require('axios');
const chalk = require('chalk');

class TraceViewer {
  constructor(jaegerUrl = 'http://localhost:16686') {
    this.jaegerUrl = jaegerUrl;
  }

  async getTrace(traceId) {
    const url = `${this.jaegerUrl}/api/traces/${traceId}`;

    try {
      const response = await axios.get(url);
      return response.data.data[0];
    } catch (error) {
      console.error('Failed to fetch trace:', error.message);
      return null;
    }
  }

  printTrace(trace) {
    if (!trace) {
      console.log('Trace not found');
      return;
    }

    console.log(chalk.bold('\nTrace Details'));
    console.log(chalk.gray('='.repeat(80)));
    console.log(`Trace ID: ${chalk.cyan(trace.traceID)}`);
    console.log(`Spans: ${trace.spans.length}`);
    console.log(`Duration: ${this.formatDuration(this.getTraceDuration(trace))}`);

    console.log(chalk.bold('\n\nSpan Timeline'));
    console.log(chalk.gray('='.repeat(80)));

    // Sort spans by start time
    const sortedSpans = trace.spans.sort((a, b) => a.startTime - b.startTime);

    sortedSpans.forEach(span => {
      this.printSpan(span, trace.spans[0].startTime);
    });
  }

  printSpan(span, traceStartTime) {
    const indent = '  '.repeat(this.getSpanDepth(span));
    const duration = span.duration / 1000; // Convert to ms
    const offset = (span.startTime - traceStartTime) / 1000;

    let statusIcon = chalk.green('✓');
    if (span.tags.find(t => t.key === 'error' && t.value)) {
      statusIcon = chalk.red('✗');
    }

    console.log(
      `${indent}${statusIcon} ${chalk.yellow(span.operationName)} ` +
      `${chalk.gray(`[${span.process.serviceName}]`)} ` +
      `${chalk.cyan(duration.toFixed(2) + 'ms')} ` +
      `${chalk.gray(`+${offset.toFixed(2)}ms`)}`
    );

    // Print important tags
    const importantTags = span.tags.filter(t =>
      ['http.method', 'http.url', 'http.status_code', 'error'].includes(t.key)
    );

    importantTags.forEach(tag => {
      console.log(`${indent}  ${chalk.gray(tag.key)}: ${tag.value}`);
    });
  }

  getSpanDepth(span) {
    // Count number of parent references
    return span.references.filter(r => r.refType === 'CHILD_OF').length;
  }

  getTraceDuration(trace) {
    const spans = trace.spans;
    const minStart = Math.min(...spans.map(s => s.startTime));
    const maxEnd = Math.max(...spans.map(s => s.startTime + s.duration));
    return maxEnd - minStart;
  }

  formatDuration(microseconds) {
    const ms = microseconds / 1000;
    if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  async searchTraces(service, operation, limit = 10) {
    const url = `${this.jaegerUrl}/api/traces`;

    try {
      const response = await axios.get(url, {
        params: {
          service,
          operation,
          limit,
          lookback: '1h'
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('Failed to search traces:', error.message);
      return [];
    }
  }
}

// CLI usage
if (require.main === module) {
  const traceId = process.argv[2];

  if (!traceId) {
    console.log('Usage: node trace-viewer.js <trace-id>');
    process.exit(1);
  }

  const viewer = new TraceViewer();

  viewer.getTrace(traceId).then(trace => {
    viewer.printTrace(trace);
  });
}

module.exports = TraceViewer;
```

Use it:

```bash
node trace-viewer.js abc123-def456-ghi789
```

## Correlating Logs with Traces

Add trace IDs to log statements:

```javascript
// logger.js
const winston = require('winston');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => {
      const store = asyncLocalStorage.getStore();
      const traceId = store?.traceId || 'no-trace';
      const spanId = store?.spanId || 'no-span';

      return `${info.timestamp} [${traceId}:${spanId}] ${info.level}: ${info.message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

function setTraceContext(traceId, spanId) {
  asyncLocalStorage.enterWith({ traceId, spanId });
}

module.exports = { logger, setTraceContext };
```

Middleware to set context:

```javascript
// middleware/logging.js
const { setTraceContext, logger } = require('../logger');

function loggingMiddleware(req, res, next) {
  setTraceContext(req.traceId, req.spanId);
  logger.info(`Incoming ${req.method} ${req.path}`);
  next();
}

module.exports = loggingMiddleware;
```

## Setting Up Trace Sampling for Development

Control which requests get traced:

```javascript
// sampler.js
class DevelopmentSampler {
  constructor() {
    // Always sample requests from local dev
    this.sampleRate = 1.0;

    // Sample specific operations more frequently
    this.operationSampling = {
      '/api/critical-path': 1.0,
      '/api/debug': 1.0,
      '/api/high-traffic': 0.1
    };
  }

  shouldSample(operation, headers) {
    // Always sample if X-Force-Trace header is present
    if (headers['x-force-trace'] === 'true') {
      return true;
    }

    // Check operation-specific sampling
    const rate = this.operationSampling[operation] || this.sampleRate;

    return Math.random() < rate;
  }
}

module.exports = new DevelopmentSampler();
```

## Creating a Development Dashboard

Build a simple dashboard showing recent traces:

```html
<!-- trace-dashboard.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Local Dev Traces</title>
  <style>
    body { font-family: monospace; padding: 20px; }
    .trace { border: 1px solid #ccc; margin: 10px 0; padding: 10px; }
    .trace-id { color: #0066cc; font-weight: bold; }
    .duration { color: #666; }
    .error { background-color: #ffeeee; }
  </style>
</head>
<body>
  <h1>Recent Traces from Local Development</h1>
  <div id="traces"></div>

  <script>
    async function loadTraces() {
      const response = await fetch('http://localhost:16686/api/traces?service=local-dev&limit=20');
      const data = await response.json();

      const tracesDiv = document.getElementById('traces');
      tracesDiv.innerHTML = '';

      data.data.forEach(trace => {
        const div = document.createElement('div');
        div.className = 'trace';

        const hasErrors = trace.spans.some(s =>
          s.tags.find(t => t.key === 'error' && t.value)
        );

        if (hasErrors) {
          div.classList.add('error');
        }

        const duration = calculateDuration(trace);

        div.innerHTML = `
          <div class="trace-id">${trace.traceID}</div>
          <div class="duration">Duration: ${duration}ms | Spans: ${trace.spans.length}</div>
          <div>Started: ${new Date(trace.spans[0].startTime / 1000).toLocaleTimeString()}</div>
        `;

        tracesDiv.appendChild(div);
      });
    }

    function calculateDuration(trace) {
      const minStart = Math.min(...trace.spans.map(s => s.startTime));
      const maxEnd = Math.max(...trace.spans.map(s => s.startTime + s.duration));
      return ((maxEnd - minStart) / 1000).toFixed(2);
    }

    loadTraces();
    setInterval(loadTraces, 5000);
  </script>
</body>
</html>
```

Request tracing headers bridge the gap between local development and staging environments, providing visibility into distributed system behavior. Implement tracing early in development to catch issues before they reach production.
