# How to Deploy Serverless Functions on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Serverless, Function, Kubernetes, OpenFaaS, Knative

Description: Deploy serverless functions on Rancher with a practical comparison of frameworks, function lifecycle management, and production deployment patterns.

## Introduction

Serverless functions on Kubernetes abstract away pod management, routing, and scaling. This guide covers practical function deployment using OpenFaaS, a comparison of available frameworks, and patterns for production-grade function management in Rancher.

## Framework Comparison

| Framework | Cold Start | Scale-to-Zero | Language Support | Best For |
|---|---|---|---|---|
| Knative | Medium | Yes | Any | HTTP workloads |
| OpenFaaS | Fast | Yes (Pro/Edge) | Any | General purpose |
| Fission | Low with poolmgr | Yes with newdeploy minscale 0 | 8+ languages | Latency-sensitive |
| KEDA Jobs | N/A | Yes | Any | Batch processing |

## Step 1: Prepare Your Function

Write a function with a clear contract:

```python
# handler.py

import io

from flask import Flask, jsonify, request
from PIL import Image
from waitress import serve

app = Flask(__name__)

@app.post("/")
def handle():
    """Process an image and return metadata."""
    try:
        # Read raw image bytes from request body
        img = Image.open(io.BytesIO(request.get_data()))

        result = {
            "width": img.width,
            "height": img.height,
            "format": img.format,
            "mode": img.mode
        }

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=5000)
```

## Step 2: Package as a Dockerfile

```dockerfile
# Use the OpenFaaS of-watchdog to proxy the Python HTTP server
FROM --platform=${TARGETPLATFORM:-linux/amd64} ghcr.io/openfaas/of-watchdog:0.11.5 AS watchdog

FROM --platform=${TARGETPLATFORM:-linux/amd64} python:3.11-slim
COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

WORKDIR /home/app
COPY requirements.txt .
# requirements.txt should include flask, pillow, and waitress
RUN pip install --no-cache-dir -r requirements.txt

COPY handler.py .

ENV fprocess="python handler.py"
ENV mode="http"
ENV upstream_url="http://127.0.0.1:5000"
ENV cgi_headers="true"

HEALTHCHECK --interval=5s CMD [ -e /tmp/.lock ] || exit 1
CMD ["fwatchdog"]
```

## Step 3: Deploy and Configure Routing

```bash
# Deploy with OpenFaaS
faas-cli deploy \
  --image myregistry/process-image:latest \
  --name process-image \
  --gateway http://127.0.0.1:8080 \
  --fprocess "python handler.py" \
  --memory-limit 256Mi \
  --cpu-limit 250m \
  --env max_inflight=10 \
  --label com.openfaas.scale.max=10 \
  --label com.openfaas.scale.zero=true \
  --label com.openfaas.scale.zero-duration=10m
```

## Step 4: Implement Function Versioning

```bash
# Deploy with version tag for blue/green testing
faas-cli deploy \
  --image myregistry/process-image:v2.0 \
  --name process-image-v2 \
  --gateway http://127.0.0.1:8080 \
  --fprocess "python handler.py"

# Test v2 before promoting
curl -X POST http://127.0.0.1:8080/function/process-image-v2 \
  --data-binary @test-image.jpg

# Promote v2 to production by updating the production function or external routing layer
```

## Step 5: Configure Timeouts and Retries

```yaml
# Function configuration with production settings
annotations:
  com.openfaas.retry.attempts: "3"      # Async retry attempts with OpenFaaS Pro queue-worker
  com.openfaas.retry.codes: "429,500,502,503,504"
  com.openfaas.retry.min_wait: "5s"
  com.openfaas.retry.max_wait: "1m"
  com.openfaas.queue: "image-processor" # Dedicated async queue name

environment:
  max_inflight: "10"                    # Concurrent requests per replica
  exec_timeout: "30s"
  write_timeout: "31s"
  read_timeout: "31s"
```

## Step 6: Monitor Function Performance

```bash
# View function metrics
faas-cli list --gateway http://127.0.0.1:8080 | grep process-image

# Check invocation count and replica count
```

## Conclusion

Serverless functions on Rancher provide a developer-friendly abstraction over Kubernetes pods while retaining full container customization. The choice of framework depends on your latency requirements and language preferences. OpenFaaS is the most practical starting point for teams new to serverless on Kubernetes.
