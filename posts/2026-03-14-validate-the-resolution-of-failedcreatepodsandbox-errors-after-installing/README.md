# Validating the Resolution of FailedCreatePodSandBox Errors After Installing Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Pods

Description: Learn systematic approaches to validate that FailedCreatePodSandBox errors have been fully resolved after troubleshooting Calico CNI issues in your Kubernetes cluster.

---

## Introduction

After troubleshooting FailedCreatePodSandBox errors in a Calico-based Kubernetes cluster, validation is a critical step that many teams skip. Simply seeing one pod come up successfully does not guarantee the issue is fully resolved. The error may recur under different conditions, on different nodes, or when specific workload types are scheduled.

Proper validation requires testing multiple dimensions: pod creation across all nodes, network connectivity between pods, Calico component health, and sustained operation over time. Without this comprehensive approach, you risk closing an incident prematurely only to have it reopen when the next deployment triggers the same failure.

This guide provides a structured validation framework that confirms your fix is complete and durable.

## Prerequisites

- A Kubernetes cluster with Calico CNI where FailedCreatePodSandBox errors were previously observed
- `kubectl` with cluster-admin access
- Access to schedule pods on specific nodes
- Basic familiarity with Calico resources and architecture

## Validating Pod Sandbox Creation Across All Nodes

Test pod creation on every node to confirm the fix is cluster-wide, not just on the node you repaired:

```bash
#!/bin/bash
# validate-sandbox-all-nodes.sh
# Creates a test pod on each node and verifies successful sandbox creation

NAMESPACE="sandbox-validation"
kubectl create namespace "$NAMESPACE" 2>/dev/null

# Get all schedulable nodes
NODES=$(kubectl get nodes --no-headers -o custom-columns=NAME:.metadata.name \
  | grep -v "NotReady")

FAILED=0
for NODE in $NODES; do
  POD_NAME="sandbox-test-$(echo $NODE | tr '.' '-')"
  echo "Testing node: $NODE"

  # Create a pod pinned to this specific node
  kubectl run "$POD_NAME" -n "$NAMESPACE" \
    --image=nginx:1.25 \
    --restart=Never \
    --overrides="{
      \"spec\": {
        \"nodeName\": \"$NODE\",
        \"tolerations\": [{
          \"operator\": \"Exists\"
        }]
      }
    }"

  # Wait for the pod to be ready
  if kubectl wait --for=condition=Ready "pod/$POD_NAME" \
    -n "$NAMESPACE" --timeout=120s 2>/dev/null; then
    echo "  PASS: Pod sandbox created successfully on $NODE"
  else
    echo "  FAIL: Pod sandbox creation failed on $NODE"
    kubectl describe pod "$POD_NAME" -n "$NAMESPACE" | grep -A5 "Events:"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Results: $FAILED failures out of $(echo $NODES | wc -w) nodes"

# Cleanup
kubectl delete namespace "$NAMESPACE" --wait=false
```

## Validating Calico Component Health

Verify all Calico components are running correctly after the fix:

```bash
# Check calico-node DaemonSet - all pods should be Ready
kubectl get daemonset calico-node -n calico-system \
  -o jsonpath='Desired: {.status.desiredNumberScheduled} Ready: {.status.numberReady}{"\n"}'

# Verify Felix is healthy on all nodes
for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[*].metadata.name}'); do
  NODE=$(kubectl get pod "$pod" -n calico-system -o jsonpath='{.spec.nodeName}')
  STATUS=$(kubectl exec -n calico-system "$pod" -- calico-node -felix-ready 2>&1)
  echo "$NODE ($pod): $STATUS"
done

# Verify CNI configuration exists on all nodes
for NODE in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  echo "--- $NODE ---"
  kubectl debug node/"$NODE" -it --image=busybox -- \
    test -f /host/etc/cni/net.d/10-calico.conflist && echo "CNI config: Present" || echo "CNI config: MISSING"
done
```

Check IPAM health:

```yaml
# Verify the IPPool is correctly configured
# Run: kubectl get ippools.crd.projectcalico.org default-ipv4-ippool -o yaml
# Expected output should show:
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
  # vxlanMode and disabled should NOT be set unless intentional
```

## Validating Network Connectivity Post-Fix

Pod sandbox creation is only the first step. Validate that pods can actually communicate:

```yaml
# network-validation.yaml
# Creates two pods to test cross-node network connectivity
apiVersion: v1
kind: Pod
metadata:
  name: net-validate-server
  namespace: default
  labels:
    app: net-validate
spec:
  containers:
    - name: server
      image: nginx:1.25
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Pod
metadata:
  name: net-validate-client
  namespace: default
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: net-validate
          topologyKey: kubernetes.io/hostname
  containers:
    - name: client
      image: busybox:1.36
      command: ["sleep", "3600"]
```

```bash
# Deploy validation pods
kubectl apply -f network-validation.yaml
kubectl wait --for=condition=Ready pod/net-validate-server --timeout=60s
kubectl wait --for=condition=Ready pod/net-validate-client --timeout=60s

# Test connectivity from client to server
SERVER_IP=$(kubectl get pod net-validate-server -o jsonpath='{.status.podIP}')
kubectl exec net-validate-client -- wget -qO- --timeout=5 "http://$SERVER_IP"

# Test DNS resolution
kubectl exec net-validate-client -- nslookup kubernetes.default.svc.cluster.local

# Cleanup
kubectl delete pod net-validate-server net-validate-client
```

## Sustained Validation with a DaemonSet

For production confidence, run a DaemonSet that continuously validates sandbox creation across the cluster:

```yaml
# sandbox-canary-daemonset.yaml
# Runs on every node to confirm sustained sandbox creation health
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: sandbox-canary
  namespace: kube-system
  labels:
    app: sandbox-canary
spec:
  selector:
    matchLabels:
      app: sandbox-canary
  template:
    metadata:
      labels:
        app: sandbox-canary
    spec:
      tolerations:
        - operator: Exists
      containers:
        - name: canary
          image: busybox:1.36
          command: ["sh", "-c", "echo sandbox-ok && sleep 3600"]
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
            limits:
              cpu: 50m
              memory: 32Mi
```

```bash
# Deploy and validate
kubectl apply -f sandbox-canary-daemonset.yaml

# Wait for all pods to be ready
kubectl rollout status daemonset/sandbox-canary -n kube-system --timeout=300s

# Verify all pods are running
kubectl get daemonset sandbox-canary -n kube-system

# After 24 hours of stable operation, clean up
kubectl delete daemonset sandbox-canary -n kube-system
```

## Verification

Run a final comprehensive check:

```bash
# Confirm zero FailedCreatePodSandBox events in the last hour
RECENT_FAILURES=$(kubectl get events --all-namespaces \
  --field-selector reason=FailedCreatePodSandBox \
  -o jsonpath='{.items}' | python3 -c "
import sys, json
from datetime import datetime, timezone, timedelta
events = json.load(sys.stdin)
cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
recent = [e for e in events if datetime.fromisoformat(e.get('lastTimestamp','2000-01-01T00:00:00Z').replace('Z','+00:00')) > cutoff]
print(len(recent))
")
echo "FailedCreatePodSandBox events in last hour: $RECENT_FAILURES"

# Verify all nodes have Ready status
kubectl get nodes -o wide | grep -v " Ready "
```

## Troubleshooting

- **Validation pods stuck in Pending**: Check for resource constraints with `kubectl describe pod <name>` and look for scheduling failures unrelated to CNI.
- **Pods start but cannot communicate**: This indicates the sandbox is created but Calico networking is not fully functional. Check `iptables -L -n` on the node and verify IPIP or VXLAN tunnels with `ip tunnel show` or `ip link show type vxlan`.
- **Intermittent failures on specific nodes**: The node may have a stale CNI configuration. Delete the calico-node pod on that node and wait for it to reinstall the CNI.
- **DaemonSet canary pods restart frequently**: Check for OOMKills or node-level issues unrelated to CNI with `kubectl describe pod <name>`.

## Conclusion

Validating the resolution of FailedCreatePodSandBox errors requires testing beyond a single pod on a single node. Use the multi-node sandbox creation test to confirm the fix is cluster-wide, verify Calico component health and IPAM status, test actual network connectivity, and deploy a canary DaemonSet for sustained confidence. Only after all these checks pass should you consider the incident fully resolved.
