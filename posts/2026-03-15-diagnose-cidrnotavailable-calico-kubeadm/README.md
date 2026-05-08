# How to Diagnose CIDRNotAvailable Errors with Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubeadm, CIDR, IPAM, Kubernetes, Troubleshooting, Networking

Description: Step-by-step guide to diagnosing CIDRNotAvailable errors in Kubernetes clusters using Calico as the CNI with kubeadm-based provisioning.

---

## Introduction

The CIDRNotAvailable event is reported by Kubernetes when the controller manager cannot allocate a per-node pod CIDR from the configured cluster CIDR. In Calico clusters, pods can also become stuck in a ContainerCreating state when Calico IPAM (IP Address Management) cannot allocate addresses from its configured IPPools.

This error is particularly common in kubeadm-provisioned clusters because the pod CIDR must be understood consistently across kubeadm's cluster configuration, the kube-controller-manager, and Calico's IPPool resources. Calico IPAM does not use Kubernetes `Node.spec.podCIDR` allocations, but CIDR mismatches can still cause Kubernetes node CIDR events or Calico address allocation failures.

This guide focuses on the diagnostic process, helping you identify the root cause before attempting a fix.

## Prerequisites

- Kubernetes cluster provisioned with kubeadm
- Calico installed as the CNI plugin
- `kubectl` access with cluster-admin privileges
- `calicoctl` CLI installed
- `jq` installed for JSON filtering commands
- Access to node-level logs

## Identifying the Symptom

Start by confirming the error is present:

```bash
# Check for pods stuck in ContainerCreating

kubectl get pods --all-namespaces --field-selector=status.phase!=Running,status.phase!=Succeeded

# Look for CIDR-related events
kubectl get events --all-namespaces | grep -i "cidr\|ipam\|ip pool"

# Check specific pod events
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Events"
```

Common error messages include:

```text
Normal   CIDRNotAvailable        Node <node-name> status is now: CIDRNotAvailable
Warning  FailedCreatePodSandBox  failed to assign an IP address to container
```

## Checking kubeadm Configuration

Verify the pod CIDR configured during cluster initialization:

```bash
# Check the kubeadm cluster configuration
kubectl get configmap -n kube-system kubeadm-config -o yaml | grep -i "podsubnet\|podCIDR\|serviceSubnet"

# Check kube-controller-manager flags
kubectl get pod -n kube-system -l component=kube-controller-manager -o yaml | grep -A 1 "cluster-cidr"

# Check node pod CIDR allocation
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'
```

## Checking Calico IPPool Configuration

Compare the Calico IPPool with the kubeadm pod CIDR:

```bash
# List Calico IP pools
calicoctl get ippools -o wide

# Get detailed IPPool configuration
calicoctl get ippools -o yaml
```

The IPPool CIDR must fall within (or match) the kubeadm pod network CIDR. A common misconfiguration:

```text
kubeadm podSubnet: 10.244.0.0/16
Calico IPPool:     192.168.0.0/16  <-- MISMATCH
```

## Checking IPAM Block Allocation

Examine how IP blocks are allocated across nodes:

```bash
# Show IPAM utilization
calicoctl ipam show

# Show detailed block allocation
calicoctl ipam show --show-blocks

# Check for exhausted blocks
calicoctl ipam show --show-blocks | grep -E "0 free|full"
```

If all blocks are allocated or the CIDR is exhausted, no new IPs can be assigned.

## Checking Node CIDR Assignments

Verify whether Kubernetes is assigning pod CIDRs to nodes:

```bash
# List node CIDR assignments
kubectl get nodes -o custom-columns=NAME:.metadata.name,CIDR:.spec.podCIDR,CIDRS:.spec.podCIDRs

# Check for nodes without CIDR assignment
kubectl get nodes -o json | jq '.items[] | select(.spec.podCIDR == null) | .metadata.name'
```

With Calico IPAM, missing `Node.spec.podCIDR` values do not by themselves prevent pods from being assigned Calico IPs. They are still useful to check because kubeadm sets `--allocate-node-cidrs=true` when `--pod-network-cidr` is used, and allocation failures can produce CIDRNotAvailable node events.

## Checking Felix and Calico Node Logs

Look for IPAM-related errors in the Calico components:

```bash
# Check calico-node logs for IPAM errors
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=100 | grep -i "cidr\|ipam\|ip pool\|block"

# Check kube-controller-manager logs for CIDR allocation issues
kubectl logs -n kube-system -l component=kube-controller-manager --tail=100 | grep -i "cidr"
```

## Checking for CIDR Overlap

Verify there are no CIDR overlaps with existing network infrastructure:

```bash
# Check all IP pools for overlaps
calicoctl get ippools -o yaml | grep cidr

# Check service CIDR
kubectl cluster-info dump | grep -m 1 "service-cluster-ip-range"

# Compare with node network
kubectl get nodes -o wide | awk '{print $6}'
```

## Verification

After completing the diagnosis, summarize your findings:

```bash
# Full diagnostic summary
echo "=== kubeadm Pod CIDR ==="
kubectl get configmap -n kube-system kubeadm-config -o yaml | grep podSubnet

echo "=== Calico IPPool ==="
calicoctl get ippools -o wide

echo "=== IPAM Usage ==="
calicoctl ipam show

echo "=== Node CIDRs ==="
kubectl get nodes -o custom-columns=NAME:.metadata.name,CIDR:.spec.podCIDR

echo "=== Pending Pods ==="
kubectl get pods --all-namespaces --field-selector=status.phase=Pending --no-headers | wc -l
```

## Troubleshooting

**Diagnosis points to CIDR mismatch**: The most common cause. The Calico IPPool CIDR does not match the kubeadm pod network CIDR. Proceed to fix the IPPool configuration.

**Diagnosis points to CIDR exhaustion**: The pod CIDR is too small for the number of pods. You will need to expand the CIDR range or reduce pod density.

**Diagnosis points to missing node CIDR**: The kube-controller-manager is not allocating CIDRs to nodes. If another component requires Kubernetes node CIDRs, verify the `--allocate-node-cidrs=true` and `--cluster-cidr` flags are set. If you are using Calico IPAM only, Kubernetes node CIDR allocation is not required for pod IP assignment and can be disabled after validating your cluster design.

**Diagnosis points to stale IPAM allocations**: IP addresses may be allocated to endpoints that no longer exist. Use `calicoctl ipam release --ip=<IP>` or `calicoctl ipam release --from-report=<REPORT>` to clean up leaked allocations.

## Conclusion

Diagnosing CIDRNotAvailable errors requires systematically checking the alignment between kubeadm's pod network configuration, Calico's IPPool settings, and the actual IPAM block allocation state. By following this diagnostic process, you can identify whether the issue stems from a CIDR mismatch, address exhaustion, missing node allocations, or stale IPAM data. Once the root cause is identified, proceed to the appropriate remediation steps.
