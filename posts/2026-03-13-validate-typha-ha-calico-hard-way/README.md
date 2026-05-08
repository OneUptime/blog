# How to Validate Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Validation, Hard Way

Description: A guide to validating Typha HA including replica distribution, failover behavior, and policy propagation continuity during Typha pod failures.

---

## Introduction

Validating Typha HA confirms that the redundancy configuration actually provides the expected resilience. This requires more than checking that multiple replicas are running - it requires verifying that replicas are on different nodes, that connections are distributed, that failover is automatic when a replica fails, and that policy propagation continues uninterrupted during a failure. Each of these properties must be tested explicitly.

## Step 1: Validate Replica Placement

Confirm all Typha replicas are on different nodes.

```bash
CALICO_NAMESPACE=kube-system

kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-typha -o wide --no-headers | awk '{print $7}' | sort | uniq -d
```

If this command produces output, two Typha replicas are on the same node - anti-affinity is not working correctly. Expected output: empty (no duplicates).

## Step 2: Validate Zone Distribution (Multi-Zone Clusters)

```bash
CALICO_NAMESPACE=kube-system

kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-typha -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.nodeName}{"\n"}{end}' | \
  while read pod node; do
    zone=$(kubectl get node "$node" -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}')
    echo "$pod -> $node -> $zone"
  done
```

Typha pods should be spread across the available zones. A zone should not be overrepresented unless there are more Typha replicas than zones or the cluster has scheduling constraints that prevent even distribution.

## Step 3: Validate Connection Distribution

```bash
CALICO_NAMESPACE=kube-system
TYPHA_METRICS_PORT=9091

NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
TYPHA_REPLICAS=$(kubectl get deployment calico-typha -n "$CALICO_NAMESPACE" -o jsonpath='{.spec.replicas}')
EXPECTED_PER_REPLICA=$((NODE_COUNT / TYPHA_REPLICAS))

for pod in $(kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-typha -o name); do
  CONNECTIONS=$(kubectl exec -n "$CALICO_NAMESPACE" "$pod" -- \
    wget -qO- "http://localhost:${TYPHA_METRICS_PORT}/metrics" 2>/dev/null | \
    awk '/^typha_connections_streaming($|{)/ {sum += $2} END {print sum+0}')
  echo "$pod: $CONNECTIONS connections (expected ~$EXPECTED_PER_REPLICA)"
done
```

In larger clusters, connections should be reasonably close to the expected per-replica count. Small clusters can be uneven because Typha can handle hundreds of client connections per replica.

## Step 4: Validate Failover - Policy Propagation Continues

This is the most important HA validation test.

```bash
CALICO_NAMESPACE=kube-system
FELIX_METRICS_PORT=9091

# Apply a baseline policy

kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ha-validation-baseline
  namespace: default
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

# Delete one Typha pod (simulate failure)
TYPHA_POD=$(kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-typha -o name | head -1)
kubectl delete "$TYPHA_POD" -n "$CALICO_NAMESPACE" &

# Immediately apply a new policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ha-validation-during-failure
  namespace: default
spec:
  podSelector:
    matchLabels:
      test: ha-check
  policyTypes: [Egress]
EOF

sleep 30

# Check that Felix has observed the cluster policy count.
CALICO_NODE=$(kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-node -o name | head -1)
kubectl exec -n "$CALICO_NAMESPACE" "$CALICO_NODE" -c calico-node -- \
  wget -qO- "http://localhost:${FELIX_METRICS_PORT}/metrics" 2>/dev/null | \
  awk '/^felix_cluster_num_policies / {print}'

kubectl delete networkpolicy ha-validation-baseline ha-validation-during-failure
```

## Step 5: Validate PodDisruptionBudget Enforcement

During simulated maintenance (node drain), confirm PDB prevents Typha from going to zero replicas.

```bash
CALICO_NAMESPACE=kube-system

NODE=$(kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-typha -o jsonpath='{.items[0].spec.nodeName}')

# Attempt to drain the node - this should be blocked by PDB if it would violate minAvailable
kubectl drain "$NODE" --ignore-daemonsets --delete-emptydir-data --dry-run=server | grep typha
```

If Typha would violate the PDB, the drain reports it as blocked.

## Step 6: Validate Reconnection After Typha Restart

After deleting a Typha pod, measure how long it takes for Felix agents to reconnect.

```bash
CALICO_NAMESPACE=kube-system
TYPHA_METRICS_PORT=9091

START=$(date +%s)

# Delete a Typha pod
kubectl delete -n "$CALICO_NAMESPACE" "$(kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-typha -o name | head -1)"

# Wait until all expected connections are restored
TARGET=$(($(kubectl get nodes --no-headers | wc -l) * 9 / 10))
while true; do
  TOTAL=0
  for pod in $(kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-typha -o name); do
    COUNT=$(kubectl exec -n "$CALICO_NAMESPACE" "$pod" -- wget -qO- "http://localhost:${TYPHA_METRICS_PORT}/metrics" 2>/dev/null | awk '/^typha_connections_streaming($|{)/ {sum += $2} END {print sum+0}')
    TOTAL=$((TOTAL + COUNT))
  done
  [ "$TOTAL" -ge "$TARGET" ] && break
  sleep 5
done

END=$(date +%s)
echo "Reconnection completed in $((END - START)) seconds"
```

## Conclusion

Validating Typha HA requires testing replica placement (different nodes and zones), connection distribution balance, policy propagation continuity during a pod failure, PDB enforcement during maintenance, and reconnection time after a failure. These tests confirm that the HA configuration provides actual resilience - not just the appearance of it. Running these validation tests after initial HA setup and after significant cluster changes ensures the HA properties are maintained.
