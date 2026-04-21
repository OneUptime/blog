# How to Troubleshoot ARP Resolution Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, Troubleshooting, IPv4

Description: Learn how to diagnose and fix ARP resolution failures that prevent hosts from communicating on the same subnet.

## Symptoms of ARP Failure

- Ping to a local host fails with "Destination Host Unreachable"
- ARP entry shows FAILED or INCOMPLETE state
- No traffic flowing despite correct IP configuration
- Intermittent connectivity to a specific host

## Step 1: Check the ARP Table

```bash
# Look for FAILED or INCOMPLETE entries

ip neigh show

# Example of a failed entry:
# 192.168.1.50 dev eth0  FAILED
```

An INCOMPLETE entry means ARP request was sent but no reply received.

## Step 2: Verify Network Connectivity

```bash
# Check if the interface is up and has correct IP
ip addr show eth0

# Verify routes
ip route show

# Confirm the target is on the same subnet
python3 -c "
import ipaddress
a = ipaddress.ip_interface('192.168.1.10/24')
b = ipaddress.ip_address('192.168.1.50')
print('Same subnet:', b in a.network)
"
```

## Step 3: Send Manual ARP Request

```bash
# Send ARP request manually using arping
arping -I eth0 -c 3 192.168.1.50

# Expected output if reachable:
# ARPING 192.168.1.50 from 192.168.1.10 eth0
# Unicast reply from 192.168.1.50 [00:11:22:33:44:55]  1.234ms
```

If no response, the issue may be:
- Target host is down or unreachable
- Firewall dropping ARP on target
- ARP requests not being broadcast (VLAN issue)
- Different VLAN or subnet than expected

## Step 4: Capture ARP Traffic

```bash
# Watch for ARP requests and replies
tcpdump -n -e -i eth0 arp

# Look for:
# - ARP request going out? (broadcast)
# - ARP reply coming back? (unicast)
```

If no request is going out, check your routing table and interface configuration.

## Step 5: Check for ARP Filtering

On Linux, check for arp_filter and arp_ignore settings:

```bash
# Check ARP filter setting (1 = answer only when routing would use this interface)
cat /proc/sys/net/ipv4/conf/eth0/arp_filter

# Check ARP ignore setting
# 0 = reply for any local target IP, even if configured on another interface
# 1 = reply only if the target IP is configured on the incoming interface
cat /proc/sys/net/ipv4/conf/eth0/arp_ignore
```

Fix overly restrictive settings:

```bash
sudo sysctl -w net.ipv4.conf.eth0.arp_ignore=0
sudo sysctl -w net.ipv4.conf.eth0.arp_filter=0
```

## Step 6: Check for Proxy ARP or Firewall Issues

```bash
# Check if proxy ARP is enabled (can cause issues)
cat /proc/sys/net/ipv4/conf/eth0/proxy_arp

# Check ebtables for any ARP-blocking rules
ebtables -L 2>/dev/null || echo "ebtables not installed"
```

## Step 7: Verify MAC Address and NIC

```bash
# Confirm the MAC address is correct
ip link show eth0

# Check for hardware issues or driver problems
ethtool eth0 | grep "Link detected"
dmesg | grep eth0 | tail -20
```

## Common Root Causes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| INCOMPLETE entry | Host not responding | Verify host is up; check firewall |
| FAILED entry | All probes failed | Check cable, VLAN, interface state |
| Wrong MAC in cache | Stale entry | Flush ARP cache, re-test |
| ARP request not sent | No route to host | Add subnet route or check IP config |
| arp_ignore=2 | Too restrictive setting | Set arp_ignore=0 or 1 |

## Key Takeaways

- INCOMPLETE/FAILED ARP states indicate the target is not responding to ARP.
- Use `arping` to test ARP at layer 2 directly.
- `tcpdump arp` confirms whether requests are being sent and replies received.
- `arp_ignore` and `arp_filter` kernel settings can block legitimate ARP responses.

**Related Reading:**

- [How to View the ARP Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-arp-table-linux/view)
- [How to Capture ARP Packets with tcpdump](https://oneuptime.com/blog/post/2026-03-20-capture-arp-tcpdump/view)
- [How to Analyze ARP Traffic with Wireshark](https://oneuptime.com/blog/post/2026-03-20-analyze-arp-wireshark/view)
