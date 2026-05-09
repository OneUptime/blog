# How to Test Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Testing, Hard Way

Description: A guide to testing Typha's correctness, failover behavior, and policy propagation in a manually installed Calico cluster.

---

## Introduction

Testing Typha in a hard way installation covers three areas: functional correctness (policy updates propagate to all nodes through Typha), failover behavior (cluster continues to enforce existing policy when Typha is unavailable), and load testing (Typha handles all Felix connections and update rates expected in production). Each test requires a different approach and verifies a different aspect of Typha's operation.

## Test 1: Policy Propagation Through Typha

Verify that a NetworkPolicy applied to the API server is observed by Typha. These examples assume Typha Prometheus metrics are enabled; the default Typha metrics port is `9091` unless your manifest sets `TYPHA_PROMETHEUSMETRICSPORT` to another value.

```bash
# Watch Typha update counter before test
CALICO_NAMESPACE=${CALICO_NAMESPACE:-kube-system}
TYPHA_METRICS_PORT=${TYPHA_METRICS_PORT:-9091}

kubectl port-forward -n "$CALICO_NAMESPACE" deployment/calico-typha 9093:"$TYPHA_METRICS_PORT" &
PF_PID=$!
sleep 2

BEFORE=$(curl -s http://localhost:9093/metrics | awk '$1 ~ /^typha_updates_total(\{|$)/ {sum += $2} END {print sum+0}')

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

AFTER=$(curl -s http://localhost:9093/metrics | awk '$1 ~ /^typha_updates_total(\{|$)/ {sum += $2} END {print sum+0}')
echo "Updates observed before: $BEFORE, after: $AFTER"
[ "$AFTER" -gt "$BEFORE" ] && echo "PASS: Typha observed the update" || echo "FAIL: No update observed"

kubectl delete networkpolicy typha-propagation-test
kill "$PF_PID"
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
kubectl wait --for=condition=Ready pod/isolated-pod --timeout=60s
kubectl wait --for=condition=Ready pod/client --timeout=60s

ISOLATED_IP=$(kubectl get pod isolated-pod -o jsonpath='{.status.podIP}')

# Restart Typha
CALICO_NAMESPACE=${CALICO_NAMESPACE:-kube-system}
kubectl rollout restart deployment/calico-typha -n "$CALICO_NAMESPACE"
kubectl rollout status deployment/calico-typha -n "$CALICO_NAMESPACE" --timeout=60s

# Policy should still be enforced (Felix retains state)
if kubectl exec client -- wget --timeout=5 -qO- "http://$ISOLATED_IP" >/dev/null 2>&1; then
  echo "FAIL: Policy was not enforced after Typha restart"
else
  echo "PASS: Policy enforced after Typha restart"
fi

kubectl delete pod isolated-pod client
kubectl delete networkpolicy typha-failover-test
```

## Test 3: Felix Reconnects After Typha Restart

After Typha restarts, verify all Felix agents reconnect.

```bash
CALICO_NAMESPACE=${CALICO_NAMESPACE:-kube-system}
TYPHA_METRICS_PORT=${TYPHA_METRICS_PORT:-9091}
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
sleep 30  # Allow reconnect time

sum_typha_metric() {
  metric=$1
  total=0
  local_port=19091
  for pod in $(kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-typha -o jsonpath='{.items[*].metadata.name}'); do
    kubectl port-forward -n "$CALICO_NAMESPACE" "pod/$pod" "$local_port:$TYPHA_METRICS_PORT" >/tmp/"$pod".port-forward.log 2>&1 &
    pf_pid=$!
    sleep 2
    value=$(curl -s "http://localhost:$local_port/metrics" | awk -v m="$metric" '$1 ~ "^" m "(\\{|$)" {sum += $2} END {print sum+0}')
    kill "$pf_pid" >/dev/null 2>&1 || true
    total=$((total + value))
    local_port=$((local_port + 1))
  done
  echo "$total"
}

CONNECTIONS=$(sum_typha_metric typha_connections_streaming)
echo "Nodes: $NODE_COUNT, Streaming Typha connections: $CONNECTIONS"
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
CALICO_NAMESPACE=${CALICO_NAMESPACE:-kube-system}
while ! kubectl logs -n "$CALICO_NAMESPACE" -l k8s-app=calico-node -c calico-node --since=2m | grep "latency-test" >/dev/null 2>&1; do
  sleep 0.1
done

END=$(date +%s%N)
LATENCY_MS=$(( (END - START) / 1000000 ))
echo "Policy propagation latency: ${LATENCY_MS}ms"

kubectl delete networkpolicy latency-test
```

## Test 5: Multiple Felix Reconnections Under Load

Simulate rapid Felix reconnections by restarting the calico-node DaemonSet.

```bash
# Force a rollout of calico-node
CALICO_NAMESPACE=${CALICO_NAMESPACE:-kube-system}
TYPHA_METRICS_PORT=${TYPHA_METRICS_PORT:-9091}
kubectl rollout restart daemonset/calico-node -n "$CALICO_NAMESPACE"
kubectl rollout status daemonset/calico-node -n "$CALICO_NAMESPACE" --timeout=300s

# Check Typha connection count recovered
sleep 30
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
sum_typha_metric() {
  metric=$1
  total=0
  local_port=19091
  for pod in $(kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-typha -o jsonpath='{.items[*].metadata.name}'); do
    kubectl port-forward -n "$CALICO_NAMESPACE" "pod/$pod" "$local_port:$TYPHA_METRICS_PORT" >/tmp/"$pod".port-forward.log 2>&1 &
    pf_pid=$!
    sleep 2
    value=$(curl -s "http://localhost:$local_port/metrics" | awk -v m="$metric" '$1 ~ "^" m "(\\{|$)" {sum += $2} END {print sum+0}')
    kill "$pf_pid" >/dev/null 2>&1 || true
    total=$((total + value))
    local_port=$((local_port + 1))
  done
  echo "$total"
}

CONNECTIONS=$(sum_typha_metric typha_connections_streaming)
echo "Connection recovery: $CONNECTIONS / $NODE_COUNT nodes connected"
```

## Conclusion

Testing Typha in a hard way installation validates three key behaviors: correct policy propagation through Typha to Felix agents, retained policy enforcement when Typha is unavailable because Felix keeps its last applied dataplane state, and Felix reconnection after Typha restarts. The propagation latency test provides a quantitative baseline for production performance expectations and helps detect Typha coalescing or resource issues before they affect users.
