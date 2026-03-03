# How to Upgrade Istio Data Plane Proxies Independently

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Data Plane, Proxy Upgrade

Description: How to upgrade Istio sidecar proxies independently from the control plane, including techniques for selective and gradual proxy updates.

---

When people talk about Istio upgrades, they usually mean upgrading the control plane. But the data plane - the sidecar proxies running alongside every workload - is a separate upgrade concern. Istio supports running the data plane at a different version than the control plane (within limits), and there are good reasons to upgrade proxies independently.

Maybe you upgraded the control plane during a maintenance window but could not restart all workloads at the same time. Maybe you want to upgrade a few critical services first and wait before touching the rest. Maybe different teams own different services and upgrade on their own schedule. This guide covers the techniques for managing data plane proxy upgrades separately from the control plane.

## Control Plane vs Data Plane Version Skew

Istio officially supports the control plane being one minor version ahead of the data plane. If your control plane is 1.21, your proxies can be 1.20 or 1.21. Running proxies at 1.19 with a 1.21 control plane is not supported.

Check your current version skew:

```bash
istioctl version
```

```text
client version: 1.21.0
control plane version: 1.21.0
data plane version: 1.20.5 (45 proxies), 1.21.0 (12 proxies)
```

This output tells you that 45 proxies are still on the old version and 12 have been updated. The mixed state is fine as long as the skew is within one minor version.

## Tracking Proxy Versions

Before upgrading anything, know where each proxy stands:

```bash
# List all proxies and their versions
istioctl proxy-status
```

For a cleaner summary:

```bash
# Count proxies by version
istioctl proxy-status -o json | jq -r '.[] | .proxy.istioVersion' | sort | uniq -c
```

To see which namespaces still need updating:

```bash
istioctl proxy-status -o json | jq -r '.[] | select(.proxy.istioVersion != "1.21.0") | .proxy.metadata.namespace' | sort | uniq -c
```

## Method 1: Rolling Restart by Namespace

The most common approach is restarting deployments namespace by namespace. This triggers new pod creation, and the new pods get the latest sidecar from the control plane.

```bash
# Upgrade proxies in the staging namespace first
kubectl rollout restart deployment -n staging
kubectl rollout status deployment -n staging --timeout=600s

# Check that proxies are updated
istioctl proxy-status | grep staging
```

Create a prioritized list of namespaces:

```bash
#!/bin/bash
# Priority order: least critical to most critical
NAMESPACES=(
  "internal-tools"
  "monitoring"
  "staging"
  "backend-batch"
  "backend-api"
  "frontend"
  "payment-service"
)

for ns in "${NAMESPACES[@]}"; do
  echo "=== Upgrading proxies in $ns ==="
  kubectl rollout restart deployment -n $ns
  kubectl rollout status deployment -n $ns --timeout=600s

  # Quick validation
  ERRORS=$(kubectl logs -n $ns -l app --container istio-proxy --tail=20 2>/dev/null | grep -c "error")
  if [ "$ERRORS" -gt 0 ]; then
    echo "WARNING: Found $ERRORS errors in $ns proxy logs"
    echo "Pausing upgrade. Investigate before continuing."
    exit 1
  fi

  echo "Waiting 60 seconds before next namespace..."
  sleep 60
done
```

## Method 2: Selective Pod-Level Upgrade

Sometimes you want to upgrade specific pods rather than entire deployments. This is useful when a deployment has many replicas and you want to test with just one.

Delete a single pod and let the deployment controller create a new one with the updated sidecar:

```bash
# Get a list of pods with old proxy version
kubectl get pods -n my-app -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[?(@.name=="istio-proxy")].image}{"\n"}{end}'

# Delete one pod to test
kubectl delete pod my-service-abc123 -n my-app
```

The replacement pod gets the new sidecar. Monitor it to make sure it works:

```bash
kubectl logs -n my-app my-service-<new-pod-id> -c istio-proxy --tail=50
```

## Method 3: Using Proxy Image Annotation

You can force a specific proxy version at the pod level using annotations, without upgrading the control plane:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyImage: docker.io/istio/proxyv2:1.21.0
```

This overrides the default proxy image that the control plane injects. It is useful for testing a new proxy version with specific workloads before updating the control plane.

Apply the change:

```bash
kubectl apply -f deployment-with-proxy-annotation.yaml
```

The deployment will roll out new pods with the specified proxy version.

Remove the annotation after the control plane catches up:

```bash
kubectl annotate deployment my-service -n my-app sidecar.istio.io/proxyImage-
kubectl rollout restart deployment my-service -n my-app
```

## Method 4: Gradual Rollout with Labels

Use pod labels to track upgrade progress and control the rollout:

```bash
# Label pods that have been upgraded
kubectl label pods -n my-app -l app=my-service proxy-upgraded=true --overwrite
```

Build a dashboard or script that tracks the percentage of upgraded pods:

```bash
TOTAL=$(kubectl get pods -n my-app -l app=my-service --no-headers | wc -l)
UPGRADED=$(kubectl get pods -n my-app -l app=my-service,proxy-upgraded=true --no-headers | wc -l)
echo "Upgrade progress: $UPGRADED / $TOTAL pods"
```

## Handling StatefulSets

StatefulSets need extra care because they update pods in ordinal order and maintain persistent identity:

```bash
# StatefulSets update in reverse ordinal order by default
kubectl rollout restart statefulset my-stateful-app -n my-app
```

If you need more control, update pods one at a time using partition-based rolling updates:

```bash
# Update only pods with ordinal >= 2 (i.e., pod-2, pod-3, etc.)
kubectl patch statefulset my-stateful-app -n my-app -p '{"spec":{"updateStrategy":{"type":"RollingUpdate","rollingUpdate":{"partition":2}}}}'
kubectl rollout restart statefulset my-stateful-app -n my-app
```

After verifying those pods are healthy, reduce the partition:

```bash
# Update pods with ordinal >= 1
kubectl patch statefulset my-stateful-app -n my-app -p '{"spec":{"updateStrategy":{"type":"RollingUpdate","rollingUpdate":{"partition":1}}}}'
kubectl rollout restart statefulset my-stateful-app -n my-app
```

## Handling DaemonSets

DaemonSets running Istio proxies (less common, but it happens):

```bash
kubectl rollout restart daemonset my-daemonset -n my-app
kubectl rollout status daemonset my-daemonset -n my-app
```

DaemonSets update one node at a time by default, which naturally limits the blast radius.

## Monitoring During Data Plane Upgrades

Set up real-time monitoring during the proxy upgrade:

```bash
# Watch proxy versions change in real time
watch -n 5 'istioctl proxy-status | tail -20'
```

Check for common issues:

```bash
# Connection errors
kubectl logs -n my-app -l app=my-service -c istio-proxy --tail=50 | grep "upstream connect error\|connection refused\|no healthy upstream"

# TLS errors
kubectl logs -n my-app -l app=my-service -c istio-proxy --tail=50 | grep "TLS\|handshake\|certificate"

# Config sync errors
istioctl proxy-status | grep STALE
```

## Verifying Cross-Version Communication

During a mixed-version rollout, older proxies and newer proxies need to communicate. Verify this is working:

```bash
# Test from an old-version pod to a new-version pod
kubectl exec -n my-app old-pod -c istio-proxy -- curl -s new-service.my-app:80

# Test from a new-version pod to an old-version pod
kubectl exec -n my-app new-pod -c istio-proxy -- curl -s old-service.my-app:80
```

Both directions should work. If you see TLS errors, there might be a certificate compatibility issue between versions.

## When to Avoid Independent Data Plane Upgrades

There are situations where you should upgrade the data plane together with the control plane:

- **Security patches.** If the new version fixes a CVE in the proxy, delay means your workloads remain vulnerable.
- **Critical bug fixes.** If a proxy bug is causing issues, upgrade all affected proxies as fast as possible.
- **Major version changes.** For significant version jumps, minimize the time spent in a mixed state.

In these cases, a faster rollout (even at the cost of some disruption) is the right call.

## Summary

Upgrading Istio data plane proxies independently from the control plane gives you flexibility and control. Use namespace-by-namespace rolling restarts for the standard case, pod-level deletion for targeted testing, proxy image annotations for version pinning, and partition-based updates for StatefulSets. Monitor continuously during the rollout, verify cross-version communication, and stay within the one-minor-version skew limit. The ability to pace your data plane upgrades separately from the control plane is one of Istio's most practical operational features.
