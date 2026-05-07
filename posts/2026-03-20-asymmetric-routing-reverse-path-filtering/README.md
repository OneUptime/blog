# How to Configure Asymmetric Routing with Reverse Path Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Routing, Asymmetric Routing, Reverse Path Filtering, Rp_filter, Networking, Security

Description: Configure asymmetric routing on Linux by adjusting reverse path filtering (rp_filter) settings to allow traffic that arrives and departs via different interfaces.

## Introduction

Asymmetric routing occurs when packets from A to B take a different path than packets from B to A. In strict mode, Linux's reverse path filtering (rp_filter) blocks packets that arrive on an interface different from the one the kernel would use as the best reverse path. For legitimate asymmetric routing scenarios, you must relax or disable rp_filter.

## Check Current rp_filter Settings

```bash
# Check rp_filter for all interfaces

sysctl -a | grep rp_filter

# Check specific interface
sysctl net.ipv4.conf.eth0.rp_filter
sysctl net.ipv4.conf.all.rp_filter

# Values:
# 0 = No filtering
# 1 = Strict mode (source must be reachable via the incoming interface's best reverse path)
# 2 = Loose mode (source must be reachable via any interface)
```

## Disable rp_filter for Asymmetric Routing

```bash
# Set loose mode (value 2) for a specific interface
sysctl -w net.ipv4.conf.eth0.rp_filter=2
sysctl -w net.ipv4.conf.eth1.rp_filter=2

# Or disable entirely (value 0) - less safe
sysctl -w net.ipv4.conf.eth0.rp_filter=0

# Use 'default' as the template for newly created interfaces
sysctl -w net.ipv4.conf.default.rp_filter=2

# rp_filter uses the higher value of 'all' and the per-interface setting
sysctl -w net.ipv4.conf.all.rp_filter=2
```

## Make rp_filter Changes Persistent

```bash
# Add to /etc/sysctl.conf or /etc/sysctl.d/99-routing.conf
cat > /etc/sysctl.d/99-routing.conf << 'EOF'
net.ipv4.conf.default.rp_filter = 2
net.ipv4.conf.all.rp_filter = 2
net.ipv4.conf.eth0.rp_filter = 2
net.ipv4.conf.eth1.rp_filter = 2
EOF

# Apply immediately
sysctl -p /etc/sysctl.d/99-routing.conf
```

## Asymmetric Routing Example

Traffic from Client A comes in via eth0, reply goes out via eth1 (multi-homed server):

```bash
# Configure routing tables for each ISP
ip route add 10.0.0.0/24 dev eth0 src 10.0.0.5 table 100
ip route add default via 10.0.0.1 dev eth0 table 100
ip route add 10.0.1.0/24 dev eth1 src 10.0.1.5 table 200
ip route add default via 10.0.1.1 dev eth1 table 200

# Policy rules for correct reply routing
ip rule add from 10.0.0.5 table 100
ip rule add from 10.0.1.5 table 200

# Set loose rp_filter to allow asymmetric paths
sysctl -w net.ipv4.conf.eth0.rp_filter=2
sysctl -w net.ipv4.conf.eth1.rp_filter=2
```

## Diagnose rp_filter Drops

```bash
# Count packets dropped by rp_filter
nstat -az | grep -i IPReversePathFilter

# Check which interface the kernel would use back to a source IP
ip route get 198.51.100.10

# Log martian packets for more detail
sysctl -w net.ipv4.conf.all.log_martians=1
dmesg --follow | grep -i martian
```

## rp_filter Modes Summary

| Mode | Behavior | Use Case |
|---|---|---|
| 0 | No filter | Full asymmetric routing |
| 1 | Strict | Single-homed hosts |
| 2 | Loose | Multi-homed, asymmetric |

## Conclusion

Reverse path filtering protects against spoofed source addresses but interferes with legitimate asymmetric routing. Set `rp_filter=2` (loose mode) on multi-homed interfaces to allow asymmetric paths while maintaining some protection. Use policy routing rules alongside rp_filter adjustments to ensure correct reply routing.
