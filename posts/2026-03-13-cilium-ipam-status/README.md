# Cilium IPAM Status: Configure, Troubleshoot, Validate, and Monitor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF, IPAM

Description: Learn how to read and interpret Cilium's IPAM status fields in CiliumNode objects, diagnose status inconsistencies, and use IPAM status information for operational monitoring and capacity planning.

---

## Introduction

The IPAM status in Cilium's CiliumNode CRD is the real-time record of IP address allocation state on each node. While the IPAM spec describes what IPAM parameters are requested, the IPAM status reflects what is actually happening: which IPs are currently allocated and what the current CIDR allocation state is. Correctly interpreting IPAM status is essential for capacity planning, troubleshooting IP allocation failures, and auditing IP assignment.

The `status.ipam` section of a CiliumNode is primarily written by the Cilium Agent running on that node. As pods are created and deleted, the Agent updates the `used` map. The Cilium Operator also interacts with status to record CIDR allocation errors in `operator-status`. For cloud IPAM modes such as AWS ENI and Azure, additional top-level status fields such as `status.eni` or `status.azure` track interface assignments and cloud-specific allocation state.

This guide covers how to read and interpret all IPAM status fields, configure alerting based on status, troubleshoot status inconsistencies, and validate that status accurately reflects the actual networking state.

## Prerequisites

- Cilium with CRD-backed IPAM installed
- `kubectl` with cluster admin access
- `jq` for JSON processing
- Understanding of CiliumNode CRD structure

## Configure IPAM Status Reporting

IPAM status is automatically managed but can be influenced:

```bash
# View full IPAM status for all nodes

kubectl get ciliumnodes -o json | \
  jq '.items[] | {
    node: .metadata.name,
    ipam_status: .status.ipam
  }'

# View status for a specific node (cleaner format)
NODE="worker-1"
kubectl get ciliumnode "$NODE" -o json | jq '{
  used_count: (.status.ipam.used // {} | length),
  pool_count: (.spec.ipam.pool // {} | length),
  free_count: (((.spec.ipam.pool // {}) | length) - ((.status.ipam.used // {}) | length)),
  sample_used: (.status.ipam.used // {} | to_entries[:3] | map({ip: .key, pod: .value.owner}))
}'

# Enable verbose IPAM logging for detailed status updates
cilium config set debug true
kubectl -n kube-system logs ds/cilium -f | grep -i "ipam\|alloc\|status"
```

Understanding IPAM status fields:

```yaml
# CiliumNode status.ipam structure
status:
  ipam:
    # Map of allocated IPs to their owners
    used:
      "10.244.1.5":
        owner: "default/frontend-5d9b4d7f9-xk2lp"  # namespace/pod-name
        resource: "default/frontend-5d9b4d7f9-xk2lp"
      "10.244.1.6":
        owner: "kube-system/coredns-74ff55c5b-qr8s2"
        resource: "kube-system/coredns-74ff55c5b-qr8s2"

    # Operator-managed status (CIDR allocation errors)
    operator-status:
      error: ""

    # For cloud IPAM modes (aws-eni): ENI allocation status
    # ENIs are tracked under status.eni, not status.ipam:
    # status:
    #   eni:
    #     enis:
    #       eni-abc123:
    #         id: eni-abc123
    #         ip: 10.0.1.5 (primary)
    #         ips: [10.0.1.6, 10.0.1.7, ...]
spec:
  ipam:
    # Map of allocatable IPs for CRD-backed/cloud IPAM pools
    pool:
      "10.244.1.5": {}
      "10.244.1.6": {}
      "10.244.1.7": {}
      "10.244.1.8": {}
```

## Troubleshoot IPAM Status Issues

Diagnose status inconsistencies:

```bash
# Find nodes with no free IPv4 addresses in the CiliumNode IPAM pool
kubectl get ciliumnodes -o json | \
  jq '.items[] |
  select(((.spec.ipam.pool // {}) | length) - ((.status.ipam.used // {}) | length) == 0) |
  .metadata.name'

# Find used IPs with no corresponding running pod
kubectl get ciliumnodes -o json | \
  jq -r '.items[] | .metadata.name as $node | (.status.ipam.used // {}) | to_entries[] |
  "\($node) \(.key) \(.value.owner // "unknown")"' | \
  while IFS=' ' read -r node ip owner; do
    if [ "$owner" != "unknown" ]; then
      NS="${owner%%/*}"
      POD="${owner##*/}"
      RUNNING=$(kubectl get pod "$POD" -n "$NS" --no-headers 2>/dev/null | grep Running | wc -l)
      if [ "$RUNNING" -eq 0 ]; then
        echo "STALE: $node $ip owner=$owner"
      fi
    fi
  done

# Check for operator-status showing allocation failures
kubectl get ciliumnodes -o json | \
  jq -r '.items[] |
  select(.status.ipam."operator-status".error? != null and .status.ipam."operator-status".error != "") |
  "\(.metadata.name): \(.status.ipam."operator-status".error)"'
```

Fix status issues:

```bash
# Issue: Stale used entries not being cleaned up
# Trigger agent reconciliation
kubectl -n kube-system delete pod -l k8s-app=cilium \
  --field-selector spec.nodeName=<node-with-stale-status>

# Issue: Free IPs not replenished after pod deletion
# Check agent logs for release errors
kubectl -n kube-system logs ds/cilium | grep -i "release\|available\|ipam"

# Issue: operator-status contains an allocation error
# Check operator logs and restart the operator after fixing the underlying cause
kubectl -n kube-system logs deployment/cilium-operator | grep -i "ipam\|cidr\|alloc"
kubectl -n kube-system rollout restart deployment/cilium-operator
```

## Validate IPAM Status Accuracy

Verify IPAM status matches actual cluster state:

```bash
# Comprehensive status validation script
echo "=== IPAM Status Validation ==="

for node in $(kubectl get ciliumnodes -o jsonpath='{.items[*].metadata.name}'); do
  echo "--- Node: $node ---"

  # Get IPAM status
  CNODE=$(kubectl get ciliumnode $node -o json)
  USED_COUNT=$(echo "$CNODE" | jq '.status.ipam.used // {} | length')
  POOL_COUNT=$(echo "$CNODE" | jq '.spec.ipam.pool // {} | length')
  FREE_COUNT=$((POOL_COUNT - USED_COUNT))

  # Get running, non-hostNetwork pod count on node
  POD_COUNT=$(kubectl get pods -A \
    --field-selector spec.nodeName=$node \
    -o json 2>/dev/null | \
    jq '[.items[] | select(.spec.hostNetwork != true and .status.phase == "Running")] | length')

  POD_OWNER_COUNT=$(echo "$CNODE" | jq '[(.status.ipam.used // {}) | to_entries[] |
    select((.value.owner // "") | test("^[^/]+/[^/]+$"))] | length')

  echo "  IPAM used: $USED_COUNT, IPAM pool: $POOL_COUNT, IPAM free: $FREE_COUNT"
  echo "  Running non-hostNetwork pods: $POD_COUNT"

  if [ "$POD_OWNER_COUNT" -ne "$POD_COUNT" ]; then
    echo "  WARNING: pod-like IPAM owners ($POD_OWNER_COUNT) != running pods ($POD_COUNT)"
  else
    echo "  OK: pod-like IPAM status consistent with running pods"
  fi
done
```

## Monitor IPAM Status

```mermaid
graph TD
    A[Pod created] -->|Agent allocates IP| B[Added to status.ipam.used]
    C[Pod deleted] -->|Agent releases IP| D[Removed from status.ipam.used]
    D -->|Reusable if still present in| E[spec.ipam.pool]
    F[Operator CIDR alloc] -->|Records errors in| G[status.ipam.operator-status]
    H[Monitor: compare used to pods] -->|Detect| I{Status == Actual?}
    I -->|No| J[Stale IPAM entry detected]
    I -->|Yes| K[Status healthy]
```

Set up IPAM status monitoring:

```bash
# Dashboard query: IPAM utilization per node
kubectl get ciliumnodes -o json | jq '[.items[] | {
  node: .metadata.name,
  cidr: .spec.ipam.podCIDRs[0],
  used: (.status.ipam.used // {} | length),
  pool: (.spec.ipam.pool // {} | length),
  free: (((.spec.ipam.pool // {}) | length) - ((.status.ipam.used // {}) | length)),
  utilization_pct: (
    if (.spec.ipam.pool // {} | length) > 0
    then (((.status.ipam.used // {}) | length) /
      ((.spec.ipam.pool // {}) | length) * 100 | floor)
    else 0
    end
  )
}]'

# Prometheus metrics
# cilium_operator_ipam_used_ips{target_node="worker-1"}
# cilium_operator_ipam_available_ips{target_node="worker-1"}

# Alert on IPAM status inconsistency
watch -n60 "kubectl get ciliumnodes -o json | \
  jq '.items[] | {node: .metadata.name, free: (((.spec.ipam.pool // {}) | length) - ((.status.ipam.used // {}) | length))}'"
```

## Conclusion

Cilium's IPAM status provides a real-time view of IP allocation state that is essential for capacity planning and operational troubleshooting. The `used` map shows which IPs are assigned to pods or internal Cilium owners such as router and health endpoints, making IP assignment auditing straightforward. Regular validation that pod-like `used` owners still match actual running pods catches stale IPAM entries that consume IPs without corresponding workloads. Monitor the free capacity derived from `spec.ipam.pool` minus `status.ipam.used` per node as your primary IPAM capacity metric, and ensure pre-allocation settings keep it at a healthy level to support pod startup without latency.
