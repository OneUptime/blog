# Cilium IPAM Specification: Configure, Troubleshoot, Validate, and Monitor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, IPAM, Specification, Networking

Description: A complete reference to the Cilium IPAM specification including all configuration parameters, pre-allocation settings, cloud provider-specific options, and how to tune IPAM behavior for different deployment scenarios.

---

## Introduction

The Cilium IPAM specification encompasses the full set of parameters that control how IP addresses are allocated, pre-allocated, and managed across different deployment environments. These parameters exist at multiple levels: the cluster-wide IPAM mode configuration in the Cilium ConfigMap, the per-node IPAM spec in CiliumNode CRDs, and the cloud-provider-specific parameters for ENI, Azure, and GKE integrations.

Understanding the complete IPAM specification is essential for tuning Cilium to your specific workload patterns. Clusters with highly dynamic workloads (frequent pod churn) benefit from higher pre-allocation settings that reduce pod startup latency. Clusters running on cloud providers can leverage prefix delegation and interface-level optimizations to maximize available IPs per node. The specification also covers multi-pool IPAM, which enables different parts of the cluster to use different IP pools.

This guide provides a complete reference to all IPAM specification parameters, how to configure them, troubleshoot configuration-related issues, and validate that the specified behavior matches actual IPAM operation.

## Prerequisites

- Cilium installed in Kubernetes
- `kubectl` with cluster admin access
- Helm 3.x for configuration management
- Understanding of your deployment environment (cloud provider, bare metal, etc.)

## Configure IPAM Specification

Complete IPAM configuration reference for cluster-pool mode:

```bash
# Cluster-pool IPAM specification
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set ipam.mode=cluster-pool \
  # Cluster-level CIDR pool (Operator allocates from this)
  --set "ipam.operator.clusterPoolIPv4PodCIDRList={10.244.0.0/16}" \
  # Size of each node's allocation from the pool
  --set ipam.operator.clusterPoolIPv4MaskSize=24 \
  # GC settings
  --set operator.ipamGCInterval=15m
```

Per-node IPAM specification in CiliumNode:

```yaml
# CiliumNode spec.ipam fields
spec:
  ipam:
    # (Set by Operator based on cluster pool)
    podCIDRs:
      - 10.244.1.0/24

    # Minimum number of IPs to maintain available at all times
    # Prevents IPs from running out on very active nodes
    min-allocate: 10

    # Maximum number of IPs the agent can allocate for this node
    # Prevents unbounded IP consumption (relevant for cloud IPAM)
    max-allocate: 250

    # Number of IPs to pre-allocate beyond current demand
    # Higher values = faster pod startup, more IP consumption
    pre-allocate: 16

    # Maximum IPs to keep available above the pre-allocate watermark
    max-above-watermark: 8
```

Cloud-specific IPAM specification (AWS ENI):

```bash
# AWS ENI IPAM specification
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set ipam.mode=eni \
  --set eni.enabled=true \
  # Enable AWS prefix delegation for more IPs per ENI
  --set eni.awsEnablePrefixDelegation=true \
  # Pre-allocate addresses on ENI interfaces
  --set ipam.operator.eniMinAllocate=8 \
  --set ipam.operator.eniMaxAllocate=30 \
  # Interface tags for ENI selection
  --set "eni.tags.cilium=true"
```

## Troubleshoot IPAM Specification Issues

Diagnose misconfiguration in IPAM spec:

```bash
# Check effective IPAM specification
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data}' | jq '{
    ipam: .ipam,
    "cluster-pool-cidr": .["cluster-pool-ipv4-cidr"],
    "mask-size": .["cluster-pool-ipv4-mask-size"]
  }'

# Check per-node IPAM spec
kubectl get ciliumnode worker-1 \
  -o jsonpath='{.spec.ipam}' | jq '.'

# Identify nodes with incorrect pre-allocation
kubectl get ciliumnodes -o json | \
  jq '.items[] | select((.status.ipam.available | length) < 5) |
  {node: .metadata.name, available: (.status.ipam.available | length)}'

# Check if pre-allocation is working
kubectl get ciliumnode worker-1 -o json | \
  jq '.status.ipam | {used: (.used | length), available: (.available | length)}'
```

Fix IPAM specification issues:

```bash
# Issue: Insufficient pre-allocation causing pod startup latency
# Increase pre-allocate value
kubectl patch ciliumnode worker-1 --type merge -p \
  '{"spec": {"ipam": {"pre-allocate": 32}}}'

# Issue: max-allocate too low causing IP exhaustion
kubectl patch ciliumnode worker-1 --type merge -p \
  '{"spec": {"ipam": {"max-allocate": 500}}}'

# Issue: IPAM mode mismatch between ConfigMap and CiliumNode
# Ensure all nodes are updated after ConfigMap change
kubectl -n kube-system rollout restart ds/cilium
```

## Validate IPAM Specification

Verify IPAM spec is correctly applied:

```bash
# Validate pre-allocation is working
for node in $(kubectl get ciliumnodes -o jsonpath='{.items[*].metadata.name}'); do
  AVAILABLE=$(kubectl get ciliumnode $node \
    -o jsonpath='{.status.ipam.available}' | jq 'length')
  PRE_ALLOC=$(kubectl get ciliumnode $node \
    -o jsonpath='{.spec.ipam.pre-allocate}' 2>/dev/null || echo "default")
  echo "$node: available=$AVAILABLE, pre-allocate=$PRE_ALLOC"
done

# Test that pod startup does not wait for IP allocation
TIME_START=$(date +%s%N)
kubectl run spec-test --image=nginx --restart=Never
kubectl wait pod/spec-test --for=condition=Ready --timeout=30s
TIME_END=$(date +%s%N)
ELAPSED=$(((TIME_END - TIME_START) / 1000000))
echo "Pod ready in ${ELAPSED}ms"
kubectl delete pod spec-test

# Validate cloud IPAM settings (AWS ENI)
if kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.ipam}' | grep -q eni; then
  kubectl get ciliumnodes -o json | \
    jq '.items[] | {node: .metadata.name, eni_count: (.status.eni | length)}'
fi
```

## Monitor IPAM Specification Effectiveness

```mermaid
graph TD
    A[IPAM Spec: pre-allocate=16] -->|Agent maintains| B[16 IPs always available]
    C[Pod created] -->|Uses pre-allocated IP| D[Immediate IP assignment]
    D -->|Agent replenishes| B
    E[IPAM Spec: min-allocate=10] -->|Agent ensures| F[Always >= 10 available]
    G[IPAM Spec: max-allocate=250] -->|Agent won't exceed| H[Max 250 IPs total]
    I[Monitor] -->|Track| J{available >= min-allocate?}
    J -->|No| K[Alert: Pre-allocation failing]
```

Monitor IPAM specification adherence:

```bash
# Check pre-allocation is meeting the min-allocate requirement
kubectl get ciliumnodes -o json | jq '[.items[] | {
  node: .metadata.name,
  min_allocate: (.spec.ipam."min-allocate" // "default"),
  available: (.status.ipam.available | length),
  meeting_minimum: (
    (.status.ipam.available | length) >= (.spec.ipam."min-allocate" // 10)
  )
}]'

# Monitor IPAM pre-allocation efficiency
kubectl -n kube-system port-forward ds/cilium 9962:9962 &
curl -s http://localhost:9962/metrics | grep -E "ipam_(available|used|allocated)"

# Alert when available IPs below minimum
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-ipam-spec
  namespace: kube-system
spec:
  groups:
  - name: ipam-spec
    rules:
    - alert: CiliumIPAMPreAllocationLow
      expr: cilium_ipam_available_ips < 5
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Cilium IPAM has fewer than 5 pre-allocated IPs available"
EOF
```

## Conclusion

The Cilium IPAM specification provides extensive tunability for different deployment scenarios and workload patterns. Pre-allocation settings directly impact pod startup latency — higher values reduce latency at the cost of temporarily reserving more IPs. The min-allocate and max-allocate thresholds prevent both IP starvation and runaway consumption. Cloud provider IPAM modes have additional specification options that leverage platform-specific capabilities like AWS prefix delegation for dramatic increases in IPs per node. Validate that your IPAM specification settings are reflected in actual CiliumNode status to ensure the configuration is taking effect.
