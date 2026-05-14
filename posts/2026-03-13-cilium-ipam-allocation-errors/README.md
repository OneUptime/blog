# Cilium IPAM Allocation Errors: Configure, Troubleshoot, Validate, and Monitor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF, IPAM

Description: A comprehensive troubleshooting guide for Cilium IPAM allocation errors, covering IP exhaustion, stale allocations, CIDR misconfiguration, and recovery procedures to restore pod IP assignment.

---

## Introduction

IPAM allocation errors in Cilium manifest as pods stuck in `ContainerCreating` or `Pending` state, with events showing "failed to allocate IP" or similar messages. These errors can stem from multiple causes: the IP pool on a specific node is exhausted, the cluster-wide CIDR pool is full, stale allocations from terminated pods are not being released, or IPAM configuration is incorrect. Because IP allocation is on the critical path of pod creation, allocation errors directly impact workload availability.

Understanding the difference between node-level IP exhaustion (all IPs in a node's CIDR are in use) and cluster-level pool exhaustion (the Operator can't allocate a CIDR to a new node) is critical for applying the correct fix. Node-level exhaustion is addressed by scaling down workloads or using a larger per-node CIDR size for newly allocated node CIDRs, while cluster-level exhaustion requires pool expansion. Stale allocations are addressed through Cilium's garbage collection mechanisms.

This guide focuses on diagnosing and resolving IPAM allocation errors of all types, with specific recovery procedures for each scenario.

## Prerequisites

- Cilium with cluster-pool or kubernetes IPAM mode
- `kubectl` with cluster admin access
- Cilium CLI
- Node access for detailed IPAM state inspection

## Configure IPAM to Prevent Allocation Errors

Proactively configure IPAM to minimize allocation errors:

```bash
# Set generously sized per-node CIDRs before Cilium allocates node CIDRs

# /22 = 1022 usable IPs per node (supports very dense pod deployments)
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set ipam.operator.clusterPoolIPv4MaskSize=22

# Configure generous cluster pool to avoid exhaustion.
# On an existing cluster, add a new CIDR to this list instead of changing
# or removing existing CIDRs.
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set "ipam.operator.clusterPoolIPv4PodCIDRList={10.244.0.0/14}"

# Configure pre-allocation threshold for AWS ENI IPAM
# to have IPs ready before pods need them
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set eni.enabled=true \
  --set ipam.nodeSpec.ipamMinAllocate=10
```

## Troubleshoot IPAM Allocation Errors

**Scenario 1: Node-level IP exhaustion**

```bash
# Identify nodes and their allocated PodCIDRs in cluster-pool mode
kubectl get ciliumnodes -o json | \
  jq '.items[] | {node: .metadata.name, pod_cidrs: .spec.ipam.podCIDRs}'

# In kubernetes IPAM mode, inspect the Kubernetes Node PodCIDRs instead
kubectl get nodes -o json | \
  jq '.items[] | {node: .metadata.name, pod_cidrs: .spec.podCIDRs}'

# Check IP allocation on the exhausted node from the local Cilium agent
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  --field-selector spec.nodeName=<exhausted-node> -o jsonpath='{.items[0].metadata.name}')
kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg status --all-addresses

# Find pods on that node consuming IPs
kubectl get pods -A --field-selector spec.nodeName=<exhausted-node> | wc -l

# Compare pods on the node with their CiliumEndpoint objects
kubectl get pods -A --field-selector spec.nodeName=<exhausted-node> \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,IP:.status.podIP
kubectl get ciliumendpoints -A
```

**Scenario 2: Stale IP allocations**

```bash
# Find IPs that are allocated but have no corresponding pod
NODE="worker-1"
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  --field-selector spec.nodeName=$NODE -o jsonpath='{.items[0].metadata.name}')
ALLOCATED_IPS=$(kubectl -n kube-system exec "$CILIUM_POD" -- \
  cilium-dbg status --all-addresses | \
  awk '/^[[:space:]]+[0-9]+\./ && $2 !~ /\((router|health)\)/ {print $1}')

for ip in $ALLOCATED_IPS; do
  POD=$(kubectl get pods -A -o wide --no-headers | awk -v ip="$ip" '$6 == ip {print $2}')
  if [ -z "$POD" ]; then
    echo "Stale allocation: $ip has no associated pod"
  fi
done

# Force Cilium to release stale allocations
# Restart the Cilium agent on the affected node to trigger endpoint GC
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  --field-selector spec.nodeName=$NODE -o jsonpath='{.items[0].metadata.name}')
kubectl -n kube-system delete pod $CILIUM_POD
```

**Scenario 3: Cluster pool exhaustion**

```bash
# Check how many nodes have CIDR allocations
kubectl get ciliumnodes -o json | \
  jq '[.items[].spec.ipam.podCIDRs[]] | length'

# Check configured cluster pool
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.cluster-pool-ipv4-cidr}'

# Check for allocation errors recorded by the operator
kubectl get ciliumnodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.ipam.operator-status}{"\n"}{end}'

# Operator error about pool exhaustion
kubectl -n kube-system logs -l name=cilium-operator | grep -i "pool.*exhaust\|no.*cidr\|cannot.*alloc"
```

## Validate IPAM Recovery

After resolving allocation errors, validate recovery:

```bash
# Confirm each node has an allocated PodCIDR
kubectl get ciliumnodes -o json | \
  jq '.items[] | {node: .metadata.name, pod_cidrs: .spec.ipam.podCIDRs}'

# Test pod creation on previously exhausted node
kubectl run recovery-test --image=nginx --restart=Never \
  --overrides='{"spec": {"nodeName": "<previously-exhausted-node>"}}'
kubectl wait pod/recovery-test --for=condition=Ready --timeout=30s
kubectl get pod recovery-test -o jsonpath='{.status.podIP}'
kubectl delete pod recovery-test

# Run full connectivity test
cilium connectivity test
```

## Monitor IPAM Allocation Health

```mermaid
graph TD
    A[Pod creation request] -->|CNI call| B[IPAM allocation]
    B -->|Check available IPs| C{IPs available?}
    C -->|Yes| D[Allocate IP, create endpoint]
    C -->|No - node exhausted| E[Error: node IP pool full]
    C -->|No - cluster exhausted| F[Error: no CIDR for new node]
    E -->|Fix| G[Reduce pod density OR expand per-node CIDR]
    F -->|Fix| H[Expand cluster pool]
    I[GC cycle] -->|Release stale IPs| C
```

Monitor IPAM allocation metrics:

```bash
# Watch allocated PodCIDRs across all nodes
watch -n30 "kubectl get ciliumnodes -o json | \
  jq '[.items[] | {node: .metadata.name, pod_cidrs: .spec.ipam.podCIDRs, operator_status: .status.ipam[\"operator-status\"]}]'"

# Prometheus queries for IPAM monitoring
# cilium_ipam_capacity - total IPAM capacity
# cilium_ip_addresses - allocated IP addresses
# cilium_operator_ipam_available_ips - available IPs on a node for cloud IPAM modes
# cilium_operator_ipam_used_ips - used IPs on a node for cloud IPAM modes

# Alert when available IPs drops below threshold in cloud IPAM modes
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-ipam-errors
  namespace: kube-system
spec:
  groups:
  - name: ipam-errors
    rules:
    - alert: CiliumNodeIPExhausted
      expr: cilium_operator_ipam_available_ips == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ \$labels.target_node }} has exhausted its IP allocation pool"
EOF
```

## Conclusion

IPAM allocation errors are highly impactful because they prevent new pods from starting, but they are also well-understood and recoverable. The key diagnostic steps are: identify whether the exhaustion is at the node level or cluster level, check for stale allocations that are not being cleaned up, and verify the GC mechanisms are running. Prevention through generous IPAM sizing, proactive pool expansion, and early warning alerts is far better than reactive recovery during an outage. Establish IPAM capacity baselines on your clusters and treat pool utilization above 80% as requiring immediate attention.
