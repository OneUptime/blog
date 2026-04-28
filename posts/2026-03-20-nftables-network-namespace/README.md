# How to Run nftables Rules Inside a Network Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Network Namespaces, Linux, Firewall, Isolation, Netns, IPv4

Description: Learn how to configure nftables firewall rules inside Linux network namespaces for isolated firewall policies, testing environments, and container-like network isolation.

---

Each Linux network namespace has its own nftables rule set. This allows independent firewall policies per namespace, useful for container networking, testing, and multi-tenant environments.

## Creating a Network Namespace

```bash
# Create a new namespace

ip netns add testns

# Verify
ip netns list

# Execute commands inside the namespace
ip netns exec testns ip link show
```

## Running nftables Inside a Namespace

```bash
# Load nftables rules in the namespace
ip netns exec testns nft -f /etc/nftables-testns.conf

# Or run nft commands directly
ip netns exec testns nft add table ip filter
ip netns exec testns nft add chain ip filter input \
  '{ type filter hook input priority 0; policy drop; }'

# List rules in the namespace
ip netns exec testns nft list ruleset
```

## Example: Namespace Firewall Policy

```bash
# /etc/nftables-testns.conf
table ip filter {
    chain input {
        type filter hook input priority 0;
        policy drop;

        # Allow established connections
        ct state established,related accept

        # Allow ICMP
        icmp type echo-request accept

        # Allow SSH from management network only
        ip saddr 10.0.0.0/24 tcp dport 22 accept

        # Drop everything else
        log prefix "NETNS-DROP: " drop
    }

    chain forward {
        type filter hook forward priority 0;
        policy drop;
    }

    chain output {
        type filter hook output priority 0;
        policy accept;
    }
}
```

## Connecting Namespaces with veth Pairs

```bash
# Create a veth pair bridging the namespace to the host
ip link add veth0 type veth peer name veth1

# Move veth1 into the namespace
ip link set veth1 netns testns

# Configure IPs
ip addr add 10.100.0.1/30 dev veth0
ip link set veth0 up

ip netns exec testns ip addr add 10.100.0.2/30 dev veth1
ip netns exec testns ip link set veth1 up
ip netns exec testns ip link set lo up

# Apply nftables inside namespace
ip netns exec testns nft -f /etc/nftables-testns.conf

# Test connectivity
ping 10.100.0.2
ip netns exec testns ping 10.100.0.1
```

## Namespace-Specific nftables Debugging

```bash
# Monitor rule hits in namespace
ip netns exec testns nft monitor trace

# Count matched rules
ip netns exec testns nft -a list ruleset   # -a shows handles
ip netns exec testns nft -s list ruleset   # -s omits stateful info (counters)
```

## Key Takeaways

- Each network namespace has an isolated nftables rule set; rules in the host namespace do not affect namespaces.
- Use `ip netns exec <ns> nft` to manage rules inside a namespace.
- veth pairs are the standard way to connect namespaces; apply nftables on the namespace-side interface.
- Namespace-level firewall rules are ideal for testing policies without affecting the host or other containers.
