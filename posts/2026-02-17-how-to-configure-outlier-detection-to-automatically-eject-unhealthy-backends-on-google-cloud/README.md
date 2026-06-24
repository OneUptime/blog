# How to Configure Outlier Detection to Automatically Eject Unhealthy Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Load Balancer, Outlier Detection, Backend Health, Reliability

Description: Learn how to configure outlier detection on Google Cloud Load Balancer to automatically eject unhealthy backend instances and improve service reliability.

---

Health checks tell you whether a backend endpoint is up or down, but they do not catch every type of failure. A backend can pass health checks while still serving errors to real traffic. Maybe it has a memory leak that causes intermittent 500 errors, or a flaky database connection that makes 10% of requests fail. Standard health checks will not catch these issues until the backend is completely broken. Outlier detection fills this gap by monitoring real traffic and automatically ejecting backends that are performing worse than their peers.

In this post, I will walk through how to configure outlier detection on Google Cloud's load balancer, explain the different detection methods, and show you how to tune the parameters for your workload.

## How Outlier Detection Works

Outlier detection tracks the error rate and response behavior of each individual backend endpoint. When an endpoint's error rate exceeds a threshold (either absolute or relative to its peers), each proxy that detects the outlier temporarily removes it from that proxy's load-balancing pool. After a cooldown period, it gets added back. If it fails again, the ejection time increases.

```mermaid
flowchart TD
    A[Load Balancer] --> B{Outlier Detection}
    B -->|Healthy| C[Instance 1 - 0.1% errors]
    B -->|Healthy| D[Instance 2 - 0.2% errors]
    B -->|Ejected| E[Instance 3 - 15% errors]
    B -->|Healthy| F[Instance 4 - 0.3% errors]
    E -->|After Cooldown| G{Re-evaluate}
    G -->|Still Unhealthy| H[Eject Again - Longer Duration]
    G -->|Recovered| B
```

The key difference from health checks: outlier detection uses the actual traffic passing through the load balancer to determine health, not synthetic probes.

## Detection Methods

GCP supports several outlier detection methods:

1. **Consecutive errors**: Eject after N consecutive 5xx errors from a backend
2. **Success rate**: Eject backends whose success rate is below the mean minus a standard deviation threshold
3. **Consecutive gateway errors**: Eject after N consecutive gateway errors (502, 503, 504)

Each method has its strengths. Consecutive errors is simple and predictable. Success rate is more sophisticated and compares each backend against the group average.

## Step 1 - Configure Basic Consecutive Error Detection

The simplest configuration ejects backends after a specified number of consecutive errors.

```bash
# Export the backend service, edit the YAML, then import it back
gcloud compute backend-services export my-api-backend \
    --destination=my-api-backend.yaml \
    --global
```

Add or update the `outlierDetection` block in `my-api-backend.yaml`:

```yaml
outlierDetection:
  consecutiveErrors: 5
  interval:
    seconds: 10
    nanos: 0
  baseEjectionTime:
    seconds: 30
    nanos: 0
  maxEjectionPercent: 50
  enforcingConsecutiveErrors: 100
```

Then import the updated backend service:

```bash
gcloud compute backend-services import my-api-backend \
    --source=my-api-backend.yaml \
    --global
```

Here is what each parameter does:

- **consecutiveErrors: 5**: Eject after 5 consecutive 5xx errors from a single endpoint
- **interval: 10s**: Check for outliers every 10 seconds
- **baseEjectionTime: 30s**: First ejection lasts 30 seconds. Subsequent ejections last longer (base * number of ejections)
- **maxEjectionPercent: 50**: Never eject more than 50% of backends. This prevents total loss of capacity.
- **enforcingConsecutiveErrors: 100**: Enforce this policy 100% of the time. You can set this lower for gradual rollout.

## Step 2 - Configure Success Rate Detection

Success rate detection is more nuanced. It ejects backends whose success rate is statistically worse than the group average.

```bash
gcloud compute backend-services export my-api-backend \
    --destination=my-api-backend.yaml \
    --global
```

Add or update this block in `my-api-backend.yaml`:

```yaml
outlierDetection:
  interval:
    seconds: 10
    nanos: 0
  baseEjectionTime:
    seconds: 30
    nanos: 0
  maxEjectionPercent: 50
  successRateMinimumHosts: 3
  successRateRequestVolume: 100
  successRateStdevFactor: 1900
  enforcingSuccessRate: 100
```

Then import the updated backend service:

```bash
gcloud compute backend-services import my-api-backend \
    --source=my-api-backend.yaml \
    --global
```

The success-rate specific parameters:

- **successRateMinimumHosts: 3**: Need at least 3 endpoints to compute meaningful statistics. If you have fewer, success rate detection is disabled.
- **successRateRequestVolume: 100**: An endpoint must have at least 100 requests in the interval to be evaluated. This prevents ejecting endpoints with too little data.
- **successRateStdevFactor: 1900**: The ejection threshold. An endpoint is ejected if its success rate is below: `mean - (stdev_factor/1000 * standard_deviation)`. A factor of 1900 means 1.9 standard deviations below the mean.

For example, if the group average success rate is 99.5% with a standard deviation of 0.5%, an endpoint with a success rate below `99.5 - (1.9 * 0.5) = 98.55%` would be ejected.

## Step 3 - Configure Gateway Error Detection

Gateway error detection specifically targets 502, 503, and 504 errors, which typically indicate infrastructure-level problems rather than application errors.

```bash
gcloud compute backend-services export my-api-backend \
    --destination=my-api-backend.yaml \
    --global
```

Add or update this block in `my-api-backend.yaml`:

```yaml
outlierDetection:
  consecutiveGatewayFailure: 3
  interval:
    seconds: 10
    nanos: 0
  baseEjectionTime:
    seconds: 60
    nanos: 0
  maxEjectionPercent: 30
  enforcingConsecutiveGatewayFailure: 100
```

Then import the updated backend service:

```bash
gcloud compute backend-services import my-api-backend \
    --source=my-api-backend.yaml \
    --global
```

Gateway errors are usually more serious than application 500 errors, so you might want to eject faster (lower consecutive count) and for longer (higher base ejection time).

## Step 4 - Full Configuration via API

For the most control, use the REST API or a client library.

```python
from google.cloud import compute_v1

client = compute_v1.BackendServicesClient()

# Get the current backend service
backend = client.get(
    project="my-project",
    backend_service="my-api-backend"
)

# Configure comprehensive outlier detection
backend.outlier_detection = compute_v1.OutlierDetection(
    # Check every 10 seconds
    interval=compute_v1.Duration(seconds=10),

    # Base ejection time of 30 seconds, increases on repeated ejections
    base_ejection_time=compute_v1.Duration(seconds=30),

    # Never eject more than 50% of backends
    max_ejection_percent=50,

    # Consecutive error detection
    consecutive_errors=5,
    enforcing_consecutive_errors=100,

    # Consecutive gateway error detection
    consecutive_gateway_failure=3,
    enforcing_consecutive_gateway_failure=100,

    # Success rate detection
    success_rate_minimum_hosts=3,
    success_rate_request_volume=100,
    success_rate_stdev_factor=1900,
    enforcing_success_rate=100,
)

# Apply the update
operation = client.update(
    project="my-project",
    backend_service="my-api-backend",
    backend_service_resource=backend
)

print(f"Updated outlier detection: {operation.name}")
```

## Step 5 - Monitor Ejection Signals

Track signals that backends are being ejected to understand the health of your infrastructure.

```bash
# Check backend health from configured health checks
gcloud compute backend-services get-health my-api-backend \
    --global \
    --format=json
```

Because outlier detection decisions are made independently by each proxy instance, `get-health` does not show a single global ejection status. Use load balancer logs and backend error-rate metrics to understand whether configured thresholds are likely causing ejections.

Set up monitoring queries to track backend 5xx and gateway error patterns:

```sql
-- Query Cloud Logging Log Analytics for load balancer 5xx responses
SELECT
    timestamp,
    httpRequest.status,
    jsonPayload.statusDetails,
    resource.labels.backend_service_name,
    resource.labels.url_map_name,
    httpRequest.requestUrl
FROM
    `my_project.global._Default._AllLogs`
WHERE
    resource.type = "http_load_balancer"
    AND httpRequest.status >= 500
    AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
ORDER BY timestamp DESC;
```

## Tuning Guidelines

Getting the right outlier detection parameters takes experimentation. Here are guidelines based on different workload types.

**For latency-sensitive APIs**:
```bash
# Aggressive detection - eject fast, recover fast
gcloud compute backend-services export latency-api-backend \
    --destination=latency-api-backend.yaml \
    --global
```

Use this `outlierDetection` block:

```yaml
outlierDetection:
  consecutiveErrors: 3
  interval:
    seconds: 5
    nanos: 0
  baseEjectionTime:
    seconds: 15
    nanos: 0
  maxEjectionPercent: 30
  enforcingConsecutiveErrors: 100
```

**For batch processing backends**:
```bash
# Tolerant detection - allow for bursty errors
gcloud compute backend-services export batch-backend \
    --destination=batch-backend.yaml \
    --global
```

Use this `outlierDetection` block:

```yaml
outlierDetection:
  consecutiveErrors: 10
  interval:
    seconds: 30
    nanos: 0
  baseEjectionTime:
    seconds: 60
    nanos: 0
  maxEjectionPercent: 20
  enforcingConsecutiveErrors: 100
```

**For multi-region deployments with few instances per region**:
```bash
# Conservative detection - avoid ejecting too many in small pools
gcloud compute backend-services export regional-backend \
    --destination=regional-backend.yaml \
    --global
```

Use this `outlierDetection` block:

```yaml
outlierDetection:
  consecutiveErrors: 10
  interval:
    seconds: 15
    nanos: 0
  baseEjectionTime:
    seconds: 30
    nanos: 0
  maxEjectionPercent: 20
  successRateMinimumHosts: 5
  successRateRequestVolume: 200
  successRateStdevFactor: 2500
  enforcingSuccessRate: 50
```

## Common Pitfalls

**Setting `maxEjectionPercent` too high**: If you allow 100% ejection, all backends can be removed from a proxy's load-balancing pool, and requests handled by that proxy can fail. Keeping this at 50% or below is a safer starting point.

**Too sensitive thresholds**: Setting `consecutiveErrors: 1` will eject backends on any single error, including legitimate 500 responses from application logic. Start with 5 and adjust down only if needed.

**Forgetting about scale-in**: When your instance group scales in, the remaining instances get more traffic. If outlier detection ejects one of the remaining few, the others might get overloaded. Coordinate outlier detection thresholds with your autoscaling configuration.

**Not monitoring ejection signals**: If you do not track backend 5xx rates and related load balancer metrics, you will not know when backends are being silently removed from rotation. This can mask underlying issues that need fixing.

## Wrapping Up

Outlier detection fills the gap between health checks and real traffic monitoring. It automatically removes backend endpoints that are degrading the user experience, and adds them back when they recover. The configuration is on the backend service, and you can use consecutive errors for simple cases or success rate detection for more sophisticated analysis. Start with conservative settings, monitor ejection patterns, and tighten thresholds as you gain confidence in your backends' behavior. Combined with circuit breaking, outlier detection gives you a solid foundation for backend reliability on GCP.
