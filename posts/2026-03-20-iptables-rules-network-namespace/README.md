# How to Run iptables Rules Inside a Network Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Namespaces, iptables, Firewall, Networking, Security, Container

Description: Apply iptables firewall rules within a specific network namespace to create per-namespace firewall policies independent of the host and other namespaces.

## Introduction

Each network namespace has its own independent iptables (and nftables) ruleset. Commands run in the host namespace modify only the host ruleset, and commands run with `ip netns exec` modify only that namespace's ruleset. Traffic that traverses both the namespace and the host can still be filtered in both places. This allows you to create fine-grained, per-namespace firewall policies - useful for multi-tenant setups, testing, and security isolation.

## Prerequisites

- A network namespace configured with interfaces
- iptables installed
- Root access

## Running iptables Inside a Namespace

Use `ip netns exec` to run any iptables command inside a namespace:

```bash
# List iptables rules inside namespace ns1

ip netns exec ns1 iptables -L -n -v

# By default, a new namespace has empty iptables rules
# with ACCEPT policies on all chains
```

## Add a Basic Firewall Inside the Namespace

```bash
# Set default policies in ns1
ip netns exec ns1 iptables -P INPUT DROP
ip netns exec ns1 iptables -P FORWARD DROP
ip netns exec ns1 iptables -P OUTPUT ACCEPT

# Allow loopback traffic
ip netns exec ns1 iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
ip netns exec ns1 iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (port 22)
ip netns exec ns1 iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

## Apply NAT Inside a Namespace

NAT rules in a namespace are completely separate from host NAT:

```bash
# Allow MASQUERADE for traffic leaving veth-ns (namespace internet routing)
ip netns exec ns1 iptables -t nat -A POSTROUTING -o veth-ns -j MASQUERADE
```

## Apply Rate Limiting Inside a Namespace

If you want to rate-limit SSH instead of allowing it unconditionally, replace the plain SSH `ACCEPT` rule above with:

```bash
# Allow up to 3 new SSH connections per minute inside ns1 (burst 5)
ip netns exec ns1 iptables -A INPUT -p tcp --dport 22 \
    -m conntrack --ctstate NEW -m limit --limit 3/min --limit-burst 5 -j ACCEPT
ip netns exec ns1 iptables -A INPUT -p tcp --dport 22 -j DROP
```

## Full Namespace Firewall Script

```bash
#!/bin/bash
# setup-ns-firewall.sh: Apply a firewall policy inside a namespace

NS="ns1"

setup_namespace_firewall() {
    local ns=$1

    # Flush existing rules
    ip netns exec $ns iptables -F
    ip netns exec $ns iptables -X
    ip netns exec $ns iptables -Z
    ip netns exec $ns iptables -t nat -F

    # Set default policies
    ip netns exec $ns iptables -P INPUT DROP
    ip netns exec $ns iptables -P FORWARD DROP
    ip netns exec $ns iptables -P OUTPUT ACCEPT

    # Allow loopback
    ip netns exec $ns iptables -A INPUT -i lo -j ACCEPT

    # Allow established/related
    ip netns exec $ns iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

    # Allow SSH
    ip netns exec $ns iptables -A INPUT -p tcp --dport 22 -j ACCEPT

    # Allow HTTP and HTTPS
    ip netns exec $ns iptables -A INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT

    echo "Firewall applied to namespace: $ns"
    ip netns exec $ns iptables -L -n -v
}

setup_namespace_firewall $NS
```

## Namespace vs Host Firewall Independence

```bash
# Block port 80 in the namespace - this changes only ns1's ruleset
ip netns exec ns1 iptables -A INPUT -p tcp --dport 80 -j DROP

# Inspect the host namespace separately
iptables -S INPUT
```

## Use nftables Instead

```bash
# Apply nftables rules inside the namespace
ip netns exec ns1 nft add table inet filter
ip netns exec ns1 nft add chain inet filter input \
    { type filter hook input priority 0 \; policy drop \; }
ip netns exec ns1 nft add rule inet filter input ct state established,related accept
ip netns exec ns1 nft add rule inet filter input tcp dport 22 accept
```

## Conclusion

iptables rulesets inside a network namespace are configured independently from the host and other namespaces. Use `ip netns exec <namespace> iptables` to apply namespace-specific firewall policies. Traffic that traverses both a namespace and the host can still be filtered in both places, which makes network namespaces useful for multi-tenant environments and layered network isolation.
