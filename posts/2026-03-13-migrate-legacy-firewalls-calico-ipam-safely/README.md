# Migrate Legacy Firewalls with Calico IPAM Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, ipam, firewall, kubernetes, migration, networking, security, legacy

Description: Learn how to safely migrate legacy firewall rules to work with Calico IPAM, ensuring existing firewall policies remain effective as pods receive dynamic IP addresses.

---

## Introduction

Legacy firewalls typically operate on static IP-based rules—blocking or allowing traffic based on known source and destination IPs. When migrating workloads to Kubernetes with Calico IPAM, pods receive dynamic IPs that change on restart, making static firewall rules unreliable.

The solution is a two-pronged approach: use Calico's IPAM features (IP pools, node selectors, and fixed IP annotations) to make pod IPs more predictable, and gradually replace static firewall rules with Calico network policies that use label selectors rather than IPs.

This guide covers strategies for making legacy firewalls compatible with Calico IPAM and migrating toward label-based policy enforcement.

## Prerequisites

- Kubernetes cluster with Calico v3.x
- Documentation of existing firewall rules referencing pod or node IPs
- `calicoctl` and `kubectl` CLIs installed
- Cluster admin permissions and access to firewall management

## Step 1: Audit Existing Firewall Rules

Catalog all firewall rules that reference Kubernetes pod or node IP ranges.

```bash
# Export current IP pool configuration to understand pod CIDR ranges
calicoctl get ippool -o yaml

# List all nodes and their IPs to understand what's hitting the firewall
kubectl get nodes -o wide

# On the firewall, identify rules targeting the pod CIDR (example with iptables)
sudo iptables -L -n | grep "10.244"  # Replace with your pod CIDR

# Document which services depend on specific source IPs for allow-listing
grep -r "10.244" /etc/firewall-rules/  # Replace with firewall config path
```

## Step 2: Use Node-Scoped IP Pools to Stabilize Pod CIDRs

Configure Calico IP pools with node selectors so firewall rules can target stable node-based CIDRs instead of individual pod IPs.

```yaml
# calico-ipam/node-scoped-pools.yaml - Assign predictable CIDR blocks per node group
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: production-node-pool
spec:
  # Dedicated pool for production workloads - firewall can allow entire /16
  cidr: 10.64.0.0/16
  blockSize: 26
  ipipMode: CrossSubnet
  natOutgoing: true
  disabled: false
  # Restrict to production-labeled nodes so CIDRs stay predictable
  nodeSelector: "environment == 'production'"
```

## Step 3: Reserve IPs for Services That Need Static Addressing

Use Calico IP reservation and pod IP annotations for services that legacy firewalls must whitelist by specific IP.

```yaml
# workloads/payment-processor.yaml - Assign a fixed IP to avoid firewall rule churn
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-processor
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: payment-processor
  template:
    metadata:
      labels:
        app: payment-processor
      annotations:
        # Request this specific IP - firewall rules can whitelist this permanently
        cni.projectcalico.org/ipAddrs: '["10.64.1.100"]'
    spec:
      containers:
        - name: payment-processor
          image: payment-processor:v1
```

## Step 4: Create Calico Policies to Mirror Firewall Rules

Translate existing firewall rules into Calico NetworkPolicies that use label selectors, reducing dependency on static IPs.

```yaml
# calico-policies/replace-firewall-rules.yaml - Calico policy mirroring a legacy firewall allow rule
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  # Replaces: iptables -A FORWARD -s 10.1.2.0/24 -d 10.64.1.100 -p tcp --dport 8443 -j ACCEPT
  name: allow-legacy-payment-access
spec:
  # Target the payment processor pod regardless of its IP
  selector: app == 'payment-processor'
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        # Use CIDR to maintain compatibility with legacy systems that can't use labels
        nets:
          - "10.1.2.0/24"  # Legacy system subnet
      destination:
        ports:
          - 8443
```

## Step 5: Gradually Remove Legacy Firewall Rules

After deploying equivalent Calico policies, remove legacy firewall rules one at a time and validate after each removal.

```bash
# Validate that the Calico policy is enforced before removing the firewall rule
# Test from a pod in the allowed CIDR
kubectl run fw-test --image=busybox --rm -it -- wget -qO- https://10.64.1.100:8443/health

# After confirming Calico policy works, remove the corresponding iptables rule
# Document each rule removal in a change management ticket
sudo iptables -D FORWARD -s 10.1.2.0/24 -d 10.64.1.100 -p tcp --dport 8443 -j ACCEPT

# Verify traffic still flows after rule removal (Calico is now enforcing)
kubectl run fw-test --image=busybox --rm -it -- wget -qO- https://10.64.1.100:8443/health
```

## Best Practices

- Migrate one firewall rule at a time, validating connectivity after each change
- Use stable CIDR-based IP pools to give legacy firewalls predictable address ranges to whitelist
- Reserve specific IPs for services that are whitelisted in external systems that you cannot update
- Keep legacy firewall rules active in parallel with Calico policies during a validation period
- Document the mapping between old firewall rules and their Calico policy replacements
- Use Calico's `Log` action to audit traffic before enabling `Deny` in new policies

## Conclusion

Migrating legacy firewalls to work with Calico IPAM requires addressing the fundamental challenge of dynamic pod IPs. By using node-scoped IP pools for CIDR stability, reserved IPs for critical services, and Calico network policies to replace firewall rules, you can safely transition from static IP-based security controls to a dynamic, label-based policy model.
