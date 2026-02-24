# How to Handle Istiod Restart Impact on Data Plane

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, Data Plane, Restart, Resilience

Description: What happens to the Istio data plane when istiod restarts, how to minimize the impact on running services, and strategies for graceful control plane recovery.

---

When istiod restarts, whether from an upgrade, an OOM kill, a node failure, or a manual restart, there is always a question: what happens to the services that are already running? The short answer is that your data plane keeps working. Envoy proxies do not stop routing traffic just because the control plane is temporarily unavailable. But there are side effects you need to be aware of, and the way istiod comes back online matters for how quickly the mesh fully recovers.

## What Happens During an Istiod Restart

When istiod goes down:

1. **All xDS connections break**: Every Envoy proxy loses its gRPC connection to istiod
2. **Proxies keep running with cached config**: Envoy stores its configuration in memory. It continues routing traffic based on the last configuration it received.
3. **No new configuration updates**: Any changes made during the downtime (new VirtualServices, endpoint changes) will not reach proxies until istiod is back.
4. **Sidecar injection stops**: New pods created during the downtime will either fail (if failurePolicy is Fail) or start without sidecars (if failurePolicy is Ignore).
5. **Certificate rotation pauses**: Workload certificates cannot be renewed while the CA is unavailable.

When istiod comes back:

1. **All proxies reconnect simultaneously**: This is the "thundering herd" problem
2. **Full configuration push to all proxies**: Each proxy receives a complete configuration update
3. **Sidecar injection resumes**: Pending pod creations can proceed
4. **Certificate signing resumes**: Any pending CSRs are processed

## The Thundering Herd Problem

The most impactful part of an istiod restart is the reconnection phase. Every proxy in the mesh tries to reconnect at the same time, and each one expects a full configuration push. For a mesh with 1000 proxies, this means istiod needs to:

- Accept 1000 gRPC connections
- Generate xDS configuration for each proxy
- Push all configurations simultaneously

This can spike CPU and memory well above steady-state levels. If istiod does not have enough resources, it can OOM again, creating a restart loop.

Monitor the reconnection:

```bash
# Watch connections recovering
watch "kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds_connected"
```

## Minimizing Restart Impact

### 1. Run Multiple Replicas

The most effective mitigation is running multiple istiod replicas. If one replica restarts, proxies connected to it reconnect to other healthy replicas. The overall mesh impact is limited to a partial reconnection:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
```

With 3 replicas, a single replica restart only affects ~33% of proxies.

### 2. Use Pod Disruption Budgets

Prevent all replicas from going down at once during upgrades or node maintenance:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istiod
```

### 3. Configure Push Throttling for Recovery

Push throttling limits how many proxies receive configuration concurrently, smoothing out the reconnection spike:

```yaml
env:
- name: PILOT_PUSH_THROTTLE
  value: "100"
```

With a throttle of 100, istiod processes 100 proxy connections at a time instead of all at once. This takes longer for full convergence but prevents resource spikes.

### 4. Over-Provision Resources

Ensure istiod has enough resources to handle the reconnection burst. The restart memory peak can be 2-3x the steady-state usage:

```yaml
resources:
  requests:
    cpu: "2"
    memory: 4Gi
  limits:
    cpu: "4"
    memory: 8Gi
```

### 5. Set Appropriate Memory and CPU Limits

Avoid OOM kills by setting limits based on peak usage, not average usage:

```bash
# Check peak memory from metrics history
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep go_memstats_heap_inuse
```

Set the memory limit to at least 2x the normal heap usage to account for reconnection spikes.

## Impact on Active Traffic

During the restart window, existing traffic continues to flow normally because Envoy proxies operate independently of istiod. However, there are edge cases:

**Endpoint staleness**: If pods are created or destroyed during the downtime, the Envoy EDS configuration becomes stale. Traffic might be sent to pods that no longer exist (resulting in connection errors) or might not reach new pods.

How long this matters depends on your traffic patterns. For most services, a few seconds of stale endpoints is tolerable. For services with very fast scaling (like burst workers), it can be a problem.

**Certificate expiration**: If the istiod downtime overlaps with certificate rotation for any workload, that workload's certificate will expire. Expired certificates cause mTLS failures.

Check certificate expiration times:

```bash
istioctl proxy-config secret my-pod -o json | jq '.[0].certificate_chain | .[0].valid_from, .[0].expiration_time'
```

Default certificate TTL is 24 hours, so a brief istiod restart (minutes) is not a problem. Extended outages (hours) could overlap with rotation.

## Handling Rolling Upgrades

During an Istio upgrade, istiod replicas are replaced one at a time. This is the best scenario because at least some replicas are always available:

```bash
# Check rollout status during upgrade
kubectl rollout status deployment istiod -n istio-system
```

To upgrade gracefully:

1. Ensure you have multiple replicas before upgrading
2. Set a PDB to keep at least one replica available
3. Monitor xDS connection count during the rollout:

```promql
sum(pilot_xds_connected)
```

The connection count should dip slightly as each replica restarts and recover as proxies reconnect to the remaining replicas.

## Post-Restart Verification

After istiod restarts, verify the mesh is healthy:

### Check All Proxies Are Connected

```bash
istioctl proxy-status
```

All proxies should show `SYNCED`. If any show `STALE` after a few minutes, investigate their connection.

### Compare Expected vs. Actual Connection Count

```bash
# Expected (number of sidecar pods)
kubectl get pods --all-namespaces -o json | jq '[.items[] | select(.spec.containers[].name == "istio-proxy")] | length'

# Actual
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds_connected
```

### Verify Configuration Is Current

Pick a random pod and check its configuration:

```bash
istioctl proxy-config routes <pod-name>.<namespace>
```

Make sure the routes match your current VirtualService definitions.

### Check for Push Errors

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds_push_errors
```

Errors after a restart could indicate configuration problems that were masked before.

## Recovery Time Expectations

How long until the mesh is fully recovered after an istiod restart?

- **1-50 proxies**: Under 10 seconds
- **50-500 proxies**: 10-60 seconds
- **500-2000 proxies**: 1-5 minutes
- **2000+ proxies**: 5-15 minutes depending on throttling

These are rough estimates. Actual recovery time depends on configuration complexity, istiod resources, and push throttling settings.

## Automating Recovery Checks

Create a simple script to verify mesh health after restarts:

```bash
#!/bin/bash
echo "Checking istiod health..."
kubectl get pods -n istio-system -l app=istiod

echo ""
echo "Connected proxies:"
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics 2>/dev/null | grep pilot_xds_connected

echo ""
echo "Push errors:"
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics 2>/dev/null | grep pilot_xds_push_errors

echo ""
echo "Proxy status:"
istioctl proxy-status 2>/dev/null | head -20

echo ""
echo "Stale proxies:"
istioctl proxy-status 2>/dev/null | grep STALE | wc -l
```

The resilience of the Envoy data plane during control plane outages is one of Istio's best features. Your services keep running even when istiod is down. But understanding the recovery process and preparing for the reconnection spike ensures that the restart is a non-event for your users rather than a mini-outage.
