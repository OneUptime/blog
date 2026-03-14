# How to Test Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Testing, Hard Way

Description: A guide to testing Typha's correctness, failover behavior, and policy propagation in a manually installed Calico cluster.

---

## Introduction

Testing Typha in a hard way installation covers three areas: functional correctness (policy updates propagate to all nodes through Typha), failover behavior (cluster continues to enforce existing policy when Typha is unavailable), and load testing (Typha handles all Felix connections and update rates expected in production). Each test requires a different approach and verifies a different aspect of Typha's operation.

## Test 1: Policy Propagation Through Typha

Verify that a NetworkPolicy applied to the API server reaches all nodes via Typha.

```bash
# Watch Typha update counter before test
kubectl port-forward -n calico-system deployment/calico-typha 9093:9093 &
BEFORE=$(curl -s http://localhost:9093/metrics | grep typha_updates_sent | awk '{print $2}')

# Apply a policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: typha-propagation-test
  namespace: default
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

sleep 5

AFTER=$(curl -s http://localhost:9093/metrics | grep typha_updates_sent | awk '{print $2}')
echo "Updates sent before: $BEFORE, after: $AFTER"
[ "$AFTER" -gt "$BEFORE" ] && echo "PASS: Typha propagated the update" || echo "FAIL: No update propagated"

kubectl delete networkpolicy typha-propagation-test
```

## Test 2: Policy Enforcement After Typha Restart

Felix caches the last known state from Typha. Restart Typha and verify existing policies are still enforced.

```bash
# Apply a deny policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: typha-failover-test
  namespace: default
spec:
  podSelector:
    matchLabels:
      test: isolated
  policyTypes: [Ingress]
EOF

kubectl run isolated-pod --image=nginx --labels="test=isolated" --restart=Never
kubectl run client --image=busybox --restart=Never -- sleep 3600

ISOLATED_IP=$(kubectl get pod isolated-pod -o jsonpath='{.status.podIP}')

# Restart Typha
kubectl rollout restart deployment/calico-typha -n calico-system
kubectl rollout status deployment/calico-typha -n calico-system --timeout=60s

# Policy should still be enforced (Felix retains state)
kubectl exec client -- wget --timeout=5 -qO- http://$ISOLATED_IP || echo "PASS: Policy enforced after Typha restart"

kubectl delete pod isolated-pod client
kubectl delete networkpolicy typha-failover-test
```

## Test 3: Felix Reconnects After Typha Restart

After Typha restarts, verify all Felix agents reconnect.

```bash
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
sleep 30  # Allow reconnect time

CONNECTIONS=$(curl -s http://localhost:9093/metrics | grep typha_connections_active | awk '{print $2}')
echo "Nodes: $NODE_COUNT, Active Typha connections: $CONNECTIONS"
[ "$CONNECTIONS" -ge "$NODE_COUNT" ] && echo "PASS: All Felix agents reconnected" || echo "FAIL: Missing connections"
```

## Test 4: Policy Propagation Latency

Measure the time from policy creation to Felix receiving the update.

```bash
START=$(date +%s%N)

kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: latency-test
  namespace: default
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

# Check Felix logs for the policy
while ! kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | grep "latency-test" >/dev/null 2>&1; do
  sleep 0.1
done

END=$(date +%s%N)
LATENCY_MS=$(( (END - START) / 1000000 ))
echo "Policy propagation latency: ${LATENCY_MS}ms"

kubectl delete networkpolicy latency-test
```

## Test 5: Multiple Felix Reconnections Under Load

Simulate rapid Felix reconnections by restarting the calico-node DaemonSet on a subset of nodes.

```bash
# Force a rollout of calico-node on worker nodes
kubectl rollout restart daemonset/calico-node -n calico-system
kubectl rollout status daemonset/calico-node -n calico-system --timeout=300s

# Check Typha connection count recovered
sleep 30
CONNECTIONS=$(curl -s http://localhost:9093/metrics | grep typha_connections_active | awk '{print $2}')
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
echo "Connection recovery: $CONNECTIONS / $NODE_COUNT nodes connected"
```

## Conclusion

Testing Typha in a hard way installation validates three key behaviors: correct policy propagation through Typha to all Felix agents, retained policy enforcement when Typha is unavailable (Felix failsafe mode), and Felix reconnection after Typha restarts. The propagation latency test provides a quantitative baseline for production performance expectations and helps detect Typha coalescing or resource issues before they affect users.
