# How to Troubleshoot RIPng Routing Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RIPng, IPv6, Troubleshooting, Routing, Diagnostic

Description: A practical guide to diagnosing and resolving common RIPng routing problems including missing routes, convergence delays, and count-to-infinity issues.

## Overview

RIPng troubleshooting focuses on four main areas: the RIPng process is not running, interfaces are not participating in RIPng, routes are not being exchanged, and convergence is taking too long. This guide covers systematic diagnosis for each.

## Step 1: Verify RIPng is Running

```bash
# FRRouting

sudo systemctl status frr
ps aux | grep ripngd
vtysh -c "show ipv6 ripng"

# Cisco
show ipv6 rip

# If no output or error:
# Enable ripngd in /etc/frr/daemons and restart FRR
sudo sed -i 's/ripngd=no/ripngd=yes/' /etc/frr/daemons
sudo systemctl restart frr
```

## Step 2: Verify Interface Participation

```bash
# FRRouting: show RIPng status and configured networks/interfaces
vtysh -c "show ipv6 ripng status"

# If an interface is missing from the configuration:
vtysh
configure terminal
router ripng
 network eth0
end
write memory
```

## Step 3: Capture RIPng Updates

```bash
# Capture RIPng traffic to verify updates are being sent and received
sudo tcpdump -i eth0 -n "udp port 521"

# If no packets are seen:
# - Check firewall rules
# - Check multicast group membership
ip -6 maddr show dev eth0 | grep "ff02::9"
```

## Step 4: Check Firewall Rules

RIPng uses UDP port 521 and multicast ff02::9:

```bash
# Allow RIPng traffic
sudo ip6tables -A INPUT  -p udp --dport 521 -j ACCEPT
sudo ip6tables -A OUTPUT -p udp --sport 521 -j ACCEPT

# Allow multicast for RIPng
sudo ip6tables -A INPUT  -d ff02::9 -p udp --dport 521 -j ACCEPT
sudo ip6tables -A OUTPUT -d ff02::9 -p udp --sport 521 --dport 521 -j ACCEPT
```

## Step 5: Verify Link-Local Address Exists

RIPng requires a link-local address on participating interfaces:

```bash
# Check link-local address
ip -6 addr show dev eth0 | grep "scope link"
# Must show a fe80:: address

# If missing, add one:
sudo ip -6 addr add fe80::1/64 dev eth0 scope link
```

## Step 6: Check for Metric Issues

```bash
# Check for routes at metric 14-15 (approaching limit)
vtysh -c "show ipv6 ripng" | awk 'NR>3 && $5+0 >= 14 {print "HIGH METRIC:", $0}'

# Check for unreachable routes (metric 16)
vtysh -c "show ipv6 ripng" | awk 'NR>3 && $5+0 == 16 {print "UNREACHABLE:", $0}'
```

## Step 7: Debug RIPng Events

```bash
# FRRouting: enable debugging
vtysh
debug ripng events
debug ripng packet

# Watch for:
# - "Sending response to ff02::9" - updates are being sent
# - "Received response" - updates are being received
# - "Update route" - routes are being updated

journalctl -u frr -f | grep ripng

# Disable debugging after diagnosis
vtysh
no debug ripng events
no debug ripng packet
```

## Common Issues and Solutions

| Problem | Symptom | Solution |
|---------|---------|---------|
| ripngd not running | `show ipv6 ripng` fails | Enable in daemons file, restart FRR |
| No routes received | Empty routing table | Check firewall, multicast membership |
| Slow convergence | Failed routes take several minutes to age out | Expected for RIPng (180s timeout, 120s garbage collection) |
| Count-to-infinity | Metric keeps increasing | Verify split horizon is enabled |
| Missing link-local | Routes not learned | Add fe80:: address to interface |
| Wrong metric | Routes not preferred | Check metric distribution |

## Verifying Routes are Installed in Kernel

```bash
# FRRouting routes should appear in kernel table
ip -6 route show proto ripng

# If your iproute2 protocol aliases do not include ripng:
ip -6 route show proto 190

# If routes are in vtysh but not in kernel:
# Check Zebra is running and not having errors
journalctl -u frr | grep "zebra\|Error"
```

## Summary

RIPng troubleshooting starts with verifying the daemon is running and interfaces are configured. Use tcpdump on port 521 to confirm update exchange. Check firewall rules for UDP 521 and multicast ff02::9. Enable FRRouting debug with `debug ripng events` for detailed diagnostics. Routes should appear in both `show ipv6 ripng` and `ip -6 route show proto ripng` (or `ip -6 route show proto 190` when the FRR iproute2 protocol alias is not installed).
