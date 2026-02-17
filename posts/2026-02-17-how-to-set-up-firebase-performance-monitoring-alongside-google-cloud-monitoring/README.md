# How to Set Up Firebase Performance Monitoring Alongside Google Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, Performance Monitoring, Cloud Monitoring, Observability

Description: Learn how to configure Firebase Performance Monitoring and Google Cloud Monitoring together for comprehensive observability across your client and server infrastructure.

---

Firebase Performance Monitoring and Google Cloud Monitoring serve different but complementary purposes. Firebase Performance Monitoring focuses on client-side metrics - page load times, network request latency, and custom traces in your mobile or web app. Google Cloud Monitoring focuses on server-side metrics - Cloud Function execution times, Firestore read/write latency, CPU utilization, and infrastructure health. Using them together gives you full-stack visibility into your application's performance.

## What Each Tool Does Best

Firebase Performance Monitoring excels at:
- Measuring real user experience (page load, first contentful paint)
- Tracking network request performance from the client perspective
- Monitoring app startup time on mobile
- Custom traces for specific user flows

Google Cloud Monitoring excels at:
- Server-side latency and throughput metrics
- Infrastructure metrics (CPU, memory, disk)
- Custom metrics from your backend services
- Alerting and incident management
- SLO tracking and error budgets

Neither tool alone gives you the full picture. A slow API response might look fine on the server (fast function execution) but terrible on the client (slow network, large payload). Or the server might show high latency that the client masks with a loading spinner. You need both perspectives.

## Setting Up Firebase Performance Monitoring

Start with the client side. For a web application, add the Firebase Performance SDK.

Install the SDK and initialize it in your app:

```javascript
// Install via npm
// npm install firebase @firebase/performance

// src/firebase.js - Initialize Firebase with Performance Monitoring
import { initializeApp } from "firebase/app";
import { getPerformance } from "firebase/performance";

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);

// Initialize Performance Monitoring
// This automatically tracks page load and network requests
const perf = getPerformance(app);

export { app, perf };
```

That is it for basic setup. Firebase Performance automatically captures page load metrics, network request traces, and screen rendering times. No additional code needed for the basics.

## Adding Custom Traces

For measuring specific user flows, create custom traces. These let you measure the duration of critical operations.

This code creates custom traces for key user interactions:

```javascript
// src/performance-traces.js
import { getPerformance, trace } from "firebase/performance";

const perf = getPerformance();

// Measure the checkout flow duration
export async function measureCheckout(checkoutFn) {
  const checkoutTrace = trace(perf, "checkout_flow");

  // Add custom attributes for segmentation
  checkoutTrace.putAttribute("cart_size", getCartSize().toString());
  checkoutTrace.putAttribute("payment_method", getPaymentMethod());

  checkoutTrace.start();

  try {
    const result = await checkoutFn();

    // Add a custom metric
    checkoutTrace.putMetric("items_purchased", result.itemCount);

    checkoutTrace.stop();
    return result;
  } catch (error) {
    checkoutTrace.putAttribute("error", error.message);
    checkoutTrace.stop();
    throw error;
  }
}

// Measure search response time
export async function measureSearch(query) {
  const searchTrace = trace(perf, "search_query");
  searchTrace.putAttribute("query_length", query.length.toString());

  searchTrace.start();
  const results = await performSearch(query);
  searchTrace.putMetric("result_count", results.length);
  searchTrace.stop();

  return results;
}
```

## Setting Up Google Cloud Monitoring

Google Cloud Monitoring is enabled by default for GCP services. Cloud Functions, Cloud Run, Firestore, and other services automatically emit metrics. But you can customize what you monitor and set up dashboards.

### Creating Custom Metrics from Cloud Functions

When your Cloud Functions do work that Firebase Performance cannot see, write custom metrics to Cloud Monitoring.

This Cloud Function exports custom metrics about its processing:

```typescript
// functions/src/monitoring.ts
import * as functions from "firebase-functions";
const monitoring = require("@google-cloud/monitoring");

const client = new monitoring.MetricServiceClient();
const projectId = process.env.GCLOUD_PROJECT;

// Write a custom metric to Cloud Monitoring
async function writeCustomMetric(
  metricType: string,
  value: number,
  labels: Record<string, string> = {}
) {
  const projectPath = client.projectPath(projectId);

  const timeSeriesData = {
    metric: {
      type: `custom.googleapis.com/${metricType}`,
      labels
    },
    resource: {
      type: "global",
      labels: { project_id: projectId }
    },
    points: [
      {
        interval: {
          endTime: { seconds: Math.floor(Date.now() / 1000) }
        },
        value: { doubleValue: value }
      }
    ]
  };

  await client.createTimeSeries({
    name: projectPath,
    timeSeries: [timeSeriesData]
  });
}

// Example: Track order processing time and success rate
export const processOrder = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snapshot) => {
    const startTime = Date.now();
    const order = snapshot.data();

    try {
      // Process the order
      await chargePayment(order);
      await updateInventory(order);
      await sendConfirmationEmail(order);

      const duration = Date.now() - startTime;

      // Write processing time metric
      await writeCustomMetric("order/processing_time_ms", duration, {
        status: "success"
      });

      // Write order value metric
      await writeCustomMetric("order/value", order.total, {
        currency: order.currency
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      await writeCustomMetric("order/processing_time_ms", duration, {
        status: "error"
      });

      throw error;
    }
  });
```

## Creating a Unified Dashboard

Google Cloud Monitoring dashboards can display both built-in and custom metrics. Create a dashboard that shows server and client health together.

You can create dashboards via the API or the Console. Here is a gcloud command to create one from a JSON definition:

```bash
# Create a monitoring dashboard from a JSON file
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

The dashboard JSON definition:

```json
{
  "displayName": "Application Performance - Full Stack",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Cloud Function Execution Time",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_function\" AND metric.type=\"cloudfunctions.googleapis.com/function/execution_times\"",
                    "aggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_PERCENTILE_95"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Order Processing Time (Custom)",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"custom.googleapis.com/order/processing_time_ms\"",
                    "aggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_MEAN"
                    }
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
```

## Setting Up Alerts

Configure alerts in Cloud Monitoring to catch performance regressions early.

This command creates an alert policy for Cloud Function latency:

```bash
# Create an alert for high function execution time
gcloud alpha monitoring policies create \
  --display-name="High Function Latency" \
  --condition-display-name="Execution time > 5s" \
  --condition-filter='resource.type="cloud_function" AND metric.type="cloudfunctions.googleapis.com/function/execution_times"' \
  --condition-threshold-value=5000 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels=YOUR_CHANNEL_ID \
  --combiner=OR
```

## Correlating Client and Server Metrics

The real power comes from correlating client-side and server-side metrics. When a user reports slowness, you need to trace the issue across both layers.

One effective approach is adding a trace ID to both your client traces and server logs:

```javascript
// Client side - add trace ID to custom traces and API requests
import { v4 as uuidv4 } from "uuid";

async function fetchWithTracing(url, options = {}) {
  const traceId = uuidv4();

  // Add trace ID to the request header
  const headers = {
    ...options.headers,
    "X-Trace-Id": traceId
  };

  // Create a Firebase Performance trace with the same ID
  const networkTrace = trace(perf, "api_call");
  networkTrace.putAttribute("trace_id", traceId);
  networkTrace.putAttribute("endpoint", url);

  networkTrace.start();
  const response = await fetch(url, { ...options, headers });
  networkTrace.putMetric("response_size", parseInt(response.headers.get("content-length") || "0"));
  networkTrace.stop();

  return response;
}
```

```typescript
// Server side - log with the trace ID from the client
export const api = functions.https.onRequest(async (req, res) => {
  const traceId = req.headers["x-trace-id"] || "unknown";

  // Structured logging with the trace ID
  console.log(JSON.stringify({
    severity: "INFO",
    message: "API request received",
    traceId,
    path: req.path,
    method: req.method
  }));

  // Process the request and log the duration
  const start = Date.now();
  const result = await handleRequest(req);
  const duration = Date.now() - start;

  console.log(JSON.stringify({
    severity: "INFO",
    message: "API request completed",
    traceId,
    durationMs: duration
  }));

  res.json(result);
});
```

Now you can search Cloud Logging by trace ID to connect a slow client request to its server-side processing.

## Summary

Firebase Performance Monitoring and Google Cloud Monitoring are better together than either one alone. Firebase captures the real user experience on the client, while Cloud Monitoring tracks server health and infrastructure metrics. Set up both, create custom traces for critical user flows, write custom metrics for important server-side operations, and use trace IDs to connect client and server observations. With alerts configured on both sides, you will catch performance issues before users complain.
