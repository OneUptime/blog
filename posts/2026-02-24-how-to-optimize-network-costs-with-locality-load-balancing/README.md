# How to Optimize Network Costs with Locality Load Balancing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Network Costs, Locality Load Balancing, Cost Optimization, Kubernetes

Description: Reduce cloud network costs by using Istio locality load balancing to minimize cross-zone and cross-region data transfer in your Kubernetes cluster.

---

Cross-zone and cross-region data transfer on cloud providers is not free. On AWS, cross-AZ traffic costs $0.01/GB in each direction ($0.02/GB total). Cross-region traffic is even more expensive, ranging from $0.02 to $0.09 per GB depending on the regions. For a service handling 10 Gbps of internal traffic, that is hundreds or thousands of dollars per month going to data transfer charges alone.

Istio's locality load balancing can significantly reduce these costs by keeping traffic within the same availability zone whenever possible. You get lower latency as a bonus, but for many teams, the cost savings are the primary motivation.

## Understanding Cloud Network Costs

Here is a typical breakdown for AWS (as of early 2026, prices vary by region):

| Traffic Type | Cost per GB |
|-------------|-------------|
| Same AZ | Free |
| Cross AZ (same region) | $0.01 each direction |
| Cross region (within US) | $0.02 each direction |
| Cross region (US to EU) | $0.02-$0.09 each direction |
| Internet egress | $0.09/GB (first 10TB) |

Similar pricing applies to GCP and Azure, though the exact numbers differ.

If you have a microservices architecture with 20 services all talking to each other, and each service makes 5-10 downstream calls per request, the cross-zone traffic adds up fast.

## Measuring Your Current Cross-Zone Traffic

Before optimizing, figure out how much cross-zone traffic you currently have. Use Istio metrics:

```
# Total bytes transferred cross-zone (approximate)
sum(rate(istio_tcp_sent_bytes_total{reporter="source"}[24h])) by (source_workload, destination_workload)
```

You can also use Kubernetes-level metrics if you have them:

```bash
# Check node-to-node traffic patterns
kubectl top nodes
```

For a more detailed analysis, enable Envoy access logging and parse the upstream endpoint addresses:

```bash
istioctl install --set meshConfig.accessLogFile=/dev/stdout --set meshConfig.accessLogFormat='[%START_TIME%] %REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %UPSTREAM_HOST% %RESPONSE_CODE%\n'
```

## Enabling Zone-Local Traffic

The simplest optimization is enabling locality load balancing with default failover behavior:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: inventory-service
spec:
  host: inventory-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
      simple: ROUND_ROBIN
```

With this configuration, traffic prefers same-zone endpoints. If all pods in the local zone are healthy, 100% of traffic stays within the zone - which means $0 in cross-zone data transfer for that service.

## Aggressive Zone Pinning

If cost is your primary concern and you are willing to accept slightly less resilience, you can pin traffic aggressively to the local zone:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: inventory-service
spec:
  host: inventory-service
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
              "us-east-1/us-east-1a/*": 100
          - from: "us-east-1/us-east-1b/*"
            to:
              "us-east-1/us-east-1b/*": 100
          - from: "us-east-1/us-east-1c/*"
            to:
              "us-east-1/us-east-1c/*": 100
      simple: ROUND_ROBIN
```

This sends 100% of traffic to the local zone. If local endpoints fail outlier detection, traffic still fails over to other zones, but under normal conditions, there is zero cross-zone traffic.

The downside is that if one zone has a sudden traffic spike, it cannot borrow capacity from other zones. Make sure your HPA is properly configured for each zone.

## Balancing Cost and Resilience

A more balanced approach sends most traffic locally but keeps a small percentage cross-zone for resilience:

```yaml
distribute:
  - from: "us-east-1/us-east-1a/*"
    to:
      "us-east-1/us-east-1a/*": 95
      "us-east-1/us-east-1b/*": 3
      "us-east-1/us-east-1c/*": 2
  - from: "us-east-1/us-east-1b/*"
    to:
      "us-east-1/us-east-1b/*": 95
      "us-east-1/us-east-1a/*": 3
      "us-east-1/us-east-1c/*": 2
  - from: "us-east-1/us-east-1c/*"
    to:
      "us-east-1/us-east-1c/*": 95
      "us-east-1/us-east-1a/*": 3
      "us-east-1/us-east-1b/*": 2
```

The 5% cross-zone traffic is cheap insurance. It keeps other zones warm and gives you early warning if a zone develops issues.

## Cost Calculation Example

Suppose you have a service that transfers 1 TB/day of internal traffic, spread evenly across 3 zones.

**Without locality load balancing (random distribution):**
- Each zone generates 333 GB/day of traffic
- 2/3 of that traffic goes cross-zone = 222 GB cross-zone per zone
- Total cross-zone: 666 GB/day
- Cost: 666 GB x $0.02/GB = $13.32/day = ~$400/month

**With 95% local distribution:**
- Each zone generates 333 GB/day
- 5% cross-zone = 16.65 GB cross-zone per zone
- Total cross-zone: 50 GB/day
- Cost: 50 GB x $0.02/GB = $1.00/day = ~$30/month

**Savings: ~$370/month per service**

Multiply that by 20 services and you are saving $7,400/month.

## Applying Locality Rules to All Services

Rather than configuring each service individually, you can set a default DestinationRule policy using Istio's mesh config:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: default-locality
  namespace: istio-system
spec:
  host: "*.default.svc.cluster.local"
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
      simple: ROUND_ROBIN
```

This applies locality load balancing to all services in the default namespace. Individual DestinationRules for specific services will override this default.

## Services Where Cross-Zone Traffic is Acceptable

Not every service needs locality pinning. Some services benefit from cross-zone distribution:

- **Stateless batch processors** where latency does not matter
- **Low-traffic services** where cross-zone costs are negligible
- **Services with uneven zone distribution** where local-only would overload small zones

For these, either skip locality settings or use a looser distribution.

## Monitoring Cost Savings

Track the percentage of local vs. cross-zone traffic over time:

```
# Percentage of same-zone traffic
sum(rate(istio_requests_total{
  reporter="source",
  source_workload_namespace="default"
}[1h])) by (source_workload, destination_workload)
```

Create a Grafana dashboard that shows:
1. Total data transfer by zone pair
2. Percentage of local vs cross-zone traffic
3. Estimated cost based on transfer volumes

## Ensuring Even Pod Distribution

Locality load balancing only saves money if pods are distributed across all zones. If all your pods land in one zone, every request from other zones is cross-zone.

Use topology spread constraints:

```yaml
spec:
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: inventory-service
```

And set per-zone PodDisruptionBudgets:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: inventory-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: inventory-service
```

## Quick Wins for Cost Reduction

1. **Enable locality load balancing** on your top 5 highest-traffic services first
2. **Use topology spread constraints** to ensure even pod distribution
3. **Monitor cross-zone traffic** before and after changes to measure savings
4. **Set aggressive local routing** (95%+) for services that call each other frequently
5. **Review cloud billing** for data transfer line items to validate savings

Network cost optimization with Istio locality load balancing is one of those rare wins where you get better performance (lower latency) and lower costs at the same time. The configuration is straightforward, the savings are measurable, and the risk is low when you include proper outlier detection for failover. If you are running a multi-zone Kubernetes cluster and not using locality load balancing, you are leaving money on the table.
