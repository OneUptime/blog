# How to Set Up Health Checks for Backend Services on a GCP Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Load Balancer, Health Checks, Backend Services, Monitoring

Description: A complete guide to configuring health checks for GCP load balancer backend services, covering HTTP, HTTPS, TCP, and gRPC health checks with best practices.

---

Health checks are the nervous system of your load balancer. They continuously probe your backend instances to determine which ones are ready to handle traffic and which ones should be taken out of rotation. Getting health checks right is critical - too aggressive and you will bounce healthy instances in and out of service; too lenient and you will send traffic to broken instances for too long.

This guide covers all the health check types available in GCP, how to configure them properly, and how to troubleshoot when things go wrong.

## How Health Checks Work in GCP

GCP health checks work by sending periodic probes from a set of dedicated IP ranges to your backend instances. Each probe checks a specific protocol, port, and path. Based on the responses, the health check system marks each instance as healthy or unhealthy.

Key details:
- Health check probes come from the IP ranges `130.211.0.0/22` and `35.191.0.0/16`
- Each instance is probed independently
- The health check system is distributed, so multiple probers check each instance simultaneously
- Probes are sent from the same region as the backend (for regional health checks) or from multiple regions (for global health checks)

## Types of Health Checks

GCP supports several health check protocols:

| Protocol | Use Case |
|----------|----------|
| HTTP | Web servers, REST APIs |
| HTTPS | Encrypted web services |
| HTTP/2 | gRPC or HTTP/2 backends |
| TCP | Any TCP service |
| SSL | TLS-encrypted TCP services |
| gRPC | gRPC services implementing the gRPC health checking protocol |

## Creating an HTTP Health Check

HTTP health checks are the most common. They send an HTTP GET request to a specified path and expect a successful response.

```bash
# Create an HTTP health check that checks the /healthz endpoint
gcloud compute health-checks create http my-http-check \
    --port=8080 \
    --request-path="/healthz" \
    --check-interval=10s \
    --timeout=5s \
    --healthy-threshold=2 \
    --unhealthy-threshold=3 \
    --global
```

Let me break down each parameter:

- `--port=8080`: The port to check on the backend instance
- `--request-path="/healthz"`: The URL path to request
- `--check-interval=10s`: Time between consecutive probes
- `--timeout=5s`: How long to wait for a response before considering it failed
- `--healthy-threshold=2`: Number of consecutive successful probes to mark healthy
- `--unhealthy-threshold=3`: Number of consecutive failed probes to mark unhealthy

A response with a status code in the 200 range is considered successful. Anything else (including 3xx redirects) counts as a failure.

## Creating an HTTPS Health Check

If your backend serves HTTPS, use an HTTPS health check:

```bash
# Create an HTTPS health check for encrypted backend services
gcloud compute health-checks create https my-https-check \
    --port=443 \
    --request-path="/health" \
    --check-interval=15s \
    --timeout=5s \
    --healthy-threshold=2 \
    --unhealthy-threshold=3 \
    --global
```

The health check system does not validate the backend's SSL certificate. This means you can use self-signed certificates on your backends.

## Creating a TCP Health Check

TCP health checks just verify that a connection can be established. They are useful for non-HTTP services like databases or custom TCP servers.

```bash
# Create a TCP health check that just verifies the port is open
gcloud compute health-checks create tcp my-tcp-check \
    --port=5432 \
    --check-interval=10s \
    --timeout=5s \
    --healthy-threshold=2 \
    --unhealthy-threshold=3 \
    --global
```

You can also configure a TCP health check to send a specific request and check the response:

```bash
# Create a TCP health check with request/response validation
gcloud compute health-checks create tcp my-tcp-check-advanced \
    --port=6379 \
    --request="PING" \
    --response="PONG" \
    --check-interval=10s \
    --timeout=5s \
    --global
```

## Creating a gRPC Health Check

If your backend implements the gRPC health checking protocol, you can use a gRPC health check:

```bash
# Create a gRPC health check for a specific service
gcloud compute health-checks create grpc my-grpc-check \
    --port=50051 \
    --grpc-service-name="my.service.v1" \
    --check-interval=10s \
    --timeout=5s \
    --global
```

The gRPC health check calls the `grpc.health.v1.Health/Check` RPC method on your backend. Your service must implement this standard health checking protocol.

## Using Named Ports

Instead of hardcoding port numbers, you can use named ports. This is especially useful with instance groups where different instances might serve on different ports.

First, set a named port on your instance group:

```bash
# Set a named port on the instance group
gcloud compute instance-groups set-named-ports my-instance-group \
    --named-ports=http-serve:8080 \
    --zone=us-central1-a
```

Then reference the port name in your health check:

```bash
# Create a health check using a named port
gcloud compute health-checks create http my-named-port-check \
    --use-serving-port \
    --request-path="/healthz" \
    --global
```

The `--use-serving-port` flag tells the health check to use the same port that the backend service uses for serving traffic.

## Attaching Health Checks to Backend Services

Once you have created a health check, attach it to your backend service:

```bash
# Create a backend service with the health check
gcloud compute backend-services create my-backend \
    --protocol=HTTP \
    --health-checks=my-http-check \
    --global
```

You can also update an existing backend service:

```bash
# Update a backend service to use a different health check
gcloud compute backend-services update my-backend \
    --health-checks=my-new-check \
    --global
```

## Tuning Health Check Parameters

The default parameters work for most applications, but tuning them can improve your load balancer's behavior.

**For latency-sensitive applications** (fast detection of failures):

```bash
# Aggressive health check for fast failure detection
gcloud compute health-checks create http fast-check \
    --port=8080 \
    --request-path="/healthz" \
    --check-interval=5s \
    --timeout=3s \
    --healthy-threshold=1 \
    --unhealthy-threshold=2 \
    --global
```

**For stable applications** (reduce unnecessary flapping):

```bash
# Conservative health check to avoid false positives
gcloud compute health-checks create http stable-check \
    --port=8080 \
    --request-path="/healthz" \
    --check-interval=30s \
    --timeout=10s \
    --healthy-threshold=3 \
    --unhealthy-threshold=5 \
    --global
```

## Designing Good Health Check Endpoints

A good health check endpoint should:

1. **Be lightweight**: Do not run expensive database queries on every probe
2. **Check critical dependencies**: Verify that the application can actually serve requests, not just that the process is running
3. **Return quickly**: Health check timeouts should not be triggered by slow endpoints
4. **Be idempotent**: Health check probes should not have side effects

Here is an example health check endpoint in a Node.js application:

```javascript
// A health check endpoint that verifies the app can serve requests
app.get('/healthz', async (req, res) => {
  try {
    // Quick check that the database connection is alive
    await db.query('SELECT 1');
    // Return 200 if everything is working
    res.status(200).json({ status: 'healthy' });
  } catch (error) {
    // Return 503 if something is wrong
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

## Checking Health Check Status

To see which instances are healthy or unhealthy:

```bash
# Check the health status of all backends in a backend service
gcloud compute backend-services get-health my-backend --global
```

This returns the health status of each instance in each instance group attached to the backend service.

## Troubleshooting Unhealthy Backends

When all backends show as unhealthy, work through this checklist:

1. **Firewall rules**: Make sure you allow traffic from `130.211.0.0/22` and `35.191.0.0/16` on the health check port

```bash
# Create a firewall rule allowing health check probes
gcloud compute firewall-rules create allow-health-probes \
    --network=my-vpc \
    --action=allow \
    --direction=ingress \
    --source-ranges=130.211.0.0/22,35.191.0.0/16 \
    --rules=tcp:8080
```

2. **Port mismatch**: Verify the health check port matches what your application is actually listening on

3. **Path returning non-200**: SSH into an instance and test the health check path locally:

```bash
# Test the health check endpoint directly from the instance
curl -v http://localhost:8080/healthz
```

4. **Application not started**: The instance might be running but the application has not finished starting. Consider adding a startup delay or readiness check.

## Wrapping Up

Health checks are deceptively simple in concept but require careful configuration to work well in production. Start with sensible defaults - 10 second intervals, 5 second timeouts, 2/3 thresholds - and adjust based on how your application behaves. Always verify that firewall rules allow health check traffic, and design your health check endpoints to be fast, lightweight, and meaningful indicators of your service's ability to handle requests.
