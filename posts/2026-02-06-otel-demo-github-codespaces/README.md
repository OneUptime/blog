# How to Run the OpenTelemetry Demo Application in GitHub Codespaces for Hands-On Learning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GitHub Codespaces, Demo Application, Learning, Cloud Development

Description: Run the official OpenTelemetry demo application in GitHub Codespaces to explore distributed tracing without any local setup.

The OpenTelemetry project maintains a demo application that showcases instrumentation across multiple languages and services. It is one of the best ways to learn how OpenTelemetry works in practice. Running it in GitHub Codespaces means you do not need Docker Desktop or a powerful local machine. Everything runs in the cloud, and you get a fully functional environment in minutes.

## Forking the Demo Repository

Start by forking the official demo repository. Go to [https://github.com/open-telemetry/opentelemetry-demo](https://github.com/open-telemetry/opentelemetry-demo) and click the Fork button. This gives you your own copy that you can experiment with freely.

## Launching a Codespace

From your forked repository on GitHub, click the green "Code" button and select the "Codespaces" tab. Click "Create codespace on main." GitHub will provision a cloud-based development environment and open it in a browser-based VS Code editor.

The default machine type (4-core, 16GB RAM) works for the demo, but if you find it sluggish, you can switch to an 8-core machine. To do this, click the three dots next to "Create codespace" and select "New with options," then pick a larger machine type.

## Building and Running the Demo

Once the Codespace is ready, open the integrated terminal and run:

```bash
# Build all the demo services using Docker Compose
# This takes a few minutes on the first run
docker compose build

# Start all services in detached mode
docker compose up -d
```

The demo includes about a dozen microservices written in Go, Java, Python, .NET, Node.js, and more. Each service is instrumented with OpenTelemetry and sends traces, metrics, and logs to a central collector.

Monitor the startup progress:

```bash
# Watch the logs to see services starting up
docker compose logs -f --tail=50
```

Wait until you see all services reporting as healthy. This usually takes 2 to 3 minutes.

## Accessing the UI Components

GitHub Codespaces automatically detects and forwards ports. You will see notifications for exposed ports. The key ports to access are:

- **Port 8080** - The demo storefront (a web shop you can interact with)
- **Port 16686** - Jaeger UI for viewing traces
- **Port 9090** - Prometheus for metrics
- **Port 3000** - Grafana dashboards

Click on the port forwarding notification or go to the Ports tab in the terminal panel. Click the globe icon next to a port to open it in your browser.

```bash
# If you need to manually check which ports are exposed
docker compose ps --format "table {{.Service}}\t{{.Ports}}"
```

## Exploring Traces in Jaeger

Open the Jaeger UI on port 16686. In the Service dropdown, you will see all the demo services listed. Select one, like `frontend`, and click "Find Traces." You will see a list of traces showing requests flowing through the system.

Click on any trace to see the full span waterfall. This is where the learning happens. You can see:

- How an HTTP request to the frontend triggers gRPC calls to backend services
- How spans propagate context across service boundaries
- How different languages produce similar span structures thanks to the OpenTelemetry specification

## Generating Traffic

The demo includes a load generator that produces synthetic traffic. If you want to create your own traces, open the storefront on port 8080 and browse around. Add items to your cart and go through the checkout flow. Each action creates a new trace that you can find in Jaeger.

```bash
# Check if the load generator is running
docker compose ps loadgenerator

# If you want to restart it with different settings
docker compose restart loadgenerator
```

## Modifying Instrumentation

This is where Codespaces really shines for learning. Pick a service and modify its instrumentation. For example, open the Node.js currency service and add a custom span:

```javascript
// src/currencyservice/charge.js
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('currency-service');

function convertCurrency(from, to, amount) {
  // Add a custom span to track conversion logic
  return tracer.startActiveSpan('currency.convert', (span) => {
    span.setAttribute('currency.from', from.currencyCode);
    span.setAttribute('currency.to', to);
    span.setAttribute('currency.amount', amount);

    const rate = getExchangeRate(from.currencyCode, to);
    const result = amount * rate;

    span.setAttribute('currency.result', result);
    span.end();
    return result;
  });
}
```

After making changes, rebuild and restart just that service:

```bash
# Rebuild only the currency service
docker compose build currencyservice

# Restart it
docker compose up -d currencyservice
```

Then generate some traffic and look for your new span in Jaeger.

## Resource Considerations

GitHub Codespaces has usage limits depending on your plan. The demo application is resource-intensive because it runs many containers. To conserve your quota:

```bash
# Stop all services when you take a break
docker compose down

# When you come back, start them again
docker compose up -d
```

Also, remember to stop your Codespace when you are not using it. Go to [github.com/codespaces](https://github.com/codespaces) and stop the running instance.

## What to Learn Next

After exploring the demo, try these exercises:

1. Trace a single request from the frontend all the way to the database
2. Find a trace that includes an error and examine the error attributes
3. Compare how the Python and Go services instrument similar operations
4. Look at the collector configuration to understand how data flows from services to backends

The OpenTelemetry demo in Codespaces gives you a risk-free playground to build your understanding of distributed tracing. You can break things, experiment with configurations, and learn at your own pace without worrying about cleaning up your local machine.
