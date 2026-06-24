# How to Set Up DNS Resolution Inside a Network Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Namespaces, DNS, resolv.conf, Networking, Container

Description: Configure DNS resolution inside a Linux network namespace using /etc/netns/ to provide namespace-specific resolv.conf files for name resolution.

## Introduction

Network namespaces have isolated network stacks, but by default they share the host's `/etc/resolv.conf`. With named namespaces, `ip netns exec` can present a namespace-specific DNS configuration from `/etc/netns/<namespace-name>/resolv.conf` to commands running in that namespace.

## Prerequisites

- A configured network namespace with internet access
- Root access

## The Default Behavior

Without namespace-specific DNS configuration, commands run with `ip netns exec` see the host's `/etc/resolv.conf`:

```bash
# Check DNS resolution in the namespace (uses host resolv.conf by default)

ip netns exec ns1 cat /etc/resolv.conf
# Shows the host's resolv.conf
```

## Create a Namespace-Specific resolv.conf

When you run a command with `ip netns exec`, it bind-mounts `/etc/netns/<namespace>/resolv.conf` as `/etc/resolv.conf` for that command:

```bash
# Create the namespace directory
mkdir -p /etc/netns/ns1

# Create the DNS configuration for ns1
cat > /etc/netns/ns1/resolv.conf << 'EOF'
# DNS servers for namespace ns1
nameserver 8.8.8.8
nameserver 8.8.4.4
search example.internal
EOF

# Verify the namespace now uses its own DNS config
ip netns exec ns1 cat /etc/resolv.conf
```

## Test DNS Resolution

```bash
# Test name resolution inside the namespace
ip netns exec ns1 nslookup google.com

# Test with dig (if available)
ip netns exec ns1 dig +short google.com

# Test both name resolution and connectivity
ip netns exec ns1 ping -c 2 google.com
```

## Use a Local DNS Resolver

For advanced setups, run a DNS resolver (like dnsmasq) inside the namespace and point `resolv.conf` to it:

```bash
# Start dnsmasq inside the namespace listening on 127.0.0.1
ip netns exec ns1 dnsmasq --keep-in-foreground --interface=lo \
    --bind-interfaces --listen-address=127.0.0.1 \
    --no-resolv --server=8.8.8.8 &

# Configure resolv.conf to use the local resolver
cat > /etc/netns/ns1/resolv.conf << 'EOF'
nameserver 127.0.0.1
EOF
```

## DNS with systemd-resolved

If the host's `/etc/resolv.conf` points to systemd-resolved's stub listener (`127.0.0.53`), do not reuse that address inside the namespace. In the namespace, `127.0.0.53` refers to its own loopback interface, not the host resolver:

```bash
# Use a direct DNS server (bypass systemd-resolved stub)
cat > /etc/netns/ns1/resolv.conf << 'EOF'
nameserver 1.1.1.1
nameserver 9.9.9.9
EOF
```

If the host also uses `nss-resolve`, glibc-based lookups may still go through `systemd-resolved`, so `dig` or `nslookup` are better direct tests of the namespace-specific `resolv.conf`.

## Custom Search Domains

```bash
# Namespace with custom search domain (for internal services)
mkdir -p /etc/netns/prod
cat > /etc/netns/prod/resolv.conf << 'EOF'
nameserver 10.0.0.53
search prod.internal corp.internal
options ndots:3
EOF
```

## Full Setup Script Including DNS

```bash
#!/bin/bash
# ns-with-dns.sh: Create a namespace with internet access and DNS

NS="ns1"
NS_DNS_DIR="/etc/netns/$NS"
WAN_IF=$(ip route show default | awk '/default/ {print $5; exit}')

# Create namespace and configure networking
ip netns add $NS
ip link add veth-host type veth peer name veth-ns
ip link set veth-ns netns $NS
ip addr add 10.0.0.1/24 dev veth-host && ip link set veth-host up
ip netns exec $NS ip link set lo up
ip netns exec $NS ip addr add 10.0.0.2/24 dev veth-ns
ip netns exec $NS ip link set veth-ns up
ip netns exec $NS ip route add default via 10.0.0.1

# Enable NAT
sysctl -w net.ipv4.ip_forward=1 > /dev/null
iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o "$WAN_IF" -j MASQUERADE

# Configure DNS
mkdir -p $NS_DNS_DIR
cat > $NS_DNS_DIR/resolv.conf << 'EOF'
nameserver 8.8.8.8
nameserver 1.1.1.1
EOF

echo "Testing DNS resolution in $NS..."
ip netns exec $NS ping -c 2 google.com && echo "DNS working!"
```

## Conclusion

Per-namespace DNS configuration is achieved through `/etc/netns/<name>/resolv.conf`. When you use `ip netns exec`, it bind-mounts that file as `/etc/resolv.conf` for the invoked command. This enables named namespaces to use independent DNS servers and search domains - similar to how container runtimes provide per-container resolver settings.
