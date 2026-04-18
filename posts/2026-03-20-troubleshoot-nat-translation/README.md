# How to Troubleshoot NAT Translation Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, Troubleshooting, Linux, IPv4

Description: Learn a systematic approach to diagnosing and fixing common NAT translation failures on Linux and Cisco routers.

## Common NAT Problems

1. Inside hosts cannot reach the internet
2. Inbound port forwarding not working
3. NAT translations not appearing in the table
4. Some hosts translated, others not
5. Intermittent connectivity

## Step 1: Verify IP Forwarding Is Enabled

```bash
# Linux: Check if forwarding is on

cat /proc/sys/net/ipv4/ip_forward
# Must be 1

# Enable if not
echo 1 > /proc/sys/net/ipv4/ip_forward

# Persist
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p
```

## Step 2: Check NAT Rules

```bash
# List all NAT rules
iptables -t nat -L -n -v --line-numbers

# Check POSTROUTING for outbound NAT
iptables -t nat -L POSTROUTING -n -v

# Check PREROUTING for port forwarding
iptables -t nat -L PREROUTING -n -v

# Check FORWARD chain
iptables -L FORWARD -n -v
```

Common mistake: the FORWARD chain has a DROP policy with no ACCEPT rules.

## Step 3: Verify Connection Tracking

```bash
# Install conntrack
apt install conntrack   # Debian/Ubuntu

# List active NAT sessions
conntrack -L

# Watch new connections in real time
conntrack -E

# Check conntrack table limits
cat /proc/sys/net/netfilter/nf_conntrack_max
cat /proc/sys/net/netfilter/nf_conntrack_count
```

If count is near max, increase the limit:

```bash
sysctl -w net.netfilter.nf_conntrack_max=262144
```

## Step 4: Check Interface Assignment

```bash
# Confirm which interface is inside/outside
ip addr show

# Verify the NAT rule references the correct interface
iptables -t nat -L POSTROUTING -n -v | grep eth
```

Cisco: confirm `ip nat inside` and `ip nat outside` on correct interfaces:

```cisco
show ip nat translations verbose
show interfaces GigabitEthernet0/0 | include NAT
```

## Step 5: Packet Capture to Diagnose

```bash
# Capture outbound traffic BEFORE NAT (inside interface)
tcpdump -n -i eth0 -s 0 host 192.168.1.10

# Capture AFTER NAT (outside interface)
tcpdump -n -i eth1 -s 0 host 203.0.113.1

# Expected: packets from 192.168.1.10 should appear as 203.0.113.1 on eth1
```

## Step 6: Test NAT Rules with Specific Host

```bash
# From inside host:
curl -v --interface 192.168.1.10 http://ifconfig.me
# Should return the public IP

# Or test routing path
traceroute 8.8.8.8
```

## Cisco-Specific NAT Debugging

```cisco
! Enable NAT debugging (caution: verbose on busy routers)
debug ip nat

! Debug for a specific host (reference an ACL, not a raw IP)
access-list 10 permit host 192.168.1.10
debug ip nat 10

! Check translation table
show ip nat translations total

! Check statistics for misses
show ip nat statistics
```

## Common Root Causes Table

| Symptom | Root Cause | Fix |
|---------|------------|-----|
| No translations in table | IP forwarding off or wrong interface | Enable forwarding; fix interface NAT direction |
| Partial hosts translated | ACL too restrictive | Expand ACL or use `permit any` for testing |
| Port forward not working | Missing FORWARD rule | Add `iptables -A FORWARD` rule |
| conntrack table full | High connection rate | Increase `nf_conntrack_max` |
| Intermittent outbound | PAT port exhaustion | Add more public IPs to SNAT range |
| Can reach from outside but not inside | Missing hairpin NAT | Configure NAT loopback/hairpin |

## Key Takeaways

- Always verify IP forwarding is enabled before troubleshooting NAT.
- Check both the NAT table (PREROUTING/POSTROUTING) and the FORWARD chain.
- Use `conntrack -L` to see active NAT sessions and verify translations are occurring.
- Packet captures on inside and outside interfaces confirm the NAT transformation.

**Related Reading:**

- [How to Configure PAT (Port Address Translation)](https://oneuptime.com/blog/post/2026-03-20-configure-pat-nat-overload/view)
- [How to View the NAT Translation Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-nat-translation-table-linux/view)
- [How to Debug NAT Issues with Packet Captures](https://oneuptime.com/blog/post/2026-03-20-debug-nat-packet-captures/view)
