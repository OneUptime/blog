# Avoid Mistakes When Integrating Calico IPAM With Legacy Firewalls

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, ipam, firewall, kubernetes, networking, security, legacy-infrastructure

Description: Learn how to avoid the common mistakes when running Calico-managed Kubernetes clusters alongside legacy firewalls — including IP whitelisting failures, unpredictable pod IP changes, and IPAM block routing gaps.

---

## Introduction

Many organizations run Kubernetes clusters alongside legacy firewall infrastructure that was designed for static IP environments. Legacy firewalls enforce rules based on specific IP addresses or narrow CIDR ranges — a model that conflicts with Calico's dynamic IP allocation, where pods can receive any IP from a large pool and that IP changes when pods are rescheduled.

The most common mistakes are: whitelisting individual pod IPs in firewall rules (which break on pod restarts), not accounting for Calico's block-level routing in firewall rules, and misunderstanding which traffic goes through the node IP vs. the pod IP when `natOutgoing` is involved.

## Prerequisites

- Calico CNI v3.x
- Access to legacy firewall management
- `calicoctl` CLI configured
- `kubectl` with cluster access
- Understanding of your firewall's IP whitelist mechanism

## Step 1: Mistake — Whitelisting Individual Pod IPs in Firewall Rules

The most fundamental mistake is writing firewall rules for specific pod IPs. Pod IPs change every time a pod is rescheduled.

```bash
# WRONG: Firewall rule targeting a specific pod IP
# iptables -A FORWARD -s 10.244.1.5 -d 10.10.0.100 -j ACCEPT
# This rule breaks the next time the pod restarts and gets a new IP

# CORRECT approach 1: Whitelist the entire pod CIDR
# iptables -A FORWARD -s 10.244.0.0/16 -d 10.10.0.100 -j ACCEPT

# CORRECT approach 2: For NATted traffic, whitelist the node IP range
# Pod traffic with natOutgoing=true exits through the node's IP
# So whitelist the node CIDR instead
# iptables -A FORWARD -s 10.0.1.0/24 -d 10.10.0.100 -j ACCEPT

# Verify which IP your pods appear as at the external destination
# Check if natOutgoing is enabled for the relevant pool
calicoctl get ippool default-ipv4-ippool -o yaml | grep natOutgoing
```

## Step 2: Understand NAT vs. Direct Routing for Firewall Rules

Whether traffic exits from the pod IP or the node IP depends on `natOutgoing` in the IP pool.

```yaml
# ippool-nat-behavior.yaml
# natOutgoing=true: external destinations see the node IP (NAT)
# natOutgoing=false: external destinations see the pod IP (BGP routing required)
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  natOutgoing: true    # With this: firewall must allow node IPs (10.0.1.0/24)
  # natOutgoing: false # With this: firewall must allow pod CIDR (10.244.0.0/16)
  ipipMode: Never
  vxlanMode: CrossSubnet
```

```bash
# Determine current natOutgoing setting for all pools
calicoctl get ippool -o yaml | grep -E "name:|natOutgoing:"

# Test which source IP appears at an external server
# Run a curl from a pod and check the server's access log
kubectl run test-pod --image=alpine --restart=Never -- curl -s http://external-server.example.com/log-ip
kubectl logs test-pod
```

## Step 3: Account for Calico Block-Level Routing

Calico routes at the block level (e.g., `/26` blocks), not at the individual pod IP level. Legacy firewalls need rules that allow entire block CIDRs, not just specific IPs.

```bash
# List all Calico block CIDRs (these are the routes Calico advertises)
calicoctl ipam show --show-blocks | awk 'NR>1 {print $1}'

# For legacy firewalls that need explicit route permissions:
# Each block in the output needs to be allowed if you're using natOutgoing=false

# Generate a list of block CIDRs for firewall rule automation
calicoctl ipam show --show-blocks | awk 'NR>1 {print $1}' | sort -u > calico-block-cidrs.txt
cat calico-block-cidrs.txt
```

## Step 4: Use Calico Network Policies as Firewall Complement

Rather than trying to make legacy firewalls work with dynamic pod IPs, use Calico network policies to enforce access control at the pod level, and simplify the legacy firewall to allow the entire pod CIDR.

```yaml
# calico-policy-replace-fw-rule.yaml
# This Calico policy replaces individual firewall rules per pod
# The legacy firewall only needs to allow 10.244.0.0/16 → external server
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-specific-app-to-external-db
spec:
  selector: app == "payment-service"   # Only applies to payment-service pods
  types:
    - Egress
  egress:
    - action: Allow
      destination:
        # Allow only to the specific external database, not all external destinations
        nets:
          - "10.10.0.100/32"           # External database IP
        ports:
          - 5432                        # PostgreSQL port only
    - action: Deny                      # Block all other egress
```

## Step 5: Document IPAM Topology for Firewall Team

Provide your firewall team with a CIDR-based summary of Calico's addressing, not individual IPs.

```bash
# Generate a summary of Calico IPAM topology for the firewall team
echo "=== Calico IPAM Summary for Firewall Configuration ==="
echo ""
echo "Pod CIDR (allow as a whole for NAT mode):"
calicoctl get ippool -o wide | grep -v "DISABLED"
echo ""
echo "Node CIDR (traffic seen by external hosts with natOutgoing=true):"
kubectl get nodes -o jsonpath='{range .items[*]}{.status.addresses[?(@.type=="InternalIP")].address}{"\n"}{end}' | sort
echo ""
echo "Service CIDR (for service-to-external traffic):"
kubectl cluster-info dump | grep service-cluster-ip-range | head -1
```

## Best Practices

- Never whitelist individual pod IPs in legacy firewall rules — they change on every pod restart.
- Provide your firewall team with CIDR ranges (pod CIDR or node CIDR depending on NAT mode), not individual IPs.
- When `natOutgoing: true`, legacy firewalls should allow the node CIDR; when `natOutgoing: false`, allow the pod CIDR.
- Use Calico network policies to enforce fine-grained access control between pods and external resources, reducing the firewall rule surface area.
- Request a firewall rule review whenever Calico IP pools are modified or new pools are added.

## Conclusion

Legacy firewalls and dynamic Kubernetes networking are inherently in tension. The correct integration approach is to treat the entire pod CIDR (or node CIDR with NAT) as the Kubernetes address space in your firewall, and use Calico's native network policies for pod-level access control. This simplifies firewall management while maintaining security — and eliminates the fragile IP-per-pod whitelisting that breaks on every pod restart.
