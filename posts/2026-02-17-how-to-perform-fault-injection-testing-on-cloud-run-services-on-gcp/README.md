# How to Perform Fault Injection Testing on Cloud Run Services on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Fault Injection, Chaos Engineering, Resilience Testing, SRE

Description: Learn how to perform fault injection testing on Cloud Run services using traffic splitting, middleware-based injection, and external fault injection tools on GCP.

---

Cloud Run is a managed serverless platform, which means you do not have access to the underlying infrastructure. You cannot SSH into a machine and kill a process. You cannot corrupt a disk or unplug a network cable. But you still need to test how your Cloud Run services behave when things go wrong - slow dependencies, failed database connections, corrupted payloads, and resource exhaustion.

Fault injection testing on Cloud Run requires a different approach than traditional chaos engineering. Instead of breaking the infrastructure, you inject faults at the application layer. This post covers several practical techniques for doing that.

## Why Fault Injection on Cloud Run

Cloud Run handles many infrastructure-level failures for you - it restarts crashed containers, scales up during traffic spikes, and load balances across healthy instances. But it cannot protect you from application-level issues:

- What happens when your database connection times out?
- How does your service handle a slow upstream dependency?
- Does your service gracefully degrade when a cache is unavailable?
- What happens when you receive malformed requests?

These are the questions fault injection answers.

## Technique 1: Application-Level Fault Injection Middleware

The most portable approach is to build fault injection directly into your application using middleware. When a specific header or environment variable is set, the middleware introduces delays, errors, or failures.

Here is a Python example using Flask:

```python
import os
import time
import random
from flask import Flask, request, jsonify
from functools import wraps

app = Flask(__name__)

def fault_injection_middleware(f):
    """Middleware that injects faults based on request headers.

    Headers:
    - X-Fault-Delay: Adds latency in milliseconds
    - X-Fault-Error: Returns an error with the specified status code
    - X-Fault-Abort-Percent: Percentage chance of aborting the request
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Only enable fault injection in non-production or when explicitly enabled
        if os.environ.get("ENABLE_FAULT_INJECTION") != "true":
            return f(*args, **kwargs)

        # Inject latency
        delay_ms = request.headers.get("X-Fault-Delay")
        if delay_ms:
            delay_seconds = int(delay_ms) / 1000.0
            time.sleep(delay_seconds)

        # Inject errors
        error_code = request.headers.get("X-Fault-Error")
        if error_code:
            return jsonify({"error": "Injected fault", "code": int(error_code)}), int(error_code)

        # Random abort
        abort_percent = request.headers.get("X-Fault-Abort-Percent")
        if abort_percent and random.randint(1, 100) <= int(abort_percent):
            return jsonify({"error": "Random fault injection"}), 503

        return f(*args, **kwargs)
    return decorated_function


@app.route("/api/orders", methods=["GET"])
@fault_injection_middleware
def get_orders():
    """Return a list of orders."""
    # Normal business logic here
    orders = [
        {"id": 1, "status": "shipped"},
        {"id": 2, "status": "processing"},
    ]
    return jsonify(orders)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint - no fault injection here."""
    return jsonify({"status": "healthy"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
```

Deploy this with fault injection enabled in your staging environment:

```bash
# Deploy to Cloud Run with fault injection enabled in staging
gcloud run deploy order-service \
  --image=gcr.io/my-project/order-service:latest \
  --set-env-vars=ENABLE_FAULT_INJECTION=true \
  --region=us-central1 \
  --project=my-project \
  --tag=staging
```

Now you can inject faults by adding headers to your requests:

```bash
# Inject 500ms of latency
curl -H "X-Fault-Delay: 500" https://order-service-xyz.run.app/api/orders

# Force a 503 error
curl -H "X-Fault-Error: 503" https://order-service-xyz.run.app/api/orders

# 50% chance of failure
curl -H "X-Fault-Abort-Percent: 50" https://order-service-xyz.run.app/api/orders
```

## Technique 2: Traffic Splitting for Canary Fault Testing

Cloud Run supports traffic splitting between revisions. You can deploy a "faulty" version of your service and send a small percentage of traffic to it:

```bash
# Deploy a version with artificial faults
gcloud run deploy order-service \
  --image=gcr.io/my-project/order-service:faulty \
  --set-env-vars=FAULT_MODE=slow_responses \
  --region=us-central1 \
  --no-traffic \
  --tag=fault-test \
  --project=my-project

# Send 5% of traffic to the faulty version
gcloud run services update-traffic order-service \
  --to-tags=fault-test=5 \
  --region=us-central1 \
  --project=my-project
```

This lets you observe how your downstream services handle degraded responses from a dependency, how your load balancer and retry logic cope with partial failures, and whether your monitoring detects the degradation.

After testing, route all traffic back:

```bash
# Roll back all traffic to the stable version
gcloud run services update-traffic order-service \
  --to-latest \
  --region=us-central1 \
  --project=my-project
```

## Technique 3: Dependency Fault Injection with a Proxy

For testing how your Cloud Run service handles dependency failures (database, external APIs, cache), use a proxy that can inject faults between your service and its dependencies.

Here is a simple fault injection proxy using Node.js:

```javascript
// fault-proxy.js - A proxy that injects faults into upstream requests
const express = require("express");
const httpProxy = require("http-proxy");

const app = express();
const proxy = httpProxy.createProxyServer({});

// Configuration from environment variables
const TARGET_URL = process.env.TARGET_URL || "http://real-database:5432";
const FAULT_LATENCY_MS = parseInt(process.env.FAULT_LATENCY_MS || "0");
const FAULT_ERROR_RATE = parseFloat(process.env.FAULT_ERROR_RATE || "0");

app.all("*", (req, res) => {
  // Inject random errors based on configured rate
  if (Math.random() < FAULT_ERROR_RATE) {
    console.log(`Injecting error for request to ${req.url}`);
    return res.status(503).json({ error: "Injected dependency failure" });
  }

  // Inject latency
  if (FAULT_LATENCY_MS > 0) {
    console.log(`Injecting ${FAULT_LATENCY_MS}ms latency for ${req.url}`);
    setTimeout(() => {
      proxy.web(req, res, { target: TARGET_URL });
    }, FAULT_LATENCY_MS);
    return;
  }

  // Pass through normally
  proxy.web(req, res, { target: TARGET_URL });
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Fault injection proxy running on port ${PORT}`);
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Latency: ${FAULT_LATENCY_MS}ms`);
  console.log(`Error rate: ${FAULT_ERROR_RATE * 100}%`);
});
```

Deploy the proxy as a sidecar or separate Cloud Run service and point your application at it during testing.

## Technique 4: Load Testing with Fault Conditions

Combine fault injection with load testing to see how your service behaves under stress with degraded dependencies. Use a load testing tool like Locust:

```python
# locustfile.py - Load test with fault injection headers
from locust import HttpUser, task, between

class FaultInjectionUser(HttpUser):
    """Load test user that includes fault injection headers."""
    wait_time = between(0.5, 2)
    host = "https://order-service-xyz.run.app"

    @task(7)
    def normal_request(self):
        """70% of requests are normal."""
        self.client.get("/api/orders")

    @task(2)
    def slow_request(self):
        """20% of requests inject 2 seconds of latency."""
        self.client.get(
            "/api/orders",
            headers={"X-Fault-Delay": "2000"},
        )

    @task(1)
    def error_request(self):
        """10% of requests force a 500 error."""
        self.client.get(
            "/api/orders",
            headers={"X-Fault-Error": "500"},
        )
```

Run the load test:

```bash
# Run Locust with 100 concurrent users
locust -f locustfile.py --headless -u 100 -r 10 --run-time 5m
```

## Monitoring During Fault Injection

During fault injection testing, keep a close eye on Cloud Monitoring. Check these metrics:

- Request latency (P50, P95, P99) - does it spike?
- Error rate - does it match your injected fault rate?
- Instance count - does Cloud Run scale up to handle the load?
- Container startup latency - are new instances starting fast enough?

```bash
# Watch Cloud Run metrics in real time
gcloud run services describe order-service \
  --region=us-central1 \
  --format="table(status.traffic[].percent, status.traffic[].revisionName)" \
  --project=my-project
```

## Documenting Findings

After each fault injection test, document what you found. Use this template:

```
Test: [Description of the fault injected]
Date: [Date of the test]
Duration: [How long the test ran]
Findings:
  - [What worked well]
  - [What broke]
  - [Unexpected behavior]
Action items:
  - [What to fix or improve]
```

## Summary

Fault injection testing on Cloud Run requires creativity since you cannot break the underlying infrastructure. Application-level middleware, traffic splitting, dependency proxies, and load testing with fault headers all give you different angles on resilience. The key is to test the failure modes that matter most to your users - slow responses, error responses, and dependency failures. Run these tests regularly in staging, fix the issues you find, and your production service will be much more resilient for it.
