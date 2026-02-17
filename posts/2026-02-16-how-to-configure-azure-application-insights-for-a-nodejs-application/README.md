# How to Configure Azure Application Insights for a Node.js Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Application Insights, Node.js, JavaScript, APM, Monitoring, Azure Monitor, Observability

Description: Complete guide to setting up Azure Application Insights in a Node.js application for request tracking, dependency monitoring, and custom telemetry.

---

Application Insights is one of the more useful tools in the Azure monitoring stack, and getting it working with a Node.js application is straightforward once you understand the setup. It automatically captures HTTP requests, outbound dependencies (database calls, HTTP calls to other services), exceptions, and performance metrics. You also get distributed tracing, live metrics, and the ability to send custom events and metrics from your code.

This guide walks through the full setup, from installing the SDK to sending custom telemetry and configuring sampling for production workloads.

## Step 1: Create an Application Insights Resource

If you do not already have an Application Insights resource, create one:

```bash
# Create an Application Insights resource backed by a Log Analytics workspace
az monitor app-insights component create \
  --app my-node-app-insights \
  --location eastus \
  --resource-group myRG \
  --workspace /subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace \
  --application-type Node.JS
```

Copy the connection string from the output. You will need it to configure the SDK.

## Step 2: Install the SDK

Install the Application Insights Node.js package:

```bash
# Install the Application Insights SDK
npm install applicationinsights
```

The key thing with Application Insights for Node.js is that you must initialize it before importing any other modules. The SDK monkey-patches Node.js core modules (http, https, etc.) to automatically track outbound calls. If you import modules first, those imports happen before the patching, and auto-collection will not work for those modules.

## Step 3: Initialize Application Insights

Create the initialization at the very top of your application entry point:

```javascript
// app.js or index.js - This MUST be the first import
const appInsights = require('applicationinsights');

// Configure and start Application Insights
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoCollectRequests(true)         // Track incoming HTTP requests
    .setAutoCollectPerformance(true)      // Track CPU, memory, event loop metrics
    .setAutoCollectExceptions(true)       // Track unhandled exceptions
    .setAutoCollectDependencies(true)     // Track outbound HTTP, SQL, Redis calls
    .setAutoCollectConsole(true)          // Track console.log, console.error
    .setUseDiskRetryCaching(true)         // Buffer telemetry to disk if upload fails
    .setAutoCollectPreAggregatedMetrics(true)  // Collect pre-aggregated metrics
    .setSendLiveMetrics(true)             // Enable live metrics stream
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .start();

// Set the cloud role name for this service
appInsights.defaultClient.context.tags[
    appInsights.defaultClient.context.keys.cloudRole
] = 'my-node-api';

// Now import the rest of your application
const express = require('express');
const app = express();
```

Store the connection string in an environment variable, not in your code. On Azure App Service, set it in the Application Settings. For local development, use a .env file.

## Step 4: Track Custom Events and Metrics

Auto-collection handles the basics, but custom telemetry lets you track business-specific events and metrics.

```javascript
const client = appInsights.defaultClient;

// Track a custom event when a user completes a purchase
function trackPurchase(order) {
    client.trackEvent({
        name: 'PurchaseCompleted',
        properties: {
            orderId: order.id,
            paymentMethod: order.paymentMethod,
            itemCount: order.items.length.toString()
        },
        measurements: {
            orderTotal: order.total,
            processingTimeMs: order.processingTime
        }
    });
}

// Track a custom metric for queue depth
function trackQueueDepth(queueName, depth) {
    client.trackMetric({
        name: 'QueueDepth',
        value: depth,
        properties: {
            queueName: queueName
        }
    });
}

// Track an exception with additional context
function trackError(error, context) {
    client.trackException({
        exception: error,
        properties: {
            userId: context.userId,
            endpoint: context.endpoint,
            requestBody: JSON.stringify(context.body).substring(0, 1000)
        }
    });
}
```

## Step 5: Add Request Context with Middleware

For Express applications, you can add middleware that enriches telemetry with additional context:

```javascript
// Middleware to add custom properties to all telemetry for the current request
app.use((req, res, next) => {
    // Get the Application Insights correlation context
    const correlationContext = appInsights.getCorrelationContext();

    if (correlationContext) {
        // Add custom properties that will appear on all telemetry for this request
        correlationContext.customProperties.setProperty('userId', req.headers['x-user-id'] || 'anonymous');
        correlationContext.customProperties.setProperty('tenantId', req.headers['x-tenant-id'] || 'default');
    }

    next();
});

// Example route that generates telemetry
app.get('/api/orders/:id', async (req, res) => {
    try {
        // This HTTP call is automatically tracked as a dependency
        const response = await fetch(`http://inventory-service/api/stock/${req.params.id}`);
        const stock = await response.json();

        // Track a custom event
        appInsights.defaultClient.trackEvent({
            name: 'OrderLookup',
            properties: { orderId: req.params.id }
        });

        res.json({ orderId: req.params.id, stock });
    } catch (error) {
        // Exceptions are auto-collected, but you can add context
        appInsights.defaultClient.trackException({
            exception: error,
            properties: { orderId: req.params.id }
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

## Step 6: Configure Sampling

In production, high-traffic applications can generate enormous volumes of telemetry. Sampling reduces the data volume while preserving statistical accuracy.

```javascript
// Configure fixed-rate sampling
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .start();

// Set sampling percentage - keep 25% of telemetry
appInsights.defaultClient.config.samplingPercentage = 25;
```

Application Insights also supports adaptive sampling that adjusts the rate based on traffic volume. For most Node.js applications, fixed-rate sampling at 10-50% is a good starting point for production workloads.

Be aware that sampling applies to requests, dependencies, and traces. Exceptions and custom metrics are not sampled by default, so you always see all exceptions.

## Step 7: Track Dependencies Manually

While Application Insights auto-tracks HTTP dependencies and common database drivers, some calls need manual tracking. This is common for custom protocols, gRPC calls, or third-party SDKs that do not use the standard Node.js HTTP module.

```javascript
// Manually track a dependency call to a third-party service
async function callExternalService(payload) {
    const startTime = Date.now();
    let success = true;
    let resultCode = '200';

    try {
        const result = await someCustomSDK.call(payload);
        return result;
    } catch (error) {
        success = false;
        resultCode = error.code || '500';
        throw error;
    } finally {
        // Track the dependency call
        appInsights.defaultClient.trackDependency({
            target: 'external-payment-gateway',
            name: 'ProcessPayment',
            data: 'POST /v1/charges',
            duration: Date.now() - startTime,
            resultCode: resultCode,
            success: success,
            dependencyTypeName: 'HTTP'
        });
    }
}
```

## Step 8: Use with TypeScript

If your Node.js application uses TypeScript, the setup is identical. The Application Insights package includes type definitions.

```typescript
// app.ts - TypeScript setup
import * as appInsights from 'applicationinsights';

appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING!)
    .setAutoCollectRequests(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectExceptions(true)
    .start();

// Type-safe custom telemetry
const client: appInsights.TelemetryClient = appInsights.defaultClient;

interface OrderEvent {
    orderId: string;
    total: number;
    itemCount: number;
}

function trackOrder(order: OrderEvent): void {
    client.trackEvent({
        name: 'OrderPlaced',
        properties: {
            orderId: order.orderId,
            itemCount: order.itemCount.toString()
        },
        measurements: {
            orderTotal: order.total
        }
    });
}
```

## Step 9: Configure for Different Environments

Use different Application Insights resources for development, staging, and production:

```javascript
// Environment-specific configuration
const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

if (connectionString) {
    appInsights.setup(connectionString)
        .setAutoCollectRequests(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectExceptions(true)
        .start();

    // Adjust sampling based on environment
    if (process.env.NODE_ENV === 'production') {
        appInsights.defaultClient.config.samplingPercentage = 25;
    } else {
        // Collect everything in non-production environments
        appInsights.defaultClient.config.samplingPercentage = 100;
    }

    console.log('Application Insights initialized');
} else {
    console.log('Application Insights connection string not configured, telemetry disabled');
}
```

## Step 10: Verify Data in the Portal

After deploying your application, verify that data is flowing:

1. Go to your Application Insights resource in the Azure Portal
2. Check Live Metrics - you should see requests coming in real-time
3. Go to Transaction Search to see individual requests and dependencies
4. Check the Application Map to see your service and its dependencies
5. Go to Failures to see any tracked exceptions

Common issues if data is not appearing:

- **Connection string is wrong or missing**: Check your environment variables
- **SDK initialized too late**: Make sure `require('applicationinsights')` is the first import
- **Firewall blocking**: Application Insights sends data to `dc.services.visualstudio.com`. Make sure this is not blocked.
- **Sampling too aggressive**: If sampling is set to 1%, you might not see data in low-traffic environments

## Querying Your Node.js Telemetry

Once data flows in, you can write KQL queries to analyze it:

```kql
// Find the slowest API endpoints in the last hour
requests
| where timestamp > ago(1h)
| where cloud_RoleName == "my-node-api"
| summarize AvgDuration = avg(duration), P95 = percentile(duration, 95),
            Count = count() by name
| where Count > 10
| order by P95 desc
```

## Summary

Setting up Application Insights for a Node.js application takes about 15 minutes and gives you immediate visibility into request performance, dependencies, exceptions, and custom business metrics. The critical points are initializing the SDK before other imports, setting a meaningful cloud role name, and configuring appropriate sampling for production. From there, you have a solid foundation for monitoring your Node.js services in Azure.
