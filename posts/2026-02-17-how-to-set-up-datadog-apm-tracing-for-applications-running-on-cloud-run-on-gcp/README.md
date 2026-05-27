# How to Set Up Datadog APM Tracing for Applications Running on Cloud Run on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Datadog, APM, Tracing, Observability

Description: A hands-on guide to instrumenting Cloud Run applications with Datadog APM tracing for distributed performance visibility on Google Cloud.

---

Cloud Run is great for running containers without managing infrastructure, but the serverless nature makes observability tricky. You cannot install a sidecar agent the same way you would on Kubernetes, and the ephemeral container lifecycle means traditional monitoring approaches need adjustment. Datadog APM tracing on Cloud Run requires a different setup compared to GKE or Compute Engine, and this guide covers exactly how to get it working.

## The Challenge with Cloud Run

On GKE, you deploy the Datadog Agent as a DaemonSet that runs on every node. Your application sends traces to the agent running on the same node. On Cloud Run, there is no persistent host and no DaemonSet. Each container instance is isolated and may be shut down at any time.

There are two approaches to solve this:

1. Run Datadog's `serverless-init` sidecar container in your Cloud Run service (supported since Cloud Run added multi-container support).
2. Use Datadog's in-container instrumentation, which wraps your application container with `serverless-init`.

The sidecar approach is preferred when you have multiple containers in a single service, want stricter isolation between Datadog and your application container, or are running performance-sensitive workloads. The in-container approach is simpler and has lower cost overhead because it does not add a second Cloud Run container.

## Setting Up the Datadog Sidecar

Cloud Run supports multi-container deployments where you can run Datadog's `serverless-init` sidecar alongside your application container. Here is how to set it up.

First, create a Cloud Run service definition that includes both containers.

```yaml
# cloud-run-service.yaml

# Deploys app container with Datadog serverless-init sidecar for APM tracing
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-traced-app
spec:
  template:
    metadata:
      annotations:
        # Allow the sidecar to start before the main container
        run.googleapis.com/container-dependencies: '{"my-app":["datadog-sidecar"]}'
    spec:
      containers:
        # Your application container
        - name: my-app
          image: gcr.io/my-project/my-app:latest
          ports:
            - containerPort: 8080
          env:
            # Tell the Datadog tracer where to send traces
            - name: DD_AGENT_HOST
              value: "localhost"
            - name: DD_TRACE_AGENT_PORT
              value: "8126"
            - name: DD_TRACE_ENABLED
              value: "true"
            - name: DD_ENV
              value: "production"
            - name: DD_SERVICE
              value: "my-traced-app"
            - name: DD_VERSION
              value: "1.0.0"
          resources:
            limits:
              memory: "512Mi"
              cpu: "1"
          startupProbe:
            tcpSocket:
              port: 8080
            periodSeconds: 10
            timeoutSeconds: 1
            failureThreshold: 3

        # Datadog serverless-init sidecar container
        - name: datadog-sidecar
          image: gcr.io/datadoghq/serverless-init:1
          env:
            - name: DD_API_KEY
              value: "YOUR_DATADOG_API_KEY"
            - name: DD_SITE
              value: "datadoghq.com"
            - name: DD_ENV
              value: "production"
            - name: DD_SERVICE
              value: "my-traced-app"
            - name: DD_VERSION
              value: "1.0.0"
            - name: DD_HEALTH_PORT
              value: "12345"
            - name: DD_LOG_LEVEL
              value: "warn"
          resources:
            limits:
              memory: "512Mi"
              cpu: "1"
          startupProbe:
            tcpSocket:
              port: 12345
            periodSeconds: 10
            timeoutSeconds: 1
            failureThreshold: 3
```

Deploy this service using gcloud.

```bash
# Deploy the Cloud Run service with the Datadog sidecar
gcloud run services replace cloud-run-service.yaml \
  --region=us-central1
```

## Instrumenting Your Application

The Datadog sidecar handles transport, but your application code needs to generate traces. Here is how to instrument applications in common languages.

### Python with ddtrace

Install the tracing library and configure it to send traces to the local agent.

```python
# app.py
# Flask application with Datadog APM tracing enabled
from ddtrace import tracer, patch_all
from flask import Flask, jsonify
import os

# Patch all supported libraries (requests, flask, sqlalchemy, etc.)
patch_all()

# Configure the tracer with the local sidecar address
tracer.configure(
    hostname=os.getenv("DD_AGENT_HOST", "localhost"),
    port=int(os.getenv("DD_TRACE_AGENT_PORT", 8126)),
)

app = Flask(__name__)

def fetch_users_from_db():
    return [{"id": 1, "name": "Ada"}]

@app.route("/api/users")
def get_users():
    # This request is automatically traced by ddtrace's Flask integration
    # You can add custom spans for more granular visibility
    with tracer.trace("database.query", service="my-traced-app") as span:
        span.set_tag("query.type", "select")
        users = fetch_users_from_db()
    return jsonify(users)

@app.route("/health")
def health():
    return "ok", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

The Dockerfile needs to include the ddtrace package.

```dockerfile
# Dockerfile for the Python app with Datadog tracing
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use ddtrace-run to auto-instrument the application at startup
CMD ["ddtrace-run", "python", "app.py"]
```

### Node.js with dd-trace

For Node.js applications, the instrumentation pattern is similar.

```javascript
// tracing.js
// Initialize Datadog tracing - this must be required before any other modules
const tracer = require('dd-trace').init({
  service: process.env.DD_SERVICE || 'my-traced-app',
  env: process.env.DD_ENV || 'production',
  version: process.env.DD_VERSION || '1.0.0',
  // Send traces to the sidecar agent
  hostname: process.env.DD_AGENT_HOST || 'localhost',
  port: parseInt(process.env.DD_TRACE_AGENT_PORT, 10) || 8126,
});

module.exports = tracer;
```

```javascript
// app.js
// Require tracing before anything else to ensure all modules are instrumented
require('./tracing');

const express = require('express');
const app = express();

async function fetchData() {
  return { status: 'ok' };
}

app.get('/api/data', async (req, res) => {
  // Express routes are automatically traced
  const data = await fetchData();
  res.json(data);
});

app.listen(8080, () => {
  console.log('Server running on port 8080');
});
```

## Storing the API Key Securely

Hardcoding the Datadog API key in your service definition is not safe for production. Use Google Secret Manager instead.

```bash
# Store the Datadog API key in Secret Manager
echo -n "YOUR_DATADOG_API_KEY" | gcloud secrets create datadog-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Grant the Cloud Run service account access to the secret
gcloud secrets add-iam-policy-binding datadog-api-key \
  --member="serviceAccount:YOUR_CLOUD_RUN_SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

Then reference the secret in your Cloud Run service.

```yaml
# Updated env section for the Datadog sidecar container
env:
  - name: DD_API_KEY
    valueFrom:
      secretKeyRef:
        name: datadog-api-key
        key: latest
```

## Verifying Traces are Flowing

After deploying, send some traffic to your service and check the Datadog APM page.

```bash
# Send a few requests to generate traces
for i in $(seq 1 10); do
  curl -s https://my-traced-app-xyz.a.run.app/api/users
  sleep 1
done
```

In the Datadog UI, navigate to APM > Traces. You should see traces appearing within a minute or two. Each trace shows the full request lifecycle including any downstream calls your application makes.

## Adding Custom Tags and Metadata

Enrich your traces with Cloud Run-specific metadata to make debugging easier.

```python
# Add Cloud Run metadata to every trace
import os
from ddtrace import tracer

# Set global tags that appear on all traces from this service
tracer.set_tags({
    "cloud_run.service": os.getenv("K_SERVICE", "unknown"),
    "cloud_run.revision": os.getenv("K_REVISION", "unknown"),
    "cloud_run.configuration": os.getenv("K_CONFIGURATION", "unknown"),
    "gcp.project": "my-project",
    "gcp.region": "us-central1",
})
```

## Performance Considerations

The Datadog sidecar adds memory and CPU overhead to each Cloud Run instance. Datadog's current sidecar examples allocate 512Mi of memory and 1 vCPU to the `serverless-init` container, so factor that into your Cloud Run limits. If you are running memory-constrained workloads, the in-container approach might make more sense despite its tradeoffs.

Also consider that Cloud Run instances scale to zero. When a new instance starts, both your application and the Datadog sidecar need to initialize. Monitor cold-start times to make sure the sidecar does not add unacceptable latency.

Datadog APM on Cloud Run gives you the same distributed tracing experience you get on traditional infrastructure, just with a slightly different deployment model. The sidecar approach keeps the architecture clean, and the automatic instrumentation libraries mean you get value with minimal code changes.
