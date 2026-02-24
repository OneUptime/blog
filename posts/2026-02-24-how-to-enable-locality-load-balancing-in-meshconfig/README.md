# How to Enable Locality Load Balancing in MeshConfig

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Locality, MeshConfig, High Availability

Description: Learn how to configure locality-aware load balancing in Istio MeshConfig to route traffic to the nearest endpoints and reduce latency across zones and regions.

---

Locality load balancing in Istio routes traffic to the closest available endpoints based on geographic proximity. If your service runs across multiple zones or regions, locality-aware routing sends requests to endpoints in the same zone first, then the same region, and only falls over to remote regions if local endpoints are unhealthy. This reduces latency and cross-zone data transfer costs.

## How Locality Works in Kubernetes

Kubernetes nodes have topology labels that Istio uses to determine locality:

- `topology.kubernetes.io/region` - The cloud region (e.g., `us-east-1`)
- `topology.kubernetes.io/zone` - The availability zone (e.g., `us-east-1a`)
- `topology.istio.io/subzone` - An optional sub-zone (not set by default in most cloud providers)

Istio reads these labels from the node where each pod runs and uses them to organize endpoints by locality.

Check your node labels:

```bash
kubectl get nodes --show-labels | grep topology
```

Or for a specific node:

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.labels}' | jq 'with_entries(select(.key | startswith("topology")))'
```

## Enabling Locality Load Balancing

Locality load balancing requires two things: enabling it in the mesh configuration and setting up outlier detection on the destination.

### Step 1: Enable in MeshConfig

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    localityLbSetting:
      enabled: true
```

This enables locality-aware routing mesh-wide.

### Step 2: Configure Outlier Detection

Locality failover only works when Istio can detect unhealthy endpoints. Without outlier detection, Istio has no way to know when to fail over. You configure this through DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
```

The outlier detection configuration ejects endpoints that return 5 consecutive 5xx errors. Once ejected, traffic fails over to the next closest locality.

## Locality Failover Configuration

By default, locality load balancing uses a priority-based approach:

1. Same zone (highest priority)
2. Same region, different zone
3. Different region (lowest priority)

You can customize the failover behavior:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    localityLbSetting:
      enabled: true
      failover:
        - from: us-east-1
          to: us-west-2
        - from: us-west-2
          to: us-east-1
```

This tells Istio that if endpoints in `us-east-1` are unhealthy, traffic should fail over to `us-west-2` (and vice versa). Without explicit failover rules, Istio uses a round-robin approach across non-local regions.

## Weighted Distribution

Instead of strict priority ordering, you can distribute traffic across localities with explicit weights:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    localityLbSetting:
      enabled: true
      distribute:
        - from: us-east-1/us-east-1a/*
          to:
            "us-east-1/us-east-1a/*": 80
            "us-east-1/us-east-1b/*": 15
            "us-west-2/us-west-2a/*": 5
        - from: us-east-1/us-east-1b/*
          to:
            "us-east-1/us-east-1b/*": 80
            "us-east-1/us-east-1a/*": 15
            "us-west-2/us-west-2a/*": 5
```

This sends 80% of traffic to the local zone, 15% to the neighboring zone in the same region, and 5% to a remote region. Weighted distribution is useful for:

- Gradually warming up endpoints in a new zone
- Testing failover paths with a small percentage of traffic
- Balancing load when some zones have more capacity than others

## Per-Service Locality Settings

You can also configure locality settings per service through DestinationRule instead of mesh-wide through MeshConfig:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: critical-service
  namespace: default
spec:
  host: critical-service.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-east-1
            to: eu-west-1
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
```

Per-service settings override the mesh-wide configuration for that specific service.

## Verifying Locality Load Balancing

Check how endpoints are organized by locality:

```bash
istioctl proxy-config endpoints deploy/sleep -n sample --cluster "outbound|8080||my-service.default.svc.cluster.local" -o json
```

The output includes locality information and priority levels for each endpoint. Priority 0 is the highest (local zone), higher numbers are for more distant localities.

Send test requests and check which endpoints receive traffic:

```bash
for i in $(seq 1 20); do
  kubectl exec deploy/sleep -c sleep -n sample -- \
    curl -sS http://my-service.default:8080/headers | grep "x-envoy-upstream"
done
```

The `x-envoy-upstream-service-time` header and the upstream host address in access logs tell you which endpoint handled each request.

## Testing Failover

To test locality failover, simulate an unhealthy zone by scaling down the service in one zone or by deploying a version that returns 500 errors:

```bash
# Scale down in zone us-east-1a
kubectl scale deployment my-service --replicas=0 -n default

# Watch traffic shift to the next zone
for i in $(seq 1 20); do
  kubectl exec deploy/sleep -c sleep -n sample -- \
    curl -sS http://my-service.default:8080/zone
done
```

Then scale back up and verify traffic returns to the local zone:

```bash
kubectl scale deployment my-service --replicas=3 -n default
```

## Common Pitfalls

**Missing outlier detection**: Locality failover does not work without outlier detection. If local endpoints are returning errors but outlier detection is not configured, traffic keeps going to the unhealthy endpoints. Always pair locality load balancing with outlier detection.

**All endpoints in one zone**: If all your endpoints are in the same zone, locality load balancing has no effect. You need endpoints in multiple zones or regions for it to matter.

**Uneven endpoint distribution**: If zone A has 10 pods and zone B has 2 pods, all traffic from zone A stays in zone A. This can overload zone B's pods if failover occurs. Try to keep endpoint counts roughly equal across zones.

**Cloud provider zone naming**: Different cloud providers use different naming conventions. AWS uses `us-east-1a`, GCP uses `us-central1-a`. Make sure your failover rules match the actual labels on your nodes.

Locality load balancing is one of those features that seems optional until you are paying thousands of dollars in cross-zone data transfer or seeing high latency from cross-region requests. Enable it early, configure outlier detection on your critical services, and you will have a mesh that automatically routes traffic efficiently.
