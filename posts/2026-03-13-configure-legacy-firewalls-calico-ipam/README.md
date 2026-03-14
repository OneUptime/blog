# Configure Legacy Firewalls with Calico IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, Firewall, Networking, Kubernetes, Enterprise

Description: Learn how to integrate Calico IPAM with legacy enterprise firewalls by controlling IP allocation to ensure pod IPs fall within firewall-approved ranges.

---

## Introduction

Many enterprise Kubernetes deployments operate alongside legacy firewalls that enforce strict IP-based access control policies. These firewalls often have pre-defined allowlists for specific IP ranges, creating a challenge when Kubernetes dynamically assigns pod IPs from broad CIDR blocks that the firewall may not recognize or permit.

Calico's IPAM system provides the flexibility needed to solve this problem. By configuring specific IP pools and using node selectors or namespace annotations, you can ensure that pods running in particular environments or namespaces receive IP addresses from ranges that your legacy firewalls already permit.

This guide demonstrates how to configure Calico IPAM pools that align with legacy firewall policies, use annotations to steer IP allocation, and validate that pod IPs land in the correct ranges for firewall traversal.

## Prerequisites

- Kubernetes cluster with Calico v3.20+ installed
- `calicoctl` CLI configured
- Known IP ranges that legacy firewalls permit
- Ability to annotate Kubernetes namespaces and pods

## Step 1: Define Firewall-Approved IP Pools

Create Calico IP pools that correspond exactly to the IP ranges allowed by your legacy firewalls.

```yaml
# ippool-firewall-approved.yaml - IP pools using firewall-approved address ranges
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  # Name reflects the firewall zone this pool corresponds to
  name: dmz-firewall-pool
spec:
  # This CIDR must be in the firewall's allowlist for the DMZ zone
  cidr: 10.50.0.0/24
  ipipMode: CrossSubnet
  natOutgoing: true
  # Only assign IPs from this pool to nodes labeled as DMZ nodes
  nodeSelector: zone == "dmz"
---
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: internal-firewall-pool
spec:
  # Internal application range permitted through the internal firewall
  cidr: 10.60.0.0/22
  ipipMode: CrossSubnet
  natOutgoing: false
  # Assign to nodes in the internal zone
  nodeSelector: zone == "internal"
```

```bash
# Apply the firewall-approved IP pools
calicoctl apply -f ippool-firewall-approved.yaml

# Verify pools are created and active
calicoctl get ippools -o wide
```

## Step 2: Label Nodes with Firewall Zones

Apply labels to nodes so that Calico's node selector in each IP pool routes allocations correctly.

```bash
# Label nodes that sit in the DMZ firewall zone
kubectl label node node1 node2 zone=dmz

# Label nodes in the internal firewall zone
kubectl label node node3 node4 node5 zone=internal

# Verify node labels are applied
kubectl get nodes --show-labels | grep zone
```

## Step 3: Annotate Namespaces to Use Specific Pools

For namespace-level control, annotate namespaces to request IPs from specific pools.

```yaml
# namespace-dmz.yaml - Namespace that requests IPs from the DMZ firewall pool
apiVersion: v1
kind: Namespace
metadata:
  name: dmz-workloads
  annotations:
    # Direct Calico IPAM to use the DMZ-approved pool for this namespace
    cni.projectcalico.org/ipv4pools: '["dmz-firewall-pool"]'
```

```bash
# Apply the namespace annotation
kubectl apply -f namespace-dmz.yaml

# Deploy a test pod to verify it receives a DMZ IP
kubectl run test-dmz --image=nginx --namespace=dmz-workloads
kubectl get pod test-dmz -n dmz-workloads -o wide
# The pod IP should be in the 10.50.0.0/24 range
```

## Step 4: Disable Default IP Pools

If your legacy firewall does not permit the default Calico IP pool range, disable it to prevent any pods from receiving non-approved IPs.

```bash
# Retrieve the default IP pool name
calicoctl get ippools

# Disable the default pool so no new IPs are allocated from it
calicoctl patch ippool default-ipv4-ippool --patch '{"spec": {"disabled": true}}'

# Verify the pool is disabled
calicoctl get ippool default-ipv4-ippool -o yaml | grep disabled
```

## Best Practices

- Document the mapping between Calico IP pools and firewall zones in your runbooks
- Use node selectors on IP pools rather than relying solely on namespace annotations
- Periodically audit pod IPs with `calicoctl ipam show` to ensure no IPs fall outside approved ranges
- Configure monitoring alerts when pods receive IPs outside expected ranges
- Keep firewall rules synchronized with Calico IP pool changes through GitOps workflows

## Conclusion

Integrating Calico IPAM with legacy firewalls requires careful planning of IP pool CIDRs to match firewall allowlists. By creating zone-specific IP pools, labeling nodes appropriately, and annotating namespaces, you can guarantee that pods receive firewall-approved IP addresses. This approach bridges modern Kubernetes networking with legacy enterprise firewall infrastructure without requiring costly firewall policy overhauls.
