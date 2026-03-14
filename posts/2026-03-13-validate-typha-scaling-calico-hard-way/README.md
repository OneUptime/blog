# Validating Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, Validation, CNI, Networking, Reliability

Description: Systematically validate a Typha deployment in a manifest-based Calico installation — confirming correct replica counts, Felix connectivity, policy propagation timing, and Prometheus metric availability before declaring the deployment production-ready.

---

## Introduction

Validation is different from testing. Testing checks that specific behaviors work. Validation checks that the entire system meets its operational requirements before you declare it production-ready. For Typha, this means running a checklist that confirms every component is configured correctly, healthy, and performing within expected bounds.

This post provides a structured validation checklist and the commands to execute each check.

---

## Prerequisites

- Typha deployed and configured per the earlier posts in this series
- `kubectl` and `calicoctl` access
- Prometheus metrics enabled on Typha
- At least 5 minutes of Typha running time so metrics have accumulated

---

## Step 1: Validate Typha Pod Health

```bash
# All Typha pods must be Running with all containers ready
kubectl get pods -n kube-system -l k8s-app=calico-typha -o wide
# Expected: STATUS=Running, READY=1/1 for each pod

# Verify liveness and readiness endpoints return HTTP 200
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl exec -n kube-system $TYPHA_POD -- \
  wget -qO- http://localhost:9098/liveness && echo "Liveness: OK"
kubectl exec -n kube-system $TYPHA_POD -- \
  wget -qO- http://localhost:9098/readiness && echo "Readiness: OK"
```

---

## Step 2: Validate Felix-to-Typha Connectivity

```bash
# Confirm typhaK8sServiceName is set in FelixConfiguration
calicoctl get felixconfiguration default -o yaml | grep typha
# Expected: typhaK8sServiceName: calico-typha

# Confirm the Typha Service has populated endpoints
kubectl get endpoints calico-typha -n kube-system
# Expected: addresses listed (one per Typha replica)

# Check Felix logs on 3 nodes for successful connection messages
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}' \
    | tr ' ' '\n' | head -3); do
  POD=$(kubectl get pods -n kube-system -l k8s-app=calico-node \
    --field-selector spec.nodeName=$node -o name 2>/dev/null | head -1)
  echo "=== $node ==="
  kubectl logs -n kube-system $POD -c calico-node --tail=30 2>/dev/null \
    | grep -iE "typha|connected" | tail -3
done
```

---

## Step 3: Validate Replica Count and Scheduling Distribution

```bash
# Confirm the Deployment has the expected number of ready replicas
kubectl get deployment calico-typha -n kube-system \
  -o custom-columns='DESIRED:.spec.replicas,READY:.status.readyReplicas'

# Validate no two Typha pods are on the same node (anti-affinity)
# This command outputs duplicate node names; empty output means anti-affinity is working
kubectl get pods -n kube-system -l k8s-app=calico-typha \
  -o jsonpath='{range .items[*]}{.spec.nodeName}{"\n"}{end}' | sort | uniq -d
# Expected: empty output (no duplicates)

# For multi-zone clusters, confirm zone distribution
kubectl get pods -n kube-system -l k8s-app=calico-typha \
  -o jsonpath='{range .items[*]}{.spec.nodeName}{"\n"}{end}' | while read node; do
  kubectl get node $node \
    -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' 2>/dev/null
done | sort | uniq -c
# Expected: each zone appears at most once (or once per intended replica count per zone)
```

---

## Step 4: Validate Policy Propagation Speed

Apply a test policy and measure how long it takes to propagate to Felix on a node:

```yaml
# validation-policy.yaml
# Minimal GlobalNetworkPolicy used only for propagation timing validation
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: typha-validation-marker
spec:
  # Selector that matches nothing in production to avoid side effects
  selector: "has(typha-validation-marker-only)"
  ingress:
    - action: Allow
  egress:
    - action: Allow
```

```bash
# Record start time and apply the policy
START=$(date +%s%3N)  # milliseconds
calicoctl apply -f validation-policy.yaml

# Poll Felix's iptables until the policy chain appears (adjust chain name for your version)
NODE_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-node -o name | head -1)
until kubectl exec -n kube-system $NODE_POD -c calico-node -- \
    calicoctl get globalnetworkpolicy typha-validation-marker 2>/dev/null | grep -q "validation"; do
  sleep 0.2
done
END=$(date +%s%3N)

echo "Policy propagation time: $((END - START)) ms"
# Healthy Typha: under 500ms
# Degraded Typha: 500ms–2000ms
# Failing Typha: >2000ms or never propagates

# Clean up
calicoctl delete -f validation-policy.yaml
```

---

## Step 5: Validate Prometheus Metrics

```bash
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl port-forward -n kube-system $TYPHA_POD 9093:9093 &
sleep 2

echo "=== Active connections (must be > 0) ==="
curl -s http://localhost:9093/metrics | grep "^typha_connections_active "

echo "=== Updates sent (must be > 0 after 5+ min) ==="
curl -s http://localhost:9093/metrics | grep "^typha_updates_sent_total"

echo "=== Connections dropped (should be 0 or very low) ==="
curl -s http://localhost:9093/metrics | grep "^typha_connections_dropped_total"

kill %1
```

---

## Step 6: Run the Full Validation Checklist Script

```bash
#!/bin/bash
# typha-validate.sh — run this after any Typha deployment or configuration change
PASS=0; FAIL=0

check() {
  local desc="$1"; local cmd="$2"; local expected="$3"
  result=$(eval "$cmd" 2>&1)
  if echo "$result" | grep -q "$expected"; then
    echo "[PASS] $desc"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $desc (got: $result)"
    FAIL=$((FAIL + 1))
  fi
}

# Check 1: All replicas ready
DESIRED=$(kubectl get deployment calico-typha -n kube-system -o jsonpath='{.spec.replicas}')
check "All $DESIRED Typha replicas ready" \
  "kubectl get deployment calico-typha -n kube-system -o jsonpath='{.status.readyReplicas}'" \
  "$DESIRED"

# Check 2: Service has endpoints
check "Typha Service has endpoints" \
  "kubectl get endpoints calico-typha -n kube-system -o jsonpath='{.subsets[0].addresses[0].ip}'" \
  "."  # Any non-empty IP address

# Check 3: FelixConfiguration references Typha
check "FelixConfiguration.typhaK8sServiceName set" \
  "calicoctl get felixconfiguration default -o yaml 2>/dev/null" \
  "calico-typha"

echo ""
echo "Results: $PASS passed, $FAIL failed"
```

---

## Best Practices

- Run the full validation checklist after every deployment, configuration change, and Calico upgrade.
- Record policy propagation times as part of your cluster performance baseline; values consistently above 500ms indicate Typha or Felix degradation.
- Validate anti-affinity after every cluster resize — adding nodes can inadvertently allow Typha pods to co-locate on the same host.
- Store validation outputs in your deployment pipeline artifacts for regression tracking over time.
- Re-run validation after node pool scaling events to confirm Typha replica counts remain appropriate for the new cluster size.

---

## Conclusion

A validated Typha deployment passes every check in this list: pods running, endpoints populated, Felix connected through Typha, policies propagating within 500ms, and metrics visible in Prometheus. Treat this validation as a required gate before marking any Typha deployment production-ready.

---

*Automate Typha validation and alert on failures with [OneUptime](https://oneuptime.com).*
