# How to Disable IPv4 Source Routing for Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Security, IPv4, Source Routing, Sysctl, Hardening

Description: Disable IPv4 source routing options (LSRR and SSRR) on Linux to prevent attackers from manipulating packet paths and bypassing network controls.

IPv4 source routing allows the sender to influence part or all of the route a packet takes through the network. Attackers can abuse this to bypass normal routing assumptions, redirect traffic, and conduct spoofing attacks. Disabling acceptance of source-routed packets is a common hardening step.

## What Is Source Routing?

IPv4 source routing is an IP header option that embeds routing directives:

```text
IP Header Options:
  LSRR (Loose Source and Record Route) - packet must pass through
         specified hops but can take any path between them
  SSRR (Strict Source and Record Route) - packet must follow
         the exact specified path

Attack uses:
  - Bypass network controls that assume normal routing paths
  - Influence traffic forwarding through routers that honor source routes
  - Network topology enumeration
```

## Check Current Status

```bash
# Check if source routing is currently accepted (0 = disabled, 1 = enabled)

cat /proc/sys/net/ipv4/conf/all/accept_source_route

# Check each interface
for iface in /proc/sys/net/ipv4/conf/*/accept_source_route; do
    echo "$iface: $(cat $iface)"
done
```

## Disable Source Routing via sysctl

```bash
# Disable source routing globally and for future interfaces
sudo sysctl -w net.ipv4.conf.all.accept_source_route=0
sudo sysctl -w net.ipv4.conf.default.accept_source_route=0

# Also disable on all currently present interfaces explicitly
for iface in /proc/sys/net/ipv4/conf/*; do
    iface=$(basename "$iface")
    sudo sysctl -w "net.ipv4.conf.${iface}.accept_source_route=0"
done

# Verify
sysctl net.ipv4.conf.all.accept_source_route
# net.ipv4.conf.all.accept_source_route = 0
```

## Make Changes Persistent

```bash
# Add to /etc/sysctl.conf or a drop-in file
sudo tee /etc/sysctl.d/99-disable-source-routing.conf << 'EOF'
# Disable IPv4 source routing (security hardening)
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
EOF

# Apply immediately
sudo sysctl -p /etc/sysctl.d/99-disable-source-routing.conf
```

## Block Packets with IP Options at the Firewall

For defense-in-depth on modern Linux systems, you can also drop IPv4 packets with header options at the firewall level. This is broader than just LSRR and SSRR, but it blocks source-routed packets too:

```bash
# If you already use an inet/filter nftables ruleset, drop IPv4 packets
# whose header length indicates IP options are present.
# IHL 5 means a normal 20-byte IPv4 header; 6-15 means options are present.
sudo nft add rule inet filter input ip hdrlength 6-15 drop
sudo nft add rule inet filter forward ip hdrlength 6-15 drop
```

## Verify with a Test Packet (Optional)

To test that source routing is blocked, you can craft a source-routed packet:

```bash
# Install Nping (part of the Nmap suite)
# Debian/Ubuntu example:
sudo apt install nmap

# Send ICMP probes with loose source routing
# Replace the route addresses with valid hops in your environment.
# Many networks drop source-routed traffic before it reaches the target.
# A host with accept_source_route disabled should not reply.
sudo nping --icmp --ip-options "L 192.0.2.1 198.51.100.1" target-ip -c 3 --packet-trace

# Use packet capture to confirm the probe carried IPv4 options
sudo tcpdump -i eth0 -n 'ip[0] & 0xf > 5' -c 5
# "ip[0] & 0xf > 5" matches IPv4 packets whose header includes options
```

## Compliance Requirements

Disabling source routing is required by many security frameworks:

```bash
CIS Benchmarks for Linux distributions include controls for disabling source-routed packets
DISA STIGs for Linux distributions include checks for accept_source_route
NIST 800-53: SC-5 is commonly mapped to this control

Check compliance:
sudo grep -r "accept_source_route" /etc/sysctl.conf /etc/sysctl.d/
```

Disabling IPv4 source routing usually has little or no impact on normal network operations and is a sensible baseline unless you explicitly depend on source-routed traffic.
