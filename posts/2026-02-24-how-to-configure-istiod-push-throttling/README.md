# How to Configure Istiod Push Throttling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, Push Throttling, Performance, Configuration

Description: How to configure istiod push throttling to control the rate of xDS configuration updates sent to Envoy proxies and prevent control plane overload.

---

Every time a service endpoint changes, a VirtualService is updated, or a new pod joins the mesh, istiod needs to push updated configuration to the affected Envoy proxies. In a busy cluster, these events can cascade into hundreds or thousands of pushes per second. Without throttling, istiod can get overwhelmed, causing high latency, memory spikes, and even OOM kills.

Push throttling controls how istiod batches and rate-limits these configuration updates. Configuring it properly keeps the control plane healthy without sacrificing configuration propagation speed.

## How Istiod Pushes Work

When a change is detected (endpoint update, config change, etc.), istiod does not immediately push to every proxy. Instead:

1. The change is added to a push queue
2. Istiod debounces the change, waiting briefly for more changes to arrive
3. After the debounce window, istiod starts a push cycle
4. During the push cycle, istiod generates xDS configuration and sends it to affected proxies
5. Pushes are rate-limited to prevent overloading istiod or the proxies

Check current push activity:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds_push
```

## Debounce Configuration

Debouncing batches rapid changes together. Instead of pushing after every single endpoint change during a rolling deployment, istiod waits for the changes to settle.

Two environment variables control debouncing:

**PILOT_DEBOUNCE_AFTER**: The quiet period to wait after the last change before starting a push. Default is 100ms.

**PILOT_DEBOUNCE_MAX**: The maximum time to wait before pushing, even if changes keep coming. Default is 10 seconds.

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
        - name: PILOT_DEBOUNCE_AFTER
          value: "100ms"
        - name: PILOT_DEBOUNCE_MAX
          value: "10s"
```

For clusters with frequent endpoint changes (many rolling deployments, autoscaling):

```yaml
env:
- name: PILOT_DEBOUNCE_AFTER
  value: "200ms"
- name: PILOT_DEBOUNCE_MAX
  value: "15s"
```

Increasing `PILOT_DEBOUNCE_AFTER` reduces push frequency but adds latency to configuration propagation. Increasing `PILOT_DEBOUNCE_MAX` prevents push starvation during continuous changes.

Monitor debounce behavior:

```promql
# Push events that were debounced
rate(pilot_debounce_send[5m])

# How often the max debounce time was hit
rate(pilot_debounce_max[5m])
```

## Push Throttling

The `PILOT_PUSH_THROTTLE` environment variable limits how many proxies istiod pushes to concurrently:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
        - name: PILOT_PUSH_THROTTLE
          value: "100"
```

The default value is 0, which means no limit. Setting it to 100 means istiod will push to at most 100 proxies concurrently during a push cycle.

When to use push throttling:

- Large meshes with 500+ proxies where full pushes spike CPU and memory
- After istiod restarts when all proxies reconnect simultaneously
- When istiod is CPU-bound and push generation is causing latency

The tradeoff is that throttling slows down configuration convergence. With 1000 proxies and a throttle of 100, a full push takes at least 10 rounds.

## EDS Debouncing

Endpoint Discovery Service (EDS) pushes happen whenever pod IPs change, which is frequent during deployments. Istiod has specific settings for EDS debouncing:

**PILOT_ENABLE_EDS_DEBOUNCE**: Controls whether EDS updates are debounced. Default is true.

```yaml
env:
- name: PILOT_ENABLE_EDS_DEBOUNCE
  value: "true"
```

When enabled, multiple endpoint changes within the debounce window are combined into a single EDS push. This is almost always what you want because rolling deployments generate many endpoint changes in quick succession.

## Push Request Merging

Istiod merges push requests that affect the same proxy. If a proxy needs both CDS and EDS updates, they are merged into a single push instead of two separate pushes.

You can see the merge behavior in the logs:

```bash
kubectl logs -n istio-system deploy/istiod | grep "Push debounce stable"
```

The log entry shows how many changes were merged and what types of pushes are needed.

## Configuring for Different Cluster Sizes

### Small Cluster (up to 50 proxies)

No throttling needed. Use default debounce settings for fast configuration propagation:

```yaml
env:
- name: PILOT_DEBOUNCE_AFTER
  value: "100ms"
- name: PILOT_DEBOUNCE_MAX
  value: "10s"
```

### Medium Cluster (50-500 proxies)

Slightly increased debounce to handle deployment churn:

```yaml
env:
- name: PILOT_DEBOUNCE_AFTER
  value: "200ms"
- name: PILOT_DEBOUNCE_MAX
  value: "10s"
- name: PILOT_PUSH_THROTTLE
  value: "100"
```

### Large Cluster (500+ proxies)

Aggressive debouncing and throttling:

```yaml
env:
- name: PILOT_DEBOUNCE_AFTER
  value: "500ms"
- name: PILOT_DEBOUNCE_MAX
  value: "15s"
- name: PILOT_PUSH_THROTTLE
  value: "200"
```

### Very Large Cluster (2000+ proxies)

Consider multiple istiod replicas with push throttling:

```yaml
spec:
  components:
    pilot:
      k8s:
        replicaCount: 5
        env:
        - name: PILOT_DEBOUNCE_AFTER
          value: "500ms"
        - name: PILOT_DEBOUNCE_MAX
          value: "20s"
        - name: PILOT_PUSH_THROTTLE
          value: "300"
        resources:
          requests:
            cpu: "2"
            memory: 4Gi
          limits:
            cpu: "4"
            memory: 8Gi
```

## Monitoring Push Performance

Track these metrics to know if your throttling settings are appropriate:

```promql
# Push rate
sum(rate(pilot_xds_pushes[5m])) by (type)

# Push latency p99
histogram_quantile(0.99, sum(rate(pilot_xds_push_time_bucket[5m])) by (le))

# Proxy convergence time (full push cycle)
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))

# Push queue size
pilot_push_triggers

# Debounce metrics
rate(pilot_debounce_send[5m])
rate(pilot_debounce_max[5m])
```

If `pilot_proxy_convergence_time` is consistently high (above 5 seconds), your throttling might be too aggressive. If istiod CPU and memory spike during pushes, increase throttling.

## Handling Burst Scenarios

Some events cause a burst of changes that overwhelm even throttled pushes:

- **Cluster autoscaler adding nodes**: Many pods start simultaneously
- **Large deployment rollouts**: Hundreds of endpoint changes
- **Istio upgrade**: All proxy configurations need updating

For burst scenarios, the debounce max setting is your friend. A higher `PILOT_DEBOUNCE_MAX` collapses more changes into fewer push cycles:

```yaml
env:
- name: PILOT_DEBOUNCE_MAX
  value: "30s"
```

30 seconds means that during a burst, istiod will collect up to 30 seconds of changes before pushing. This produces fewer, larger pushes instead of many small ones.

## Testing Push Throttling

To test your settings, simulate a burst of changes:

```bash
# Create many services quickly
for i in $(seq 1 50); do
  kubectl create deployment test-$i --image=nginx -n test-namespace &
done
wait
```

Watch istiod during the burst:

```bash
kubectl logs -n istio-system deploy/istiod -f | grep "Push debounce"
```

Check push latency during the burst:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds_push_time
```

Clean up:

```bash
for i in $(seq 1 50); do
  kubectl delete deployment test-$i -n test-namespace &
done
wait
```

Push throttling is a balancing act between configuration propagation speed and control plane stability. Start with conservative settings and reduce throttling as you gain confidence in your istiod capacity.
