# How to Deploy OpenFaaS on Kubernetes with Auto-Scaling and Async Function Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenFaaS, Serverless

Description: Deploy OpenFaaS serverless platform on Kubernetes with automatic scaling, asynchronous function invocation, and queue-based processing for scalable function execution.

---

OpenFaaS brings serverless functions to Kubernetes with a simple deployment model and powerful scaling capabilities. It automatically scales functions based on load, supports asynchronous invocation through message queues, and provides a developer-friendly CLI. This guide walks you through deploying OpenFaaS with auto-scaling and async processing for production workloads.

## Installing OpenFaaS

Deploy OpenFaaS using arkade or Helm:

```bash
# Using arkade (recommended)
curl -sLS https://get.arkade.dev | sudo sh
arkade install openfaas

# Or using Helm
kubectl create namespace openfaas
kubectl create namespace openfaas-fn

helm repo add openfaas https://openfaas.github.io/faas-netes/
helm repo update

helm upgrade --install openfaas openfaas/openfaas \
  --namespace openfaas \
  --set functionNamespace=openfaas-fn \
  --set generateBasicAuth=true

# Get the gateway password
PASSWORD=$(kubectl get secret -n openfaas basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode)
echo "OpenFaaS password: $PASSWORD"

# Port forward to gateway
kubectl port-forward -n openfaas svc/gateway 8080:8080 &
```

Install the OpenFaaS CLI:

```bash
curl -sSL https://cli.openfaas.com | sudo sh

# Login to OpenFaaS
echo -n $PASSWORD | faas-cli login --username admin --password-stdin
```

## Deploying Your First Function

Create a simple function:

```bash
# Create a new function from template
faas-cli new hello-world --lang python3

# This creates:
# - hello-world.yml (function definition)
# - hello-world/handler.py (function code)
# - hello-world/requirements.txt (dependencies)
```

Edit the handler:

```python
# hello-world/handler.py
import json

def handle(req):
    """Handle a function request"""
    data = json.loads(req) if req else {}
    name = data.get("name", "World")

    response = {
        "message": f"Hello, {name}!",
        "status": "success"
    }

    return json.dumps(response)
```

Update the function configuration:

```yaml
# hello-world.yml
version: 1.0
provider:
  name: openfaas
  gateway: http://127.0.0.1:8080

functions:
  hello-world:
    lang: python3
    handler: ./hello-world
    image: your-registry/hello-world:latest
    environment:
      read_timeout: 30s
      write_timeout: 30s
    labels:
      # Enable auto-scaling
      com.openfaas.scale.min: "1"
      com.openfaas.scale.max: "10"
      com.openfaas.scale.factor: "20"
      # Scale to zero (requires faas-idler)
      com.openfaas.scale.zero: "true"
    limits:
      cpu: "100m"
      memory: "128Mi"
    requests:
      cpu: "50m"
      memory: "64Mi"
```

Build, push, and deploy:

```bash
# Build function image
faas-cli build -f hello-world.yml

# Push to registry
faas-cli push -f hello-world.yml

# Deploy to OpenFaaS
faas-cli deploy -f hello-world.yml

# Test the function
echo '{"name": "OpenFaaS"}' | faas-cli invoke hello-world
```

## Configuring Auto-Scaling

OpenFaaS uses Prometheus metrics for auto-scaling. Configure scaling parameters:

```yaml
# function-with-autoscaling.yml
version: 1.0
provider:
  name: openfaas
  gateway: http://127.0.0.1:8080

functions:
  api-processor:
    lang: python3
    handler: ./api-processor
    image: your-registry/api-processor:latest

    # Auto-scaling configuration
    labels:
      # Minimum replicas
      com.openfaas.scale.min: "2"

      # Maximum replicas
      com.openfaas.scale.max: "20"

      # Requests per second target per replica
      com.openfaas.scale.target: "50"

      # Scaling factor (requests per second / target)
      com.openfaas.scale.factor: "20"

      # Type of scaling (rps or cpu)
      com.openfaas.scale.type: "rps"

      # Proportional value (percentage)
      com.openfaas.scale.target-proportion: "0.80"

    # Resource limits
    limits:
      cpu: "500m"
      memory: "512Mi"
    requests:
      cpu: "100m"
      memory: "128Mi"

    # Timeouts
    environment:
      read_timeout: "60s"
      write_timeout: "60s"
      exec_timeout: "60s"
```

Deploy with scaling enabled:

```bash
faas-cli deploy -f function-with-autoscaling.yml

# Watch scaling in action
watch kubectl get pods -n openfaas-fn
```

## Implementing Asynchronous Functions

Configure functions for async invocation:

```yaml
# async-function.yml
version: 1.0
provider:
  name: openfaas
  gateway: http://127.0.0.1:8080

functions:
  email-sender:
    lang: python3
    handler: ./email-sender
    image: your-registry/email-sender:latest

    labels:
      com.openfaas.scale.min: "1"
      com.openfaas.scale.max: "10"

    environment:
      # Configure async
      async_invocation: "true"
      max_inflight: "100"

      # SMTP settings
      smtp_host: "smtp.example.com"
      smtp_port: "587"

    secrets:
      - smtp-credentials
```

Create the function handler:

```python
# email-sender/handler.py
import json
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def handle(req):
    """Send email asynchronously"""
    try:
        data = json.loads(req)

        to_email = data.get("to")
        subject = data.get("subject")
        body = data.get("body")

        # Read SMTP credentials
        with open("/var/openfaas/secrets/smtp-credentials", "r") as f:
            credentials = json.load(f)

        # Send email
        send_email(
            to_email=to_email,
            subject=subject,
            body=body,
            smtp_host=os.getenv("smtp_host"),
            smtp_port=int(os.getenv("smtp_port")),
            username=credentials["username"],
            password=credentials["password"]
        )

        return json.dumps({
            "status": "sent",
            "to": to_email
        })

    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": str(e)
        })

def send_email(to_email, subject, body, smtp_host, smtp_port, username, password):
    """Send email via SMTP"""
    msg = MIMEMultipart()
    msg['From'] = username
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'html'))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(username, password)
        server.send_message(msg)
```

Invoke function asynchronously:

```bash
# Synchronous invocation (waits for response)
curl -X POST http://localhost:8080/function/email-sender \
  -H "Content-Type: application/json" \
  -d '{"to": "user@example.com", "subject": "Test", "body": "Hello"}'

# Asynchronous invocation (returns immediately)
curl -X POST http://localhost:8080/async-function/email-sender \
  -H "Content-Type: application/json" \
  -d '{"to": "user@example.com", "subject": "Test", "body": "Hello"}'
```

## Configuring NATS Streaming for Async Processing

OpenFaaS uses NATS for async invocation. Scale the queue worker:

```bash
# Scale queue-worker for higher throughput
kubectl scale -n openfaas deployment/queue-worker --replicas=5
```

Configure queue settings:

```yaml
# queue-worker-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: queue-worker-config
  namespace: openfaas
data:
  max_inflight: "100"
  ack_wait: "60s"
  max_retry_attempts: "5"
  max_retry_wait: "300s"
```

## Building Long-Running Functions

Create a function that processes large workloads:

```python
# data-processor/handler.py
import json
import time

def handle(req):
    """Process large dataset"""
    data = json.loads(req)
    dataset_id = data.get("dataset_id")
    chunk_size = data.get("chunk_size", 1000)

    total_processed = 0
    start_time = time.time()

    # Simulate processing
    for i in range(0, 100000, chunk_size):
        # Process chunk
        process_chunk(i, chunk_size)
        total_processed += chunk_size

        # Report progress every 10k records
        if total_processed % 10000 == 0:
            elapsed = time.time() - start_time
            rate = total_processed / elapsed
            print(f"Processed {total_processed} records ({rate:.2f} records/sec)")

    duration = time.time() - start_time

    return json.dumps({
        "dataset_id": dataset_id,
        "records_processed": total_processed,
        "duration_seconds": duration,
        "records_per_second": total_processed / duration
    })

def process_chunk(start, size):
    """Process a chunk of data"""
    # Your processing logic here
    time.sleep(0.1)  # Simulate work
```

Configure with appropriate timeouts:

```yaml
# long-running-function.yml
functions:
  data-processor:
    lang: python3
    handler: ./data-processor
    image: your-registry/data-processor:latest

    labels:
      com.openfaas.scale.min: "1"
      com.openfaas.scale.max: "5"

    environment:
      # Longer timeouts for processing
      read_timeout: "300s"
      write_timeout: "300s"
      exec_timeout: "300s"

    limits:
      cpu: "1000m"
      memory: "2Gi"
    requests:
      cpu: "500m"
      memory: "1Gi"
```

## Implementing Function Chaining

Chain functions together:

```python
# orchestrator/handler.py
import json
import requests
import os

GATEWAY_URL = os.getenv("gateway_url", "http://gateway.openfaas:8080")

def handle(req):
    """Orchestrate multiple function calls"""
    data = json.loads(req)
    order_id = data.get("order_id")

    # Step 1: Validate order
    validation_response = invoke_function("validate-order", {
        "order_id": order_id
    })

    if not validation_response.get("valid"):
        return json.dumps({"status": "rejected", "reason": "validation failed"})

    # Step 2: Process payment (async)
    invoke_function_async("process-payment", {
        "order_id": order_id,
        "amount": validation_response.get("amount")
    })

    # Step 3: Send confirmation
    invoke_function_async("send-confirmation", {
        "order_id": order_id,
        "email": validation_response.get("customer_email")
    })

    return json.dumps({
        "status": "processing",
        "order_id": order_id
    })

def invoke_function(function_name, payload):
    """Invoke function synchronously"""
    response = requests.post(
        f"{GATEWAY_URL}/function/{function_name}",
        json=payload
    )
    return response.json()

def invoke_function_async(function_name, payload):
    """Invoke function asynchronously"""
    requests.post(
        f"{GATEWAY_URL}/async-function/{function_name}",
        json=payload
    )
```

## Monitoring Function Performance

Access Prometheus metrics:

```bash
# Port forward to Prometheus
kubectl port-forward -n openfaas svc/prometheus 9090:9090

# View metrics at http://localhost:9090
```

Key metrics to monitor:

- `gateway_function_invocation_total` - Total invocations
- `gateway_functions_seconds` - Function execution time
- `gateway_service_count` - Active replicas
- `http_requests_total` - HTTP request count

Create Grafana dashboard:

```yaml
# grafana-dashboard.json
{
  "dashboard": {
    "title": "OpenFaaS Functions",
    "panels": [
      {
        "title": "Function Invocation Rate",
        "targets": [
          {
            "expr": "rate(gateway_function_invocation_total[5m])"
          }
        ]
      },
      {
        "title": "Function Duration (P99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(gateway_functions_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Active Replicas",
        "targets": [
          {
            "expr": "gateway_service_count"
          }
        ]
      }
    ]
  }
}
```

## Implementing Circuit Breakers

Add resilience with timeouts and retries:

```python
# resilient-function/handler.py
import json
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

def create_session():
    """Create HTTP session with retries"""
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=0.3,
        status_forcelist=[500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

def handle(req):
    """Call external API with circuit breaker"""
    session = create_session()

    try:
        response = session.post(
            "https://api.example.com/process",
            json=json.loads(req),
            timeout=10
        )
        response.raise_for_status()

        return json.dumps({
            "status": "success",
            "data": response.json()
        })

    except requests.exceptions.RequestException as e:
        return json.dumps({
            "status": "error",
            "message": str(e)
        })
```

## Best Practices

Follow these guidelines:

1. **Configure appropriate timeouts** - Match function execution time
2. **Use async for long-running tasks** - Avoid HTTP timeout issues
3. **Scale queue workers** - Handle high async loads
4. **Monitor queue depth** - Detect processing bottlenecks
5. **Implement retries** - Handle transient failures
6. **Use secrets for credentials** - Secure sensitive data
7. **Set resource limits** - Prevent resource exhaustion
8. **Log structured output** - Easier debugging
9. **Version function images** - Enable rollbacks

## Conclusion

OpenFaaS provides a powerful serverless platform on Kubernetes with flexible auto-scaling and async processing capabilities. By properly configuring scaling parameters, using asynchronous invocation for long-running tasks, and monitoring function performance, you build scalable function-as-a-service infrastructure. The combination of Prometheus-based auto-scaling, NATS-backed async invocation, and Kubernetes orchestration creates a robust platform for serverless workloads that automatically adapts to changing load patterns.
