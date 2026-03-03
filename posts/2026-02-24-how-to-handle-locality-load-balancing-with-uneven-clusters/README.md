# How to Handle Locality Load Balancing with Uneven Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Locality Load Balancing, Uneven Clusters, Kubernetes, Capacity Planning

Description: Handle locality load balancing when your Kubernetes cluster has uneven pod distribution across zones or regions to prevent overloading smaller zones.

---

Locality load balancing sounds great in theory. Keep traffic local, fail over when needed, save on cross-zone costs. But things get complicated when your zones are not the same size. If zone A has 20 pods and zone C has 3 pods, and a failure in zone A pushes all that traffic to zone C, those 3 pods are going to have a bad time.

Uneven clusters are more common than people realize. Zones grow at different rates, node pools get added unevenly, autoscaling limits vary between zones, and sometimes a zone is just smaller because of cloud provider capacity constraints. Istio does not automatically account for these imbalances, so you need to configure things thoughtfully.

## The Problem with Default Locality Behavior

With default locality failover enabled, Istio assigns priorities based on proximity: local zone first, then same region, then other regions. But it does not consider capacity at each level.

Consider this setup:

| Zone | Pods | Capacity (rps) |
|------|------|----------------|
| us-east-1a | 15 | 1500 |
| us-east-1b | 10 | 1000 |
| us-east-1c | 3 | 300 |

If us-east-1a goes down and its 1500 rps worth of traffic fails over to us-east-1b and us-east-1c:
- us-east-1b receives most of the overflow but can handle it (capacity: 1000 rps)
- us-east-1c gets some overflow and immediately gets crushed (capacity: 300 rps)

Without explicit configuration, the failover can cascade into a wider outage.

## Solution 1: Weighted Distribution to Match Capacity

Instead of using failover mode, use distribute mode with weights that match your zone capacities:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service
spec:
  host: api-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
          - from: "us-east-1/us-east-1a/*"
            to:
              "us-east-1/us-east-1a/*": 54
              "us-east-1/us-east-1b/*": 36
              "us-east-1/us-east-1c/*": 10
          - from: "us-east-1/us-east-1b/*"
            to:
              "us-east-1/us-east-1a/*": 54
              "us-east-1/us-east-1b/*": 36
              "us-east-1/us-east-1c/*": 10
          - from: "us-east-1/us-east-1c/*"
            to:
              "us-east-1/us-east-1a/*": 54
              "us-east-1/us-east-1b/*": 36
              "us-east-1/us-east-1c/*": 10
      simple: ROUND_ROBIN
```

The weights (54/36/10) roughly match the pod ratio (15/10/3). This way, each zone receives traffic proportional to its capacity, and no zone gets overwhelmed.

## Solution 2: Failover with Capacity-Aware Regions

If you prefer failover mode (traffic stays local when possible), you need to make sure your failover targets can handle the load. One approach is to failover from small zones to large zones, not the other way around:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service
spec:
  host: api-service
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
            to: us-west-2
      simple: ROUND_ROBIN
```

Combined with ensuring us-west-2 has enough spare capacity to absorb the overflow.

## Solution 3: Use Horizontal Pod Autoscaler with Zone Awareness

Set up HPA so each zone can scale independently based on load:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 6
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Pods
          value: 5
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
```

Combine this with topology spread constraints to make sure new pods land in the right zones:

```yaml
spec:
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 2
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: api-service
```

Note the `maxSkew: 2` and `whenUnsatisfiable: ScheduleAnyway`. This is looser than a strict `maxSkew: 1` with `DoNotSchedule`, because during failover events you want the scheduler to place pods wherever it can, even if it creates some imbalance.

## Solution 4: Exclude Small Zones from Failover

If a zone is too small to handle overflow traffic, you can exclude it from receiving failover traffic entirely. Use distribute mode and only route failover traffic to zones with sufficient capacity:

```yaml
distribute:
  - from: "us-east-1/us-east-1a/*"
    to:
      "us-east-1/us-east-1a/*": 80
      "us-east-1/us-east-1b/*": 20
  - from: "us-east-1/us-east-1b/*"
    to:
      "us-east-1/us-east-1a/*": 20
      "us-east-1/us-east-1b/*": 80
  - from: "us-east-1/us-east-1c/*"
    to:
      "us-east-1/us-east-1a/*": 50
      "us-east-1/us-east-1b/*": 50
```

Notice that us-east-1c does not appear as a target for zones A or B. Zone C only receives its own local traffic. If zone C fails, its traffic goes equally to A and B, which can handle it.

## Calculating Safe Distribution Weights

Here is a formula to calculate weights based on capacity:

```text
weight_for_zone = (zone_pods / total_pods) * 100
```

For a cluster with pods distributed as 15, 10, and 3:

```text
Total: 28 pods
Zone A weight: (15/28) * 100 = 54%
Zone B weight: (10/28) * 100 = 36%
Zone C weight: (3/28) * 100 = 10%
```

But you also need to account for failover scenarios. If zone A goes down:

```text
Remaining: 13 pods
Zone B weight: (10/13) * 100 = 77%
Zone C weight: (3/13) * 100 = 23%
```

Can zone B handle 77% of total traffic? Can zone C handle 23%? If not, you need to either add capacity or set up cross-region failover.

## Monitoring Uneven Distribution

Set up dashboards to detect when zones are being overloaded:

```text
# Requests per pod per zone
sum(rate(istio_requests_total{
  destination_service="api-service.default.svc.cluster.local"
}[5m])) by (destination_workload)
/
count(kube_pod_info{pod=~"api-service.*"}) by (node)
```

Track CPU and memory per zone:

```text
# Average CPU utilization by zone
avg(rate(container_cpu_usage_seconds_total{
  container="api-service"
}[5m])) by (topology_kubernetes_io_zone)
```

Alert when any zone's per-pod request rate is significantly higher than average:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: zone-imbalance-alert
spec:
  groups:
    - name: zone-balance
      rules:
        - alert: ZoneTrafficImbalance
          expr: |
            max(
              sum(rate(istio_requests_total{destination_app="api-service"}[5m])) by (destination_workload)
            ) / avg(
              sum(rate(istio_requests_total{destination_app="api-service"}[5m])) by (destination_workload)
            ) > 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Zone traffic imbalance detected for api-service"
```

## The Realistic Approach

In practice, most teams use a combination of these solutions:

1. **Set distribute weights** proportional to zone capacity
2. **Use HPA** so zones can scale up during failover
3. **Monitor per-zone load** and adjust weights as capacity changes
4. **Plan for N-1 scenarios** where your largest zone fails

The key insight is that locality load balancing with uneven clusters requires active management. Set it and forget it does not work when your zones are different sizes. Review your weights whenever you add or remove nodes, and always test your failover paths to make sure smaller zones can survive the overflow.
