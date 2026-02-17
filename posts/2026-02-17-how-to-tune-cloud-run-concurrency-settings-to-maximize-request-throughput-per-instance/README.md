# How to Tune Cloud Run Concurrency Settings to Maximize Request Throughput Per Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Concurrency, Performance, Serverless

Description: A practical guide to tuning Cloud Run concurrency settings to handle more requests per instance, reduce cold starts, and lower costs.

---

Cloud Run is one of the easiest ways to deploy containerized applications on GCP. But if you leave the concurrency settings at their defaults without thinking about your workload, you might end up paying more than necessary or hitting performance bottlenecks. The concurrency setting controls how many requests a single container instance handles simultaneously, and getting it right is one of the biggest levers you have for both performance and cost.

## What Concurrency Means in Cloud Run

When a request arrives at Cloud Run, the platform routes it to an available container instance. The concurrency setting determines how many requests can be processed by a single instance at the same time. The default is 80, and the maximum is 1000.

If concurrency is set to 1, each instance handles exactly one request at a time. This is the simplest model but also the most expensive because Cloud Run needs to spin up more instances to handle traffic. If concurrency is set to 80, a single instance can handle up to 80 simultaneous requests, meaning you need fewer instances overall.

## When Low Concurrency Makes Sense

Setting concurrency to 1 (or a low number) is appropriate when your application is not thread-safe, uses significant CPU or memory per request, or performs blocking operations that tie up the entire process. Classic examples include image processing, PDF generation, or machine learning inference where each request consumes most of the available resources.

## When High Concurrency Works

Web applications and APIs that spend most of their time waiting on I/O (database queries, external API calls, file reads) can handle many concurrent requests because the CPU is idle most of the time. A Node.js or Python async application that mostly calls external services can comfortably handle 80 to 250 concurrent requests per instance.

## Finding Your Optimal Concurrency

The right concurrency depends on your application's resource profile. Here is how to figure it out systematically.

Start by deploying your service with the default concurrency of 80:

```bash
# Deploy with default concurrency (80)
gcloud run deploy my-service \
  --image gcr.io/my-project/my-service:latest \
  --region us-central1 \
  --concurrency 80 \
  --cpu 2 \
  --memory 512Mi
```

Then load test it. You can use tools like `hey` or `wrk` to generate concurrent traffic:

```bash
# Install hey and run a load test with 100 concurrent users for 30 seconds
hey -n 10000 -c 100 -z 30s https://my-service-abc123-uc.a.run.app/api/endpoint
```

Watch the key metrics during the test:

```bash
# Check instance count and utilization metrics
gcloud monitoring metrics list \
  --filter='metric.type = starts_with("run.googleapis.com/container")'
```

## Adjusting Based on Metrics

After your load test, look at these Cloud Monitoring metrics:

- **Container CPU utilization**: If this consistently exceeds 70 percent at your current concurrency, reduce the concurrency setting. You want headroom for burst traffic.
- **Container memory utilization**: If memory usage climbs with concurrency and approaches the limit, either increase memory or reduce concurrency.
- **Request latency (p99)**: If latency spikes as concurrency increases, your instances are overloaded.
- **Instance count**: Compare this against your concurrency setting to understand the relationship.

Here is a practical flow:

```yaml
# Cloud Run service configuration in YAML format
# Use this with gcloud run services replace
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        # Set max instances to control costs
        autoscaling.knative.dev/maxScale: "100"
        # Set min instances to reduce cold starts
        autoscaling.knative.dev/minScale: "2"
    spec:
      # Concurrency per container instance
      containerConcurrency: 150
      containers:
        - image: gcr.io/my-project/my-service:latest
          resources:
            limits:
              cpu: "2"
              memory: 1Gi
```

## CPU Allocation and Its Impact on Concurrency

Cloud Run gives you two CPU allocation modes: CPU is only allocated during request processing, or CPU is always allocated. This significantly affects concurrency behavior.

```bash
# Always allocate CPU - better for high concurrency workloads
# that do background processing between requests
gcloud run deploy my-service \
  --image gcr.io/my-project/my-service:latest \
  --cpu-throttling \
  --concurrency 200
```

With "CPU only during requests," your container gets CPU time only when actively handling a request. At high concurrency, this can lead to CPU contention. With "CPU always allocated," your container can use CPU even between requests, which helps with connection pooling, background tasks, and warming caches.

For high-concurrency services, I recommend "CPU always allocated" because it gives your application more consistent performance under load.

## Concurrency and Memory Relationship

Each concurrent request consumes memory. You need to estimate the per-request memory overhead and multiply by your concurrency target, then add your application's base memory usage.

```
total_memory = base_memory + (per_request_memory * concurrency)
```

For example, if your Go API server uses 50MB at rest and each request needs about 2MB for processing:

```
# For concurrency of 150:
total_memory = 50MB + (2MB * 150) = 350MB
# Set memory limit to ~512Mi for headroom
```

```bash
# Deploy with calculated memory and concurrency
gcloud run deploy my-api \
  --image gcr.io/my-project/my-api:latest \
  --memory 512Mi \
  --cpu 2 \
  --concurrency 150
```

## Startup Probe and Concurrency

When Cloud Run scales up new instances, it does not send traffic until the instance is ready. If your application takes time to start (loading models, warming caches, establishing database connections), use startup probes to signal readiness.

```yaml
# Configure startup probe so Cloud Run knows when to send traffic
spec:
  containers:
    - image: gcr.io/my-project/my-service:latest
      startupProbe:
        httpGet:
          path: /healthz
          port: 8080
        initialDelaySeconds: 2
        periodSeconds: 3
        failureThreshold: 10
```

This prevents Cloud Run from routing requests to instances that are not yet ready, which would inflate latency during scale-up events.

## Practical Concurrency Guidelines by Language

Different runtimes handle concurrency differently. Here are some starting points:

For **Node.js** (single-threaded event loop): Start with concurrency 80-200. Node handles I/O concurrency well, but CPU-bound work blocks the event loop. If your handlers are mostly async I/O, push toward 200.

For **Go** (goroutines): Start with concurrency 200-500. Go handles concurrency natively and efficiently. Most Go web services can handle high concurrency per instance.

For **Python (Flask/Django)**: Start with concurrency 5-20 per worker. Use gunicorn with multiple workers. Total concurrency equals workers times threads.

For **Python (FastAPI/async)**: Start with concurrency 50-150. Async Python handles I/O concurrency much better than sync frameworks.

For **Java (Spring Boot)**: Start with concurrency 50-200. Java thread pools handle concurrency well but use more memory per thread.

## Monitoring and Iterating

After deploying with your chosen concurrency, set up alerts:

```bash
# Create an alert for high CPU utilization that might indicate
# concurrency is too high for your workload
gcloud monitoring policies create \
  --notification-channels="projects/my-project/notificationChannels/123" \
  --display-name="Cloud Run CPU Alert" \
  --condition-display-name="High CPU" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/container/cpu/utilizations"' \
  --condition-threshold-value=0.8 \
  --condition-threshold-duration=300s
```

The tuning process is iterative. Start with a reasonable default, load test, observe metrics, adjust, and repeat. The goal is to find the highest concurrency your instances can handle while keeping p99 latency acceptable and CPU utilization under 70 percent. That sweet spot gives you maximum throughput per instance, which directly translates to lower costs on Cloud Run.
