# How to Validate Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Validation, Hard Way

Description: A guide to validating Typha HA including replica distribution, failover behavior, and policy propagation continuity during Typha pod failures.

---

## Introduction

Validating Typha HA confirms that the redundancy configuration actually provides the expected resilience. This requires more than checking that multiple replicas are running — it requires verifying that replicas are on different nodes, that connections are distributed, that failover is automatic when a replica fails, and that policy propagation continues uninterrupted during a failure. Each of these properties must be tested explicitly.

## Step 1: Validate Replica Placement

Confirm all Typha replicas are on different nodes.

```bash
kubectl get pods -n calico-system -l app=calico-typha -o wide | awk '{print $7}' | sort | uniq -d
```

If this command produces output, two Typha replicas are on the same node — anti-affinity is not working correctly. Expected output: empty (no duplicates).

## Step 2: Validate Zone Distribution (Multi-Zone Clusters)

```bash
kubectl get pods -n calico-system -l app=calico-typha -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.nodeName}{"\n"}{end}' | \
  while read pod node; do
    zone=$(kubectl get node $node -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}')
    echo "$pod -> $node -> $zone"
  done
```

Each Typha pod should be in a different zone.

## Step 3: Validate Connection Distribution

```bash
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
TYPHA_REPLICAS=$(kubectl get deployment calico-typha -n calico-system -o jsonpath='{.spec.replicas}')
EXPECTED_PER_REPLICA=$((NODE_COUNT / TYPHA_REPLICAS))

for pod in $(kubectl get pods -n calico-system -l app=calico-typha -o name); do
  CONNECTIONS=$(kubectl exec -n calico-system $pod -- \
    wget -qO- http://localhost:9093/metrics 2>/dev/null | \
    grep typha_connections_active | awk '{print $2}')
  echo "$pod: $CONNECTIONS connections (expected ~$EXPECTED_PER_REPLICA)"
done
```

Connections should be within 20% of the expected per-replica count.

## Step 4: Validate Failover — Policy Propagation Continues

This is the most important HA validation test.

```bash
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
TYPHA_POD=$(kubectl get pods -n calico-system -l app=calico-typha -o name | head -1)
kubectl delete $TYPHA_POD -n calico-system &

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

# Check that the new policy was programmed on nodes
kubectl debug node/<node-name> -it --image=busybox -- \
  chroot /host iptables -L | grep "ha-validation" | wc -l

kubectl delete networkpolicy ha-validation-baseline ha-validation-during-failure
```

## Step 5: Validate PodDisruptionBudget Enforcement

During simulated maintenance (node drain), confirm PDB prevents Typha from going to zero replicas.

```bash
NODE=$(kubectl get pods -n calico-system -l app=calico-typha -o jsonpath='{.items[0].spec.nodeName}')

# Attempt to drain the node — this should be blocked by PDB if it would violate minAvailable
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data --dry-run | grep typha
```

If Typha would violate the PDB, the drain reports it as blocked.

## Step 6: Validate Reconnection After Typha Restart

After deleting a Typha pod, measure how long it takes for Felix agents to reconnect.

```bash
START=$(date +%s)

# Delete a Typha pod
kubectl delete pod -n calico-system $(kubectl get pods -n calico-system -l app=calico-typha -o name | head -1 | sed 's|pod/||')

# Wait until all expected connections are restored
TARGET=$(($(kubectl get nodes --no-headers | wc -l) * 9 / 10))
while true; do
  TOTAL=0
  for pod in $(kubectl get pods -n calico-system -l app=calico-typha -o name); do
    COUNT=$(kubectl exec -n calico-system $pod -- wget -qO- http://localhost:9093/metrics 2>/dev/null | grep typha_connections_active | awk '{print $2}')
    TOTAL=$((TOTAL + COUNT))
  done
  [ "$TOTAL" -ge "$TARGET" ] && break
  sleep 5
done

END=$(date +%s)
echo "Reconnection completed in $((END - START)) seconds"
```

## Conclusion

Validating Typha HA requires testing replica placement (different nodes and zones), connection distribution balance, policy propagation continuity during a pod failure, PDB enforcement during maintenance, and reconnection time after a failure. These tests confirm that the HA configuration provides actual resilience — not just the appearance of it. Running these validation tests after initial HA setup and after significant cluster changes ensures the HA properties are maintained.
