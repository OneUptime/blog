# How to Configure Cloud Run CPU Allocation to Always-On for Background Processing Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, CPU Allocation, Background Processing, Google Cloud

Description: Learn how to configure Cloud Run CPU allocation to always-on mode for background processing workloads that need CPU outside of request handling.

---

By default, Cloud Run only allocates CPU to your container while it is actively handling a request. The moment the response is sent, CPU gets throttled. This works great for typical web services, but it is a real problem if you need to do work in the background - processing queues, running scheduled tasks, or maintaining WebSocket connections.

The fix is switching your Cloud Run service to "always-on" CPU allocation. This guide covers when you need it, how to configure it, and what it means for your costs.

## The Default Behavior and Why It Matters

Cloud Run's default CPU allocation model is "CPU only during request processing." Here is what happens in practice:

1. A request arrives at your container
2. Cloud Run allocates CPU to the container
3. Your code processes the request and sends a response
4. CPU gets throttled to nearly zero

This means any background threads, async tasks, or timers essentially freeze between requests. If you have a goroutine processing items from a queue, it stops making progress whenever there are no active HTTP requests. If you are running a WebSocket server, the connection stays open but your code cannot actually do anything on it.

## When You Need Always-On CPU

Here are the most common scenarios where always-on CPU is necessary:

- **Background queue processing**: Your service pulls messages from Pub/Sub or Cloud Tasks and processes them independently of incoming HTTP requests
- **WebSocket servers**: You need to push data to connected clients at any time, not just when a new request comes in
- **Scheduled in-process tasks**: Your application runs cron-like internal schedulers
- **Connection pooling**: You maintain database or cache connections that need periodic keepalive pings
- **Metrics collection**: Background threads that aggregate and ship metrics or traces

## Configuring Always-On CPU

You can set CPU allocation through the gcloud CLI, the Cloud Console, or YAML. Here is each approach.

### Using gcloud CLI

The simplest way is a single flag during deployment:

```bash
# Deploy with always-on CPU allocation
gcloud run deploy my-service \
  --image=us-central1-docker.pkg.dev/MY_PROJECT/my-repo/my-image:latest \
  --region=us-central1 \
  --cpu-always-allocated \
  --min-instances=1
```

The `--cpu-always-allocated` flag is the key piece. Note that I also set `--min-instances=1` because if your service scales to zero, there is no instance to allocate CPU to.

To update an existing service without redeploying:

```bash
# Update an existing service to use always-on CPU
gcloud run services update my-service \
  --region=us-central1 \
  --cpu-always-allocated
```

### Using Service YAML

If you manage your services declaratively, add the CPU allocation annotation:

```yaml
# service.yaml - Cloud Run service with always-on CPU
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-background-service
spec:
  template:
    metadata:
      annotations:
        # Keep CPU allocated even outside request handling
        run.googleapis.com/cpu-throttling: "false"
        # Keep at least one instance warm
        autoscaling.knative.dev/minScale: "1"
    spec:
      containers:
        - image: us-central1-docker.pkg.dev/MY_PROJECT/my-repo/my-image:latest
          ports:
            - containerPort: 8080
          resources:
            limits:
              memory: 512Mi
              cpu: "1"
```

The critical annotation is `run.googleapis.com/cpu-throttling: "false"`. Setting it to false means CPU stays allocated at all times.

Deploy the YAML:

```bash
# Apply the service configuration
gcloud run services replace service.yaml --region=us-central1
```

### Using Terraform

If your infrastructure is in Terraform, the configuration looks like this:

```hcl
# Cloud Run service with always-on CPU allocation
resource "google_cloud_run_v2_service" "background_service" {
  name     = "my-background-service"
  location = "us-central1"

  template {
    # Minimum instances to keep warm
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    containers {
      image = "us-central1-docker.pkg.dev/my-project/my-repo/my-image:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # This controls CPU allocation - false means always-on
        cpu_idle = false
      }

      ports {
        container_port = 8080
      }
    }
  }
}
```

The `cpu_idle = false` setting in the resources block is the Terraform equivalent of disabling CPU throttling.

## Practical Example: Background Queue Processor

Let me walk through a realistic example. Say you have a service that handles HTTP requests and also processes Pub/Sub messages in the background:

```python
# main.py - Service with both HTTP handlers and background processing
import asyncio
import os
from flask import Flask
from google.cloud import pubsub_v1
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)

# Background processor that runs continuously
def process_messages():
    """Pull and process messages from Pub/Sub in the background."""
    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path(
        os.environ["PROJECT_ID"],
        os.environ["SUBSCRIPTION_ID"]
    )

    def callback(message):
        print(f"Processing message: {message.data.decode('utf-8')}")
        # Do your actual processing here
        message.ack()

    # This blocks and continuously pulls messages
    future = subscriber.subscribe(subscription_path, callback=callback)
    print("Background message processor started")
    future.result()  # Blocks forever

@app.route("/health")
def health():
    """Health check endpoint."""
    return "OK", 200

@app.route("/")
def index():
    """Main request handler."""
    return "Service is running with background processing", 200

if __name__ == "__main__":
    # Start background processor in a separate thread
    executor = ThreadPoolExecutor(max_workers=1)
    executor.submit(process_messages)

    # Start the Flask web server
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
```

Without always-on CPU, the `process_messages` function would only make progress while an HTTP request is being handled. With always-on CPU, it runs continuously regardless of incoming traffic.

## Cost Implications

Always-on CPU changes the pricing model. Instead of paying only for request processing time, you pay for the entire time your instance is running. Here is how it breaks down:

- **Default (CPU during requests)**: You are billed per request-second of CPU time. Idle time is free.
- **Always-on CPU**: You are billed for every second the instance is up, whether or not it is handling requests.

The always-on pricing per vCPU-second is lower than the request-based pricing, but you are paying for more seconds. Whether it is cheaper depends on your traffic pattern:

- High, steady traffic: Always-on is usually cheaper because the per-second rate is lower
- Sporadic, bursty traffic: Request-based is usually cheaper because you do not pay for idle time
- Background processing: Always-on is the only option that works correctly

Combine always-on CPU with `min-instances` wisely. Every minimum instance costs money 24/7.

## Monitoring CPU Usage

Once you switch to always-on, monitor your actual CPU utilization to make sure you are not over-provisioned:

```bash
# Check CPU utilization metrics for your service
gcloud monitoring metrics list \
  --filter='metric.type="run.googleapis.com/container/cpu/utilizations"'
```

You can also set up alerts in Cloud Monitoring to notify you if CPU utilization is consistently low, which would indicate you are paying for idle resources.

## Combining with Minimum Instances

Always-on CPU is most useful when paired with minimum instances. Without minimum instances, your service can still scale to zero, and there is no instance to keep CPU allocated to:

```bash
# Set both always-on CPU and minimum instances
gcloud run services update my-service \
  --region=us-central1 \
  --cpu-always-allocated \
  --min-instances=1 \
  --max-instances=20
```

The minimum instance stays warm and retains CPU, so your background processing never stops. Additional instances scale up based on traffic and also get always-on CPU.

## Switching Back to Default

If you decide always-on CPU is not right for your workload, you can switch back:

```bash
# Revert to default CPU allocation (only during requests)
gcloud run services update my-service \
  --region=us-central1 \
  --no-cpu-always-allocated
```

Or update the YAML annotation:

```yaml
# Set CPU throttling back to true (default behavior)
run.googleapis.com/cpu-throttling: "true"
```

## Summary

Always-on CPU allocation on Cloud Run is a straightforward configuration change that makes a big difference for background workloads. Set `cpu-throttling` to false, pair it with minimum instances, and your containers will have CPU available at all times. Just keep an eye on costs since you are paying for uptime rather than just request time.

For most web APIs that only respond to HTTP requests, the default CPU allocation is fine and cheaper. But the moment you need background processing, WebSockets, or any work that happens outside the request lifecycle, always-on CPU is the way to go.
