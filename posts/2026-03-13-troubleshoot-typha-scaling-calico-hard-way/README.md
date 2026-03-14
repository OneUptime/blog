# Troubleshooting Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, Troubleshooting, CNI, Networking, Debugging

Description: Diagnose and resolve the most common Typha problems in a manifest-based Calico deployment - Felix reconnection loops, TLS handshake failures, connection imbalances, and Typha pods that fail to start.

---

## Introduction

When Typha misbehaves, the symptoms are often indirect: network policies stop updating on some nodes, Felix logs fill with reconnection errors, or pod networking becomes inconsistent across the cluster. Because Typha sits between Felix and the API server, a problem with any one of the three parties can surface as a Typha issue.

This post walks through the most common failure modes and the diagnostic steps to resolve each one.

---

## Prerequisites

- Typha deployed in `kube-system` per the setup post in this series
- `kubectl` access with the ability to exec into pods
- `calicoctl` v3.x configured
- Familiarity with the Typha architecture from the explain post

---

## Step 1: Check Typha Pod Status

Start every investigation by confirming Typha pods are running and ready:

```bash
# Show all Typha pods with their status and node placement
kubectl get pods -n kube-system -l k8s-app=calico-typha -o wide

# If pods are not Running, describe the pod to see events and conditions
kubectl describe pod -n kube-system -l k8s-app=calico-typha
```

Common pod status issues and their causes:

- `Pending` - the scheduler cannot place the pod, often due to strict anti-affinity with not enough distinct nodes available
- `CrashLoopBackOff` - Typha is starting but crashing; check logs immediately
- `ContainerCreating` - waiting on a Secret mount, usually TLS credentials that have not been created yet

---

## Step 2: Diagnose Felix Reconnection Loops

If Felix repeatedly disconnects and reconnects to Typha, you will see a pattern in Felix logs:

```bash
# Check Felix logs on a specific node for Typha connection errors
NODE_NAME="worker-01"
NODE_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=$NODE_NAME -o name)
kubectl logs -n kube-system $NODE_POD -c calico-node --tail=100 | grep -i typha
```

Common Felix-to-Typha error patterns:

```bash
# Error: "connection refused" on port 5473
# Cause: Typha Service does not exist or has no ready endpoints
kubectl get svc calico-typha -n kube-system
kubectl get endpoints calico-typha -n kube-system

# Error: "certificate verify failed" or "tls: bad certificate"
# Cause: mTLS misconfiguration - verify Felix and Typha share the same CA
kubectl get secret calico-typha-tls -n kube-system -o yaml | grep ca.crt | head -1
kubectl get secret calico-felix-tls -n kube-system -o yaml | grep ca.crt | head -1

# Error: "context deadline exceeded" connecting to Typha
# Cause: NetworkPolicy blocking port 5473 between Felix and Typha
kubectl get networkpolicy -n kube-system
```

---

## Step 3: Diagnose TLS Handshake Failures

TLS errors prevent Felix from connecting at all. Diagnose them step by step:

```bash
# Verify the CA cert in both Secrets is identical by comparing fingerprints
TYPHA_CA=$(kubectl get secret calico-typha-tls -n kube-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | openssl x509 -noout -fingerprint -sha256)
FELIX_CA=$(kubectl get secret calico-felix-tls -n kube-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | openssl x509 -noout -fingerprint -sha256)

echo "Typha CA fingerprint: $TYPHA_CA"
echo "Felix CA fingerprint: $FELIX_CA"
# These two lines must match exactly; if they differ, recreate one of the Secrets

# Check Typha server certificate CN matches typhaServerCN in FelixConfiguration
kubectl get secret calico-typha-tls -n kube-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -subject
# Expected: subject=CN=calico-typha

# Check Felix client certificate CN matches TYPHA_CLIENTCN in Typha env vars
kubectl get secret calico-felix-tls -n kube-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -subject
# Expected: subject=CN=calico-felix
```

---

## Step 4: Diagnose Connection Imbalance

If some Typha pods carry significantly more Felix connections than others:

```bash
# Check active connection count per Typha pod
for pod in $(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name); do
  echo "=== $pod ==="
  kubectl exec -n kube-system $pod -- wget -qO- http://localhost:9093/metrics 2>/dev/null \
    | grep typha_connections_active
done
```

If one pod has 50% or more connections than others, restart it to force Felix agents to reconnect and redistribute:

```bash
# Delete the overloaded pod; the Deployment controller will recreate it
kubectl delete pod -n kube-system <overloaded-typha-pod-name>

# Monitor redistribution over the next 30 seconds
watch -n 5 'kubectl get pods -n kube-system -l k8s-app=calico-typha'
```

---

## Step 5: Diagnose API Server Connectivity from Typha

If Typha cannot reach the API server, it cannot populate its cache and Felix agents receive no updates:

```bash
# Check Typha logs for API server errors
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl logs -n kube-system $TYPHA_POD --tail=50 | grep -iE "error|fail|apiserver|watch"

# Verify Typha's ServiceAccount can list the resources it needs to watch
kubectl auth can-i list nodes \
  --as=system:serviceaccount:kube-system:calico-typha
kubectl auth can-i list networkpolicies --all-namespaces \
  --as=system:serviceaccount:kube-system:calico-typha
# Both must return "yes"
```

---

## Step 6: Force a Clean Restart

When Typha appears stuck and logs show no progress, a rolling restart forces clean reconnections:

```bash
# Rolling restart - replaces pods one at a time, maintaining availability
kubectl rollout restart deployment/calico-typha -n kube-system

# Monitor the rollout until all new pods are ready
kubectl rollout status deployment/calico-typha -n kube-system
```

---

## Best Practices

- Keep Typha logs at `info` level in production so connection events are visible without excessive noise.
- Add a Prometheus alert for `up{job="calico-typha"} == 0` so you are paged when any Typha pod stops serving metrics.
- After any certificate rotation, perform a rolling restart of both Typha and the calico-node DaemonSet to pick up the new credentials.
- Use `kubectl rollout restart` rather than deleting pods directly; the Deployment controller maintains the replica count correctly.
- Document your typical `typha_connections_active` baseline; spikes above it indicate a reconnection storm worth investigating.

---

## Conclusion

Most Typha problems fall into three categories: pods not starting (scheduling or Secret issues), Felix unable to connect (TLS, Service, or firewall issues), and performance degradation (connection imbalance or API server latency). Working through each category systematically - pod status, Felix logs, TLS certificate validation, and metrics - quickly narrows down the root cause.

---

*Get alerted on Typha connectivity issues before they impact your cluster with [OneUptime](https://oneuptime.com).*
