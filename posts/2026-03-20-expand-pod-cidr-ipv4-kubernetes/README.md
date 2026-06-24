# How to Expand the Pod CIDR Range for IPv4 in an Existing Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv4, Pod CIDR, IPAM, Networking, Calico

Description: Expand the available IPv4 address space for pods in a running Kubernetes cluster by adding secondary IP pools without disrupting existing workloads.

Changing the primary Pod CIDR in an existing cluster is disruptive and generally not supported as a live change. If you're using Calico IPAM, the safe in-place approach is to add a secondary, non-overlapping IP pool that still falls within the Kubernetes cluster CIDR. If the Kubernetes cluster CIDR itself must grow, plan a migration or rebuild rather than changing a single flag in place.

## Why You Can't Simply Change the Existing CIDR

The Pod CIDR is embedded in:
- `kube-controller-manager --cluster-cidr` flag
- Node object `spec.podCIDR` field
- CNI plugin configuration
- Existing iptables/IPVS rules

Changing these in place is cluster-specific and disruptive; there isn't a generic supported live-expansion procedure for single-stack IPv4 clusters.

## Option 1: Add a Secondary IP Pool in Calico

Calico's IPAM supports multiple IP pools natively. This works when the new pool is non-overlapping and still inside the Kubernetes cluster CIDR used by Kubernetes components. For example, if the Kubernetes cluster CIDR is `10.244.0.0/15` and the existing pool uses only `10.244.0.0/16`, you can add `10.245.0.0/16` as a second pool:

```yaml
# secondary-pool.yaml

apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: secondary-ipv4-pool
spec:
  # New CIDR inside the existing Kubernetes cluster CIDR
  cidr: 10.245.0.0/16
  vxlanMode: CrossSubnet
  natOutgoing: true
  disabled: false
  blockSize: 26
```

```bash
kubectl apply -f secondary-pool.yaml

# Verify both pools exist
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get ippool -o wide
```

If your cluster was installed with the Tigera operator and it manages IP pools, update the `Installation` resource instead of creating `IPPool` objects directly.

New pods can be assigned from any enabled pool that matches the node and allows workload allocations. To force new allocations into the secondary range, disable the old pool for new allocations or use selectors/annotations.

## Option 2: If the New Range Falls Outside the Existing Cluster CIDR

For single-stack IPv4 clusters, there is no generic control-plane-only way to append a second IPv4 Pod CIDR by editing `kube-controller-manager`. Kubernetes documents comma-separated Pod CIDRs for dual-stack (`<IPv4 CIDR>,<IPv6 CIDR>`), not for adding multiple IPv4 Pod CIDRs to an existing cluster.

```bash
# This comma-separated syntax is for dual-stack, not two IPv4 pod CIDRs:
# --cluster-cidr=10.244.0.0/16,2001:db8:42:0::/56
```

```bash
# Flannel's documented configuration uses a single pod network CIDR.
# If you need a different IPv4 pod range, plan a migration or rebuild during
# maintenance rather than editing the ConfigMap to add a second IPv4 CIDR.
```

## Option 3: Migrate Existing Pods to the New Pool (Planned Maintenance)

If you want existing workloads to move onto the secondary range, follow Calico's pool migration pattern. Existing pods keep their current IPs until they are recreated:

```bash
# 1. Disable the old pool (stop new allocations)
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec": {"disabled": true}}'

# 2. Ensure the new pool exists and is enabled (using the manifest from Option 1)
kubectl apply -f secondary-pool.yaml

# 3. Gradually drain and recreate pods to get new IPs
kubectl rollout restart deployment/my-app -n production
```

## Verification

```bash
# Check IP utilization by pool
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam show

# Deploy a test pod and verify it gets an IP from the new pool
kubectl run test-expansion --image=alpine --restart=Never -- sleep 3600
kubectl get pod test-expansion -o wide
# If the old pool is disabled for new allocations, the IP should be in 10.245.x.x
```

Adding secondary pools is the least risky expansion strategy when the Kubernetes cluster CIDR already covers the new range; if the cluster CIDR itself must grow, plan a maintenance-backed migration or rebuild.
