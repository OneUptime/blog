# How to Use ip tunnel show to Inspect GRE Tunnels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GRE, Ip tunnel, Linux, Inspection, Networking, Tunnel Management, IPv4

Description: Learn how to use the ip tunnel show command to list and inspect GRE tunnel configurations on Linux, including tunnel mode, local/remote addresses, TTL, and key values.

---

`ip tunnel show` lists configured tunnel interfaces handled by `ip tunnel`, including GRE, IPIP, and SIT tunnels, with their configuration parameters.

## Basic Usage

```bash
# List tunnel interfaces managed by ip tunnel

ip tunnel show

# Output:
# gre0: gre/ip remote any local any ttl inherit nopmtudisc
# gre1: gre/ip remote 10.0.0.2 local 10.0.0.1 ttl 255
# tunl0: ip/ip remote any local any ttl inherit nopmtudisc
# sit0: ipv6/ip remote any local any ttl 64 nopmtudisc

# Show a specific tunnel
ip tunnel show gre1
# gre1: gre/ip remote 10.0.0.2 local 10.0.0.1 ttl 255
```

## Understanding the Output

```text
gre1: gre/ip remote 10.0.0.2 local 10.0.0.1 ttl 255

  gre1           → Interface name
  gre/ip         → Tunnel mode (GRE over IPv4)
  remote 10.0.0.2 → Remote tunnel endpoint
  local 10.0.0.1  → Local tunnel endpoint (source IP)
  ttl 255        → TTL for outer GRE packets
  nopmtudisc     → Path MTU discovery disabled (if shown)
  key 0x100      → GRE key (if configured)
  csum           → Checksum enabled (if configured)
```

## Filtering Tunnel Types

```bash
# Show only GRE tunnels
ip -d link show type gre

# Show GRETAP tunnels (GRE with Ethernet header)
ip -d link show type gretap

# Show all tunnels managed by ip tunnel
ip tunnel show

# JSON output for scripting
ip -j tunnel show | python3 -m json.tool
```

## Checking Inner vs. Outer IP

```bash
# ip tunnel show gives outer (transport) IPs
ip tunnel show gre1
# remote 10.0.0.2 local 10.0.0.1 = outer IPs

# ip addr show gives inner (tunnel) IP
ip addr show gre1
# 172.16.1.1/30 = inner IP
```

## Verifying Tunnel Statistics

```bash
# Show packet and byte counters
ip -s link show gre1
```

## Listing All Tunnel Interfaces with Their IPs

```bash
#!/bin/bash
# Show all GRE tunnels with inner and outer IPs

echo "Interface  Outer-Local    Outer-Remote   Inner-IP"
echo "---------  -----------    ------------   --------"

ip tunnel show | awk '$2 == "gre/ip"' | while read line; do
  iface=$(echo "$line" | awk '{print $1}' | tr -d ':')
  local_ip=$(echo "$line" | grep -oP 'local \K[0-9.]+')
  remote_ip=$(echo "$line" | grep -oP 'remote \K[0-9.]+')
  inner_ip=$(ip addr show "$iface" 2>/dev/null | grep "inet " | awk '{print $2}')
  echo "$iface  ${local_ip:-any}  ${remote_ip:-any}  ${inner_ip:-none}"
done
```

## Key Takeaways

- `ip tunnel show` displays outer tunnel parameters (mode, remote/local IPs, TTL, key).
- `ip addr show gre1` shows the inner tunnel IP assigned to the interface.
- Use `ip -d link show type gre` for detailed interface flags including MULTICAST and other options.
- The `ip -j tunnel show` command outputs JSON, making it easy to parse in monitoring scripts.
