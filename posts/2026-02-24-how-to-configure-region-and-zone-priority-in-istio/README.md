# How to Configure Region and Zone Priority in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Locality Priority, Load Balancing, Kubernetes, Multi-Zone

Description: Configure region and zone priority ordering in Istio to control the exact failover chain when local service endpoints are unavailable.

---

When Istio routes traffic using locality-aware load balancing, it assigns a priority to each group of endpoints based on how close they are to the calling pod. Same-zone endpoints get the highest priority, same-region-different-zone gets the next, and other regions come last. But what if you want to customize this ordering? Maybe zone B is geographically closer to zone A than zone C is, or maybe one region has better connectivity than another.

Istio lets you control the priority order through failover configuration and distribute settings in DestinationRules. You define exactly which localities should be preferred and in what order.

## Default Priority Assignment

Without any custom configuration, Istio assigns priorities like this:

| Priority Level | Locality Relationship | Example |
|---------------|----------------------|---------|
| 0 (highest) | Same region, same zone | us-east-1a to us-east-1a |
| 1 | Same region, different zone | us-east-1a to us-east-1b |
| 2 | Different region | us-east-1a to us-west-2a |

This is usually what you want. But there are cases where you need to override this default behavior.

## Customizing Region Failover Priority

The `failover` section in a DestinationRule lets you specify which region traffic should go to when the current region is unavailable:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-gateway
spec:
  host: payment-gateway
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-east-1
            to: us-east-2
          - from: us-east-2
            to: us-east-1
          - from: eu-west-1
            to: eu-central-1
          - from: eu-central-1
            to: eu-west-1
      simple: ROUND_ROBIN
```

This configuration creates regional affinity groups. US regions failover to each other, and EU regions failover to each other. Traffic from eu-west-1 will not go to us-east-1 unless eu-central-1 is also down.

## Zone Priority Within a Region

By default, all zones within a region have the same priority (level 1 for non-local zones). If you need specific zone ordering, use the `distribute` configuration instead of `failover`:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-gateway
spec:
  host: payment-gateway
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
          - from: "us-east-1/us-east-1a/*"
            to:
              "us-east-1/us-east-1a/*": 80
              "us-east-1/us-east-1b/*": 15
              "us-east-1/us-east-1c/*": 5
          - from: "us-east-1/us-east-1b/*"
            to:
              "us-east-1/us-east-1b/*": 80
              "us-east-1/us-east-1a/*": 15
              "us-east-1/us-east-1c/*": 5
          - from: "us-east-1/us-east-1c/*"
            to:
              "us-east-1/us-east-1c/*": 80
              "us-east-1/us-east-1b/*": 15
              "us-east-1/us-east-1a/*": 5
      simple: ROUND_ROBIN
```

In this example, zone A and zone B prefer each other as secondary (15%), while zone C is the last resort (5%). This makes sense if A and B are in the same physical data center while C is in a separate facility.

## Understanding How Envoy Uses Priorities

When Envoy receives the priority assignments, it follows these rules:

1. Send traffic to the highest-priority (lowest number) healthy endpoints
2. If some endpoints at that priority are ejected by outlier detection, try to keep traffic at that priority level
3. Only overflow to the next priority level when there are not enough healthy endpoints at the current level

```mermaid
graph TD
    A[New Request] --> B{Priority 0 endpoints healthy?}
    B -->|Enough healthy| C[Route to Priority 0]
    B -->|Not enough healthy| D{Priority 1 endpoints healthy?}
    D -->|Enough healthy| E[Route to Priority 1]
    D -->|Not enough healthy| F{Priority 2 endpoints healthy?}
    F -->|Enough healthy| G[Route to Priority 2]
    F -->|Not enough healthy| H[503 - No healthy upstream]
```

The overflow percentage depends on the `overprovisioning_factor`, which defaults to 140 in Envoy. This means Envoy considers a priority level healthy enough if 100/140 (about 71%) of its endpoints are healthy. Below that threshold, traffic starts spilling to the next priority.

## Inspecting Priority Assignments

To see what priorities Envoy has assigned:

```bash
istioctl proxy-config endpoint <pod-name>.default \
  --cluster "outbound|80||payment-gateway.default.svc.cluster.local" -o json
```

Look for the `priority` field in the output. Each endpoint group has a priority number:

```json
{
  "hostStatuses": [
    {
      "address": {
        "socketAddress": {
          "address": "10.0.1.5",
          "portValue": 8080
        }
      },
      "locality": {
        "region": "us-east-1",
        "zone": "us-east-1a"
      },
      "priority": 0
    },
    {
      "address": {
        "socketAddress": {
          "address": "10.0.2.5",
          "portValue": 8080
        }
      },
      "locality": {
        "region": "us-east-1",
        "zone": "us-east-1b"
      },
      "priority": 1
    }
  ]
}
```

## Setting Up a Three-Tier Priority System

Here is a real-world example. You have a service deployed in three regions with specific failover requirements:

- Primary: same zone (fastest)
- Secondary: same region (fast, cheap)
- Tertiary: specific cross-region failover (slower, more expensive)

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-processing
spec:
  host: order-processing
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 2
      interval: 5s
      baseEjectionTime: 15s
      maxEjectionPercent: 100
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-east-1
            to: us-east-2
          - from: us-east-2
            to: us-east-1
          - from: ap-southeast-1
            to: us-west-2
      simple: ROUND_ROBIN
```

This creates the following priority chain for a pod in us-east-1/us-east-1a:

```
Priority 0: us-east-1/us-east-1a (local zone)
Priority 1: us-east-1/us-east-1b, us-east-1/us-east-1c (same region)
Priority 2: us-east-2/* (failover region)
```

## Combining with Health Checks

Priority-based routing is only as good as your health detection. Aggressive outlier detection settings help priorities kick in faster:

```yaml
outlierDetection:
  consecutive5xxErrors: 2      # Eject quickly
  interval: 5s                 # Check frequently
  baseEjectionTime: 15s        # Short ejection to allow recovery
  maxEjectionPercent: 100      # Allow full ejection for failover
  consecutiveGatewayErrors: 1  # Eject on gateway errors too
```

The `consecutiveGatewayErrors` field catches 502, 503, and 504 errors specifically, which are common during zone failures.

## Testing Priority Configuration

Simulate a zone failure and verify priorities work:

```bash
# Scale down pods in zone a
kubectl get pods -l app=order-processing -o wide \
  | grep us-east-1a \
  | awk '{print $1}' \
  | xargs kubectl delete pod

# Watch traffic shift
kubectl logs -l app=client-app --tail=50 -f
```

Or use Istio fault injection for a less destructive test:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-processing-fault-test
spec:
  hosts:
    - order-processing
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 100
      route:
        - destination:
            host: order-processing
```

Apply this temporarily, watch traffic shift to lower-priority zones, then remove it.

## Monitoring Priority-Based Routing

Track which priority level is serving traffic:

```bash
# Check cluster stats for priority levels
istioctl proxy-config cluster <pod-name> -o json \
  | jq '.[] | select(.name | contains("order-processing"))'
```

In Prometheus, you can track the destination pod zones:

```
sum(rate(istio_requests_total{
  destination_service="order-processing.default.svc.cluster.local"
}[5m])) by (destination_workload)
```

## Priority Configuration Tips

- Keep `maxEjectionPercent` at 100 for services that need full failover capability
- Use shorter outlier detection intervals (5-10s) for critical services that need fast failover
- Test your priority chain regularly - do not wait for a real outage to find out it does not work
- Document your priority configuration so the on-call team understands the failover behavior
- Consider the latency impact of each priority level when defining failover chains

Region and zone priority configuration gives you precise control over traffic routing preferences. The default same-zone-first behavior works for many cases, but when you have specific geographic or infrastructure requirements, custom priorities let you match your routing to your actual network topology.
