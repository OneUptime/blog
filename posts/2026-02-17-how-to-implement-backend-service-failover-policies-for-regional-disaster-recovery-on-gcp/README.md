# How to Use Backend Service Failover Policies for Regional Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Disaster Recovery, Failover, Load Balancer, High Availability

Description: Learn how to implement backend service failover policies on GCP Load Balancer for regional disaster recovery with automatic traffic redirection to healthy regions.

---

When an entire region goes down, your application needs to keep serving traffic from another region without manual intervention. GCP's global load balancer handles this automatically - when health checks determine that backends in one region are unhealthy, traffic shifts to healthy backends in other regions. But the default behavior might not match your requirements. You might want to keep some capacity in reserve, control the failover threshold, or implement a primary-backup architecture.

In this post, I will cover how to configure backend service failover policies for different disaster recovery patterns on GCP.

## Failover Architecture Overview

The global external Application Load Balancer distributes traffic to healthy backends according to its load balancing algorithm and backend capacity. When backends in a region fail, traffic can move to healthy backends in other regions. You can control this behavior through capacity scalers, backend preference, service load balancing policies, health checks, and connection draining settings.

```mermaid
flowchart TD
    A[Global Load Balancer] --> B{Health Check}
    B -->|Healthy| C[us-central1 - Primary]
    B -->|Healthy| D[europe-west1 - Secondary]
    B -->|Unhealthy| E[asia-east1 - DR Site]
    C -->|Region Failure| F[Traffic Redirected]
    F --> D
    F --> E
```

## Step 1 - Set Up Multi-Region Backends

Start by deploying backends in multiple regions with a clear primary-secondary hierarchy.

```bash
# Create the health check

gcloud compute health-checks create http app-hc \
    --port=8080 \
    --request-path=/healthz \
    --check-interval=5s \
    --timeout=3s \
    --healthy-threshold=2 \
    --unhealthy-threshold=3

# Create the backend service
gcloud compute backend-services create app-backend \
    --global \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --protocol=HTTP \
    --health-checks=app-hc \
    --port-name=http \
    --connection-draining-timeout=300

# Instance groups in three regions
gcloud compute instance-groups managed create app-mig-us \
    --template=app-template \
    --size=4 \
    --zone=us-central1-a

gcloud compute instance-groups managed create app-mig-eu \
    --template=app-template \
    --size=4 \
    --zone=europe-west1-b

gcloud compute instance-groups managed create app-mig-asia \
    --template=app-template \
    --size=2 \
    --zone=asia-east1-a
```

## Step 2 - Configure Capacity Scalers and Backend Preference

Capacity scalers scale a backend's configured target capacity. Backend preference lets you make the load balancer use preferred backends before sending requests to the remaining backends.

```bash
# Primary region - full capacity
gcloud compute backend-services add-backend app-backend \
    --global \
    --instance-group=app-mig-us \
    --instance-group-zone=us-central1-a \
    --balancing-mode=UTILIZATION \
    --max-utilization=0.8 \
    --preference=PREFERRED \
    --capacity-scaler=1.0

# Secondary region - receives traffic during normal operation
# but with lower priority
gcloud compute backend-services add-backend app-backend \
    --global \
    --instance-group=app-mig-eu \
    --instance-group-zone=europe-west1-b \
    --balancing-mode=UTILIZATION \
    --max-utilization=0.8 \
    --preference=DEFAULT \
    --capacity-scaler=1.0

# DR region - default backend with reduced capacity
gcloud compute backend-services add-backend app-backend \
    --global \
    --instance-group=app-mig-asia \
    --instance-group-zone=asia-east1-a \
    --balancing-mode=UTILIZATION \
    --max-utilization=0.8 \
    --preference=DEFAULT \
    --capacity-scaler=0.25
```

Setting `--preference=PREFERRED` on the primary region makes the load balancer use that backend before spilling traffic to the default backends. Keep the DR backend's `capacity-scaler` above zero if you want it to be eligible for traffic during failover.

## Step 3 - Configure the Service Load Balancing Policy

For a global external Application Load Balancer, use a service load balancing policy to tune cross-region behavior. The policy can enable auto-capacity draining and set the failover health threshold.

```bash
# Create a service load balancing policy
gcloud network-services service-lb-policies create app-lb-policy \
    --load-balancing-algorithm=WATERFALL_BY_REGION \
    --auto-capacity-drain \
    --failover-health-threshold=70 \
    --location=global

# Attach the policy to the backend service
gcloud compute backend-services update app-backend \
    --global \
    --service-lb-policy=app-lb-policy
```

You can also define the policy in YAML and import it:

```yaml
# lb-policy.yaml - Service load balancing policy
name: projects/my-project/locations/global/serviceLbPolicies/app-lb-policy
autoCapacityDrain:
  enable: true
failoverConfig:
  failoverHealthThreshold: 70
loadBalancingAlgorithm: WATERFALL_BY_REGION
```

```bash
# Import the policy and attach it to the backend service
gcloud network-services service-lb-policies import app-lb-policy \
    --source=/tmp/lb-policy.yaml \
    --location=global

gcloud compute backend-services update app-backend \
    --global \
    --service-lb-policy=app-lb-policy
```

The failover health threshold is a percentage from 1 to 99. If the percentage of healthy endpoints in a backend falls below this threshold, the load balancer tries to send traffic to another backend. Auto-capacity draining removes backends with many unhealthy endpoints from the load balancing pool.

## Step 4 - Configure Health Check Sensitivity

For disaster recovery, health check timing matters. Too slow and traffic keeps going to an unhealthy region for too long. Too fast and transient issues cause unnecessary failovers.

```bash
# Configure health checks for fast failure detection
gcloud compute health-checks update http app-hc \
    --check-interval=5s \
    --timeout=3s \
    --healthy-threshold=2 \
    --unhealthy-threshold=3
```

With these settings:
- Health checks run every 5 seconds
- Each check times out after 3 seconds
- An instance is marked unhealthy after 3 consecutive failures (15 seconds)
- An instance is marked healthy after 2 consecutive successes (10 seconds)

This means an individual backend endpoint is marked unhealthy after about 15 seconds of failed checks. Actual traffic shifting also depends on the backend service configuration, the service load balancing policy, and where Google Front Ends are handling client traffic. For faster detection, reduce the check interval and unhealthy threshold, but be aware this increases the risk of false positives.

## Step 5 - Connection Draining

When the load balancer starts shifting traffic away from a failing region, you do not want to drop existing connections immediately. Connection draining gives in-flight requests time to complete.

```bash
# Set connection draining timeout
gcloud compute backend-services update app-backend \
    --global \
    --connection-draining-timeout=300
```

The 300-second (5-minute) timeout means existing connections have up to 5 minutes to complete before they are forcefully terminated when a backend is removed or updated. New connections are sent to eligible healthy backends.

## Step 6 - Test Failover

You should regularly test your failover configuration. Here is how to simulate a regional failure.

```bash
# Simulate draining the primary region by setting its capacity to zero
gcloud compute backend-services update-backend app-backend \
    --global \
    --instance-group=app-mig-us \
    --instance-group-zone=us-central1-a \
    --capacity-scaler=0.0

# Monitor backend health and traffic shifting to secondary regions
watch -n 5 'gcloud compute backend-services get-health app-backend --global'

# After testing, restore the primary region
gcloud compute backend-services update-backend app-backend \
    --global \
    --instance-group=app-mig-us \
    --instance-group-zone=us-central1-a \
    --capacity-scaler=1.0
```

You can also test by SSH-ing into the VMs in the primary region and stopping the application:

```bash
# Stop the application on all VMs in the primary region
gcloud compute ssh app-mig-us-xxxx --zone=us-central1-a \
    --command="sudo systemctl stop nginx"
```

## Step 7 - Automated Failover Monitoring

Set up alerts to notify you when failover occurs.

```python
from google.cloud import monitoring_v3

client = monitoring_v3.AlertPolicyServiceClient()

# Alert when a backend group stops receiving requests
alert_policy = monitoring_v3.AlertPolicy(
    display_name="Regional Failover Alert",
    conditions=[
        monitoring_v3.AlertPolicy.Condition(
            display_name="No requests to primary backend zone",
            condition_threshold=monitoring_v3.AlertPolicy.Condition.MetricThreshold(
                filter=(
                    'resource.type="https_lb_rule" '
                    'AND metric.type="loadbalancing.googleapis.com/https/backend_request_count" '
                    'AND metric.label."backend_scope"="us-central1-a" '
                    'AND resource.label."backend_target_name"="app-backend"'
                ),
                comparison=monitoring_v3.ComparisonType.COMPARISON_LT,
                threshold_value=1,
                duration={"seconds": 60},
                aggregations=[
                    monitoring_v3.Aggregation(
                        alignment_period={"seconds": 60},
                        per_series_aligner=monitoring_v3.Aggregation.Aligner.ALIGN_RATE,
                    )
                ],
            ),
        )
    ],
    notification_channels=["projects/my-project/notificationChannels/12345"],
    alert_strategy=monitoring_v3.AlertPolicy.AlertStrategy(
        notification_rate_limit=monitoring_v3.AlertPolicy.AlertStrategy.NotificationRateLimit(
            period={"seconds": 300}  # Max one notification per 5 minutes
        )
    ),
)

result = client.create_alert_policy(
    name="projects/my-project",
    alert_policy=alert_policy,
)
```

## DR Patterns

Here are common DR patterns and how to configure them on GCP:

**Active-Active (both regions serve traffic)**:
```bash
# Both regions at full capacity
--capacity-scaler=1.0  # for both regions
```

**Active-Passive (standby receives traffic only when preferred backends are unavailable or full)**:
```bash
# Primary preferred, DR default
--preference=PREFERRED  # primary
--preference=DEFAULT    # standby
```

**Active-Warm (standby receives small amount of traffic to stay warm)**:
```bash
# Primary at full, warm standby at 10%
--capacity-scaler=1.0   # primary
--capacity-scaler=0.1   # warm standby
```

The warm standby pattern is my preference. It keeps the DR site exercised with real traffic, which means you find configuration issues before a real disaster rather than during one.

## Wrapping Up

Backend service failover on GCP is handled by the global load balancer through health checks, backend preference, service load balancing policies, capacity scalers, and connection draining. The load balancer automatically shifts traffic away from unhealthy regions, and you control the behavior through backend preference and capacity scalers (which regions are active vs standby), health check timing (how fast unhealthy endpoints are detected), service load balancing policy settings, and connection draining (how graceful the transition is). Test your failover configuration regularly - the worst time to discover a DR problem is during an actual disaster. Set up monitoring alerts for failover events so your team knows when traffic is being redirected, and investigate the root cause promptly.
