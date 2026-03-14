# Testing Typha High Availability in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Testing, Hard Way

Description: Validate Typha HA by deliberately killing pods, draining nodes, and simulating zone failures - confirming that Felix agents maintain policy enforcement continuity through each disruption in a...

---

## Introduction

Declaring a Typha deployment "highly available" requires evidence, not assumptions. The only way to know whether HA configurations actually work is to exercise the failure scenarios they are designed to handle: pod crashes, node drains, and zone-level outages. These tests must be run against the actual production configuration - not just reviewed in manifests.

This post provides a set of destructive but safe HA tests for Typha, with clear pass/fail criteria for each.

---

## Prerequisites

- Typha deployed with 3 replicas, one per availability zone
- PodDisruptionBudget configured (`minAvailable: 2`)
- `kubectl` and `calicoctl` access
- A test network policy for validating enforcement continuity
- An understanding of the customization and setup posts in this series

---

## Step 1: Baseline - Confirm HA Configuration Before Testing

Before running any destructive test, confirm the expected HA state:

```bash
# Verify 3 replicas are running across 3 different nodes
kubectl get pods -n kube-system -l k8s-app=calico-typha -o wide

# Confirm PDB is configured
kubectl get pdb calico-typha-pdb -n kube-system \
  -o custom-columns='NAME:.metadata.name,MIN-AVAIL:.spec.minAvailable,CURRENT-HEALTHY:.status.currentHealthy'

# Verify zone distribution
kubectl get pods -n kube-system -l k8s-app=calico-typha \
  -o jsonpath='{range .items[*]}{.spec.nodeName}{"\n"}{end}' | while read node; do
  zone=$(kubectl get node "$node" \
    -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}')
  echo "$node: zone=$zone"
done
```

---

## Step 2: Test - Single Typha Pod Crash

Kill one Typha pod and verify that Felix agents on all nodes maintain connectivity and policy enforcement:

```bash
# Create a baseline policy before the test
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: ha-test-policy
spec:
  selector: "has(ha-test)"
  ingress:
    - action: Allow
  egress:
    - action: Allow
EOF

# Record the current connection distribution
echo "=== Pre-crash connection counts ==="
for pod in $(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name); do
  echo "$pod:"
  kubectl exec -n kube-system $pod -- wget -qO- \
    http://localhost:9093/metrics 2>/dev/null | grep typha_connections_active
done

# Delete one Typha pod to simulate a crash
VICTIM=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
echo "Deleting: $VICTIM"
kubectl delete $VICTIM -n kube-system

# Immediately verify Felix can still read policies (should not error)
sleep 5
calicoctl get globalnetworkpolicy ha-test-policy
echo "Policy still accessible: $?"

# Watch the Deployment recover
kubectl rollout status deployment/calico-typha -n kube-system

# Clean up
calicoctl delete globalnetworkpolicy ha-test-policy
```

Pass criteria: The policy remains accessible throughout the pod crash and recovery. No `Error` events in pod or Felix logs related to policy enforcement failure.

---

## Step 3: Test - Node Drain with PDB Enforcement

Drain the node hosting a Typha pod and confirm the PDB prevents the drain from evicting more than one pod:

```bash
# Find which node hosts a Typha pod
TYPHA_NODE=$(kubectl get pods -n kube-system -l k8s-app=calico-typha \
  -o jsonpath='{.items[0].spec.nodeName}')
echo "Draining node: $TYPHA_NODE"

# Attempt to drain the node (this should only evict 1 Typha pod, respecting the PDB)
kubectl drain "$TYPHA_NODE" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=120s

# After drain, confirm only 2 Typha pods remain (3rd is replaced on another node)
kubectl get pods -n kube-system -l k8s-app=calico-typha

# Verify the replacement pod scheduled on a different node
kubectl get pods -n kube-system -l k8s-app=calico-typha -o wide

# Uncordon the node to restore cluster to full capacity
kubectl uncordon "$TYPHA_NODE"

# Wait for Typha to reschedule back to 3 replicas
kubectl rollout status deployment/calico-typha -n kube-system
```

Pass criteria: The drain completes without timing out. At all times during the drain, at least 2 Typha pods are `Ready`. Felix agents connected to the evacuated pod reconnect to remaining replicas automatically.

---

## Step 4: Test - Rolling Restart of All Typha Pods

Simulate a certificate rotation or configuration rollout by performing a rolling restart and confirming no policy enforcement gap:

```bash
# Apply a test policy before the rolling restart
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: rolling-restart-test
spec:
  selector: "has(rolling-test)"
  ingress:
    - action: Allow
EOF

# Trigger rolling restart
kubectl rollout restart deployment/calico-typha -n kube-system

# Monitor restart progress
kubectl rollout status deployment/calico-typha -n kube-system

# Confirm policy is still present after restart
calicoctl get globalnetworkpolicy rolling-restart-test
echo "Policy survived rolling restart: $?"

# Clean up
calicoctl delete globalnetworkpolicy rolling-restart-test
```

---

## Step 5: Test - Connection Rebalancing After Scale-Up

Add a Typha replica and confirm connections redistribute:

```bash
# Record pre-scale connection counts
echo "=== Connection counts before scale ==="
for pod in $(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name); do
  kubectl exec -n kube-system $pod -- wget -qO- \
    http://localhost:9093/metrics 2>/dev/null | grep typha_connections_active
done

# Scale up by one replica
kubectl scale deployment calico-typha -n kube-system --replicas=4
kubectl rollout status deployment/calico-typha -n kube-system

# Check connection distribution after scale (allow 30s for reconnects)
sleep 30
echo "=== Connection counts after scale ==="
for pod in $(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name); do
  kubectl exec -n kube-system $pod -- wget -qO- \
    http://localhost:9093/metrics 2>/dev/null | grep typha_connections_active
done

# Scale back to 3
kubectl scale deployment calico-typha -n kube-system --replicas=3
```

---

## Best Practices

- Run HA tests in a staging cluster first to understand the expected behavior before executing them in production.
- Always check Felix logs on several nodes during each test to confirm no policy enforcement errors appear.
- Document the pass/fail results of each test in a test report and attach it to the cluster's operational documentation.
- Re-run the PDB drain test after every replica count change to confirm the PDB still prevents unsafe eviction.
- Schedule quarterly HA tests as part of your cluster reliability program - configuration drift can silently break HA guarantees.

---

## Conclusion

Testing Typha HA is not optional for production clusters. The tests in this post - pod crash, node drain with PDB enforcement, rolling restart, and connection rebalancing - exercise every HA mechanism you have configured. Passing all of them gives you evidence-based confidence that your Typha deployment is genuinely highly available.

---

*Track Typha availability metrics and get paged during HA degradation with [OneUptime](https://oneuptime.com).*
