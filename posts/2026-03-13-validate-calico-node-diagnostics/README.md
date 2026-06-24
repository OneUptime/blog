# How to Validate Calico Node Diagnostics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Diagnostic, Validation

Description: Validate Calico networking health on individual cluster nodes by confirming Felix liveness, iptables rule completeness, BGP route propagation, and pod IP reachability from each node.

---

## Introduction

Validating Calico node health requires confirming four signals per node: Felix is live and ready, dataplane rules are programmed, BGP peers are Established when BGP is enabled, and pod IPs are reachable from the node. Running this validation on every node ensures no node is silently degraded before issues affect application traffic.

## Per-Node Validation Script

```bash
#!/bin/bash
# validate-calico-nodes.sh

PASS=0
FAIL=0

for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[*].metadata.name}'); do

  NODE=$(kubectl get pod -n calico-system "${pod}" \
    -o jsonpath='{.spec.nodeName}')

  echo "Validating node: ${NODE}"

  # 1. Felix liveness and readiness
  if kubectl exec -n calico-system "${pod}" -c calico-node -- \
    /bin/calico-node -felix-live -felix-ready >/dev/null 2>&1; then
    echo "  PASS: Felix live and ready"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: Felix not live or ready on ${NODE}"
    FAIL=$((FAIL + 1))
  fi

  # 2. BGP peers
  BGP_STATUS=$(kubectl exec -n calico-system "${pod}" -c calico-node -- \
    calicoctl node status 2>/dev/null || true)
  ESTABLISHED=$(printf '%s\n' "${BGP_STATUS}" | grep -c "Established")
  if [ "${ESTABLISHED}" -gt 0 ]; then
    echo "  PASS: ${ESTABLISHED} BGP peer(s) Established"
    PASS=$((PASS + 1))
  else
    echo "  WARN: No BGP peers Established on ${NODE}"
    # Not always a failure - depends on BGP topology
  fi

done

echo ""
echo "Validation: ${PASS} passed, ${FAIL} failed"
exit ${FAIL}
```

## Validate iptables Rules Are Present

```bash
# For Calico's iptables dataplane, check that the Calico chain exists and has rules.
# The debug image must include nsenter and iptables.
CALICO_RULES=$(kubectl debug node/"${NODE}" --image=nicolaka/netshoot --profile=sysadmin -- \
  nsenter -t 1 -n -- iptables -L cali-FORWARD --line-numbers 2>/dev/null | wc -l)

if [ "${CALICO_RULES}" -gt 2 ]; then
  echo "PASS: Calico iptables rules present (${CALICO_RULES} rules in cali-FORWARD)"
else
  echo "FAIL: No Calico iptables rules in cali-FORWARD"
fi
```

## Validate Pod IP Reachability

```bash
# Test that a pod IP is reachable from the node's calico-node pod
POD_IP=$(kubectl get pod <test-pod> -n <namespace> \
  -o jsonpath='{.status.podIP}')
TEST_NODE_POD="<calico-node-pod-on-different-node>"

kubectl exec -n calico-system "${TEST_NODE_POD}" -c calico-node -- \
  ping -c 3 "${POD_IP}"
# Success: routing between nodes is working
# Failure: check BGP state, dataplane mode, NetworkPolicy, and whether the pod responds to ICMP
```

## Validation Architecture

```mermaid
flowchart LR
    A[validate-calico-nodes.sh] --> B[Per node:]
    B --> C[Felix live?]
    B --> D[BGP Established?]
    B --> E[iptables rules?]
    C --> F{All PASS?}
    D --> F
    E --> F
    F -->|Yes| G[Node validated]
    F -->|No| H[Log failures]
```

## Conclusion

Per-node Calico validation ensures that no node is silently degraded. The four validation points - Felix health, BGP peer state when BGP is enabled, dataplane rules, and pod reachability - cover the primary failure modes for individual nodes. Run this validation after node replacements, calico-node pod restarts, and before declaring an incident resolved. A green run on all nodes confirms the tested dataplane path is healthy.
