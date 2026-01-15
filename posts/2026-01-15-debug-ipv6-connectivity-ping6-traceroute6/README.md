# How to Debug IPv6 Connectivity Issues with ping6 and traceroute6

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Networking, Linux, Troubleshooting, DevOps, Debugging

Description: A comprehensive guide to diagnosing and resolving IPv6 connectivity problems using ping6 and traceroute6 command-line tools, with real-world troubleshooting scenarios and best practices.

---

IPv6 adoption continues to grow as IPv4 address exhaustion becomes reality. Yet debugging IPv6 connectivity remains a mystery for many engineers. The fundamentals are similar to IPv4, but the tools and address formats require specific knowledge. This guide covers everything you need to diagnose IPv6 issues effectively.

## Why IPv6 Debugging Matters

IPv6 is no longer optional. Major cloud providers, content delivery networks, and internet service providers have deployed dual-stack networks. When IPv6 breaks, users on IPv6-preferred networks experience degraded service or complete outages.

Common scenarios where IPv6 debugging skills are essential:

- **Dual-stack environments** where IPv6 is preferred but misconfigured
- **Kubernetes clusters** using IPv6-only or dual-stack networking
- **Cloud deployments** across multiple regions with IPv6 connectivity
- **CDN and edge networks** serving IPv6-enabled clients
- **Internal infrastructure** transitioning from IPv4 to IPv6

---

## Understanding IPv6 Addresses

Before debugging, you need to understand IPv6 address structure.

### Address Format

IPv6 addresses are 128 bits represented as eight groups of four hexadecimal digits:

```
2001:0db8:85a3:0000:0000:8a2e:0370:7334
```

### Shorthand Notation

Consecutive groups of zeros can be replaced with `::` (once per address):

```bash
# Full form
2001:0db8:0000:0000:0000:0000:0000:0001

# Shortened form
2001:db8::1
```

### Common Address Types

```bash
# Loopback address (equivalent to 127.0.0.1)
::1

# Link-local addresses (auto-configured, start with fe80::)
fe80::1

# Global unicast addresses (routable on internet)
2001:db8::1

# Unique local addresses (private, similar to 10.x.x.x)
fd00::1

# Multicast addresses
ff02::1  # All nodes on local network
ff02::2  # All routers on local network
```

### Scoped Addresses and Zone IDs

Link-local addresses require a zone ID (interface identifier):

```bash
# Link-local address with zone ID
fe80::1%eth0
fe80::1%en0
```

---

## The ping6 Command

`ping6` is the IPv6 equivalent of `ping`. On modern systems, `ping` often handles both IPv4 and IPv6, but `ping6` explicitly forces IPv6.

### Basic Usage

Test basic connectivity to an IPv6 address:

```bash
# Ping an IPv6 address
ping6 2001:4860:4860::8888
```

Expected output:

```
PING 2001:4860:4860::8888(2001:4860:4860::8888) 56 data bytes
64 bytes from 2001:4860:4860::8888: icmp_seq=1 ttl=117 time=12.3 ms
64 bytes from 2001:4860:4860::8888: icmp_seq=2 ttl=117 time=11.8 ms
64 bytes from 2001:4860:4860::8888: icmp_seq=3 ttl=117 time=12.1 ms
```

### Ping by Hostname

Let ping6 resolve the AAAA record:

```bash
# Ping hostname (resolves AAAA record)
ping6 ipv6.google.com
```

### Specify Interface

Required for link-local addresses:

```bash
# Ping link-local address on specific interface
ping6 -I eth0 fe80::1

# Alternative syntax with zone ID
ping6 fe80::1%eth0
```

### Control Packet Count

Limit the number of packets sent:

```bash
# Send exactly 5 packets and stop
ping6 -c 5 2001:4860:4860::8888
```

### Set Packet Size

Test with larger packets to check MTU issues:

```bash
# Send 1400-byte packets (plus headers)
ping6 -s 1400 2001:4860:4860::8888

# Test MTU with don't-fragment flag
ping6 -M do -s 1452 2001:4860:4860::8888
```

### Adjust Interval

Change the time between packets:

```bash
# Send packets every 0.2 seconds (requires root)
sudo ping6 -i 0.2 2001:4860:4860::8888

# Flood ping for stress testing (requires root)
sudo ping6 -f 2001:4860:4860::8888
```

### Verbose Output

Get more detailed information:

```bash
# Verbose mode with numeric output
ping6 -v -n 2001:4860:4860::8888
```

### Set TTL (Hop Limit)

Control how far packets can travel:

```bash
# Set hop limit to 64
ping6 -t 64 2001:4860:4860::8888
```

### Source Address Selection

Specify which source address to use:

```bash
# Use specific source address
ping6 -S 2001:db8::1 2001:4860:4860::8888
```

---

## The traceroute6 Command

`traceroute6` shows the path packets take to reach a destination. It reveals every router (hop) along the way.

### Basic Usage

Trace the route to a destination:

```bash
# Trace route to IPv6 address
traceroute6 2001:4860:4860::8888
```

Expected output:

```
traceroute to 2001:4860:4860::8888 (2001:4860:4860::8888), 30 hops max, 80 byte packets
 1  2001:db8::1 (2001:db8::1)  0.523 ms  0.498 ms  0.481 ms
 2  2001:db8:1::1 (2001:db8:1::1)  1.234 ms  1.198 ms  1.167 ms
 3  2001:4860:0:1::1 (2001:4860:0:1::1)  10.456 ms  10.423 ms  10.398 ms
 4  2001:4860:4860::8888 (2001:4860:4860::8888)  12.345 ms  12.312 ms  12.287 ms
```

### Trace by Hostname

Let traceroute6 resolve the destination:

```bash
# Trace route to hostname
traceroute6 ipv6.google.com
```

### Specify Interface

Use a specific network interface:

```bash
# Use specific interface
traceroute6 -i eth0 2001:4860:4860::8888
```

### Set Maximum Hops

Limit how far the trace goes:

```bash
# Maximum 15 hops
traceroute6 -m 15 2001:4860:4860::8888
```

### Numeric Output Only

Skip DNS lookups for faster results:

```bash
# Don't resolve hostnames
traceroute6 -n 2001:4860:4860::8888
```

### Control Probes Per Hop

Adjust the number of packets per hop:

```bash
# Send 1 probe per hop (faster)
traceroute6 -q 1 2001:4860:4860::8888

# Send 5 probes per hop (more accurate)
traceroute6 -q 5 2001:4860:4860::8888
```

### Set Packet Size

Test path MTU discovery:

```bash
# Use larger packets
traceroute6 -s 1400 2001:4860:4860::8888
```

### Use Different Probe Methods

TCP or UDP-based tracing:

```bash
# Use TCP SYN probes (useful when ICMP is blocked)
traceroute6 -T -p 80 2001:4860:4860::8888

# Use UDP probes (default)
traceroute6 -U 2001:4860:4860::8888

# Use ICMP echo probes
traceroute6 -I 2001:4860:4860::8888
```

### Set Wait Time

Adjust timeout for each probe:

```bash
# Wait 3 seconds per probe
traceroute6 -w 3 2001:4860:4860::8888
```

### Specify Source Address

Control the source address used:

```bash
# Use specific source address
traceroute6 -s 2001:db8::1 2001:4860:4860::8888
```

---

## Common IPv6 Connectivity Issues

### Issue 1: No IPv6 Address Configured

**Symptoms:**
- `ping6` fails with "Network is unreachable"
- No global IPv6 address on interface

**Diagnosis:**

```bash
# Check if IPv6 is enabled on the interface
ip -6 addr show

# Look for global scope addresses
ip -6 addr show scope global

# Check if IPv6 is disabled in kernel
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
```

Expected output when IPv6 is working:

```
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
    inet6 2001:db8::100/64 scope global dynamic
       valid_lft 86400sec preferred_lft 14400sec
    inet6 fe80::1/64 scope link
       valid_lft forever preferred_lft forever
```

**Resolution:**

```bash
# Enable IPv6 if disabled
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

# Request new address via DHCP6
sudo dhclient -6 eth0

# Or configure static address
sudo ip -6 addr add 2001:db8::100/64 dev eth0
```

### Issue 2: No Default IPv6 Route

**Symptoms:**
- Can ping link-local addresses
- Cannot reach global addresses
- traceroute6 shows no path

**Diagnosis:**

```bash
# Check IPv6 routing table
ip -6 route show

# Look for default route
ip -6 route show default
```

Expected output with working routing:

```
default via 2001:db8::1 dev eth0 metric 1024
2001:db8::/64 dev eth0 proto kernel metric 256
fe80::/64 dev eth0 proto kernel metric 256
```

**Resolution:**

```bash
# Add default route
sudo ip -6 route add default via 2001:db8::1 dev eth0

# Or enable router advertisement acceptance
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=1
```

### Issue 3: DNS Not Resolving AAAA Records

**Symptoms:**
- ping6 works with IP addresses
- ping6 fails with hostnames
- dig shows no AAAA records

**Diagnosis:**

```bash
# Check if AAAA records exist
dig AAAA google.com

# Check DNS server configuration
cat /etc/resolv.conf

# Test with specific DNS server
dig @2001:4860:4860::8888 AAAA google.com
```

**Resolution:**

```bash
# Add IPv6 DNS server to resolv.conf
echo "nameserver 2001:4860:4860::8888" | sudo tee -a /etc/resolv.conf

# Or use systemd-resolved
sudo systemd-resolve --set-dns=2001:4860:4860::8888 --interface=eth0
```

### Issue 4: Firewall Blocking ICMPv6

**Symptoms:**
- ping6 times out
- traceroute6 shows asterisks
- Services work but ICMP fails

**Diagnosis:**

```bash
# Check iptables/ip6tables rules
sudo ip6tables -L -n -v

# Look for ICMP rules
sudo ip6tables -L -n -v | grep icmp

# Test with TCP instead of ICMP
traceroute6 -T -p 443 2001:4860:4860::8888
```

**Resolution:**

```bash
# Allow essential ICMPv6 traffic
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-reply -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-solicitation -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement -j ACCEPT
```

### Issue 5: MTU Issues (Packet Too Big)

**Symptoms:**
- Small packets work
- Large transfers fail or stall
- Path MTU discovery failures

**Diagnosis:**

```bash
# Test with different packet sizes
ping6 -c 3 -s 1400 2001:4860:4860::8888
ping6 -c 3 -s 1452 2001:4860:4860::8888
ping6 -c 3 -s 1472 2001:4860:4860::8888

# Test with don't-fragment flag
ping6 -M do -s 1452 2001:4860:4860::8888

# Check interface MTU
ip link show eth0
```

**Resolution:**

```bash
# Reduce interface MTU if needed
sudo ip link set eth0 mtu 1280

# Or configure MSS clamping in firewall
sudo ip6tables -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
```

### Issue 6: Duplicate Address Detection (DAD) Failure

**Symptoms:**
- Address shows as "tentative"
- Cannot use the configured address
- Syslog shows DAD failure messages

**Diagnosis:**

```bash
# Check for tentative addresses
ip -6 addr show tentative

# Check system logs
dmesg | grep -i "duplicate"
journalctl -u systemd-networkd | grep -i DAD
```

**Resolution:**

```bash
# If duplicate exists on network, choose different address
sudo ip -6 addr del 2001:db8::100/64 dev eth0
sudo ip -6 addr add 2001:db8::101/64 dev eth0

# Disable DAD if needed (not recommended)
sudo sysctl -w net.ipv6.conf.eth0.dad_transmits=0
```

---

## Real-World Troubleshooting Scenarios

### Scenario 1: Application Cannot Connect to IPv6-Only Service

A web service reports connection failures to an IPv6-only API endpoint.

**Step 1: Verify DNS resolution**

```bash
# Check what address the application will use
dig AAAA api.example.com

# Confirm the address is correct
;; ANSWER SECTION:
api.example.com.    300    IN    AAAA    2001:db8:api::1
```

**Step 2: Test basic connectivity**

```bash
# Ping the service
ping6 -c 5 2001:db8:api::1

# Expected output
PING 2001:db8:api::1(2001:db8:api::1) 56 data bytes
64 bytes from 2001:db8:api::1: icmp_seq=1 ttl=58 time=15.2 ms
```

**Step 3: Trace the path**

```bash
# Find where packets go
traceroute6 -n 2001:db8:api::1

# Look for packet loss or high latency at specific hops
 1  2001:db8::1  0.5 ms  0.4 ms  0.4 ms
 2  * * *
 3  2001:db8:transit::1  10.2 ms  10.1 ms  10.0 ms
```

**Step 4: Test the actual service port**

```bash
# TCP traceroute to the service port
traceroute6 -T -p 443 2001:db8:api::1

# Or use netcat to test the port
nc -6 -zv 2001:db8:api::1 443
```

**Step 5: Check for firewall issues**

```bash
# Review local firewall rules
sudo ip6tables -L -n -v

# Test from different source
curl -6 -v https://api.example.com/health
```

### Scenario 2: Intermittent IPv6 Connectivity

Users report sporadic failures reaching IPv6 hosts.

**Step 1: Monitor connectivity over time**

```bash
# Continuous ping with timestamps
ping6 -D 2001:4860:4860::8888 | while read line; do echo "$(date): $line"; done

# Output shows when failures occur
Wed Jan 15 10:30:01 UTC 2026: 64 bytes from 2001:4860:4860::8888: icmp_seq=100 ttl=117 time=12.3 ms
Wed Jan 15 10:30:02 UTC 2026: Request timeout for icmp_seq 101
Wed Jan 15 10:30:03 UTC 2026: 64 bytes from 2001:4860:4860::8888: icmp_seq=102 ttl=117 time=12.1 ms
```

**Step 2: Check for route changes**

```bash
# Monitor routing table changes
ip -6 monitor route

# Check BGP or routing daemon logs
journalctl -u bird6
```

**Step 3: Test multiple paths**

```bash
# Trace route multiple times to see path variations
for i in {1..5}; do echo "=== Trace $i ==="; traceroute6 -n -q 1 2001:4860:4860::8888; sleep 10; done
```

**Step 4: Check neighbor discovery**

```bash
# View IPv6 neighbor cache
ip -6 neigh show

# Look for stale or failed entries
ip -6 neigh show | grep -E "(STALE|FAILED|INCOMPLETE)"
```

### Scenario 3: Kubernetes Pod Cannot Reach IPv6 Service

A pod in a dual-stack Kubernetes cluster fails to connect to an IPv6 service.

**Step 1: Verify pod has IPv6 address**

```bash
# Check pod's network configuration
kubectl exec -it mypod -- ip -6 addr show

# Should show global IPv6 address
inet6 2001:db8:k8s::pod1/128 scope global
inet6 fe80::1/64 scope link
```

**Step 2: Test from inside the pod**

```bash
# Enter the pod
kubectl exec -it mypod -- /bin/sh

# Test connectivity to cluster DNS
ping6 -c 3 kube-dns.kube-system.svc.cluster.local

# Test connectivity to the service
ping6 -c 3 myservice.default.svc.cluster.local
```

**Step 3: Check service configuration**

```bash
# Verify service has IPv6 address
kubectl get svc myservice -o yaml | grep -A5 clusterIPs

# Should show IPv6 ClusterIP
clusterIPs:
- 10.96.0.100
- 2001:db8:k8s::svc1
```

**Step 4: Test from node level**

```bash
# Debug from the node
kubectl debug node/worker-1 -it --image=nicolaka/netshoot

# Test IPv6 routing on the node
ip -6 route show
traceroute6 -n 2001:db8:k8s::svc1
```

### Scenario 4: Load Balancer Not Forwarding IPv6 Traffic

An external load balancer accepts IPv6 connections but backend servers don't receive traffic.

**Step 1: Verify load balancer IPv6 address**

```bash
# Check external IPv6 address
dig AAAA lb.example.com

# Test connectivity to load balancer
ping6 -c 5 2001:db8:lb::1
```

**Step 2: Trace path through load balancer**

```bash
# Trace to load balancer
traceroute6 -n 2001:db8:lb::1

# Check if traffic reaches backend subnet
traceroute6 -T -p 80 2001:db8:lb::1
```

**Step 3: Check backend server configuration**

```bash
# On backend server, verify IPv6 is configured
ip -6 addr show

# Check if backend is listening on IPv6
ss -6 -tulpn | grep :80

# Verify the service binds to IPv6
netstat -6 -tulpn | grep nginx
```

**Step 4: Test direct backend connectivity**

```bash
# Bypass load balancer and test backend directly
ping6 -c 3 2001:db8:backend::1
curl -6 http://[2001:db8:backend::1]/health
```

---

## Advanced Debugging Techniques

### Using tcpdump for IPv6 Traffic

Capture IPv6 packets for detailed analysis:

```bash
# Capture all IPv6 traffic
sudo tcpdump -i eth0 ip6

# Capture ICMPv6 only
sudo tcpdump -i eth0 icmp6

# Capture traffic to/from specific host
sudo tcpdump -i eth0 ip6 host 2001:4860:4860::8888

# Save capture to file for Wireshark analysis
sudo tcpdump -i eth0 -w ipv6_debug.pcap ip6

# Filter by IPv6 and specific port
sudo tcpdump -i eth0 ip6 and port 443
```

### Checking IPv6 Statistics

Monitor IPv6 protocol statistics:

```bash
# View IPv6 statistics
cat /proc/net/snmp6

# Or use netstat
netstat -s -6

# Key metrics to watch
grep -E "(Ip6InReceives|Ip6OutRequests|Ip6InNoRoutes|Ip6InDiscards)" /proc/net/snmp6
```

### Testing with curl for IPv6

Force IPv6 for HTTP testing:

```bash
# Force IPv6 connection
curl -6 -v https://ipv6.google.com

# Connect to specific IPv6 address
curl -v "https://[2001:4860:4860::8888]/"

# Show timing information
curl -6 -w "@curl-format.txt" -o /dev/null -s https://ipv6.google.com
```

### Using mtr for Combined ping/traceroute

mtr provides real-time path analysis:

```bash
# Install mtr if needed
sudo apt install mtr-tiny

# Run mtr with IPv6
mtr -6 2001:4860:4860::8888

# Non-interactive report mode
mtr -6 -r -c 100 2001:4860:4860::8888

# Output as JSON for automation
mtr -6 -r -j -c 50 2001:4860:4860::8888
```

### Testing Path MTU Discovery

Verify PMTU discovery is working:

```bash
# Check current PMTU to destination
ip -6 route get 2001:4860:4860::8888

# Output includes pmtu if discovered
2001:4860:4860::8888 via 2001:db8::1 dev eth0 src 2001:db8::100 metric 1024 pmtu 1500

# Clear PMTU cache and retest
sudo ip -6 route flush cache
ping6 -M do -s 1452 -c 5 2001:4860:4860::8888
```

---

## IPv6 Debugging in Different Environments

### Docker Containers

Enable and debug IPv6 in Docker:

```bash
# Check if Docker has IPv6 enabled
docker network inspect bridge | grep EnableIPv6

# Create IPv6-enabled network
docker network create --ipv6 --subnet=2001:db8:docker::/64 mynetwork

# Debug from container
docker run --rm -it --network mynetwork nicolaka/netshoot
ping6 -c 3 2001:4860:4860::8888
```

### Cloud Environments (AWS/GCP/Azure)

Cloud-specific debugging:

```bash
# AWS: Check VPC IPv6 CIDR
aws ec2 describe-vpcs --query 'Vpcs[*].Ipv6CidrBlockAssociationSet'

# GCP: Check subnet IPv6 range
gcloud compute networks subnets describe mysubnet --region=us-central1

# Azure: Check VNet IPv6 configuration
az network vnet show --name myvnet --resource-group mygroup
```

### systemd-networkd Environments

Debug IPv6 with systemd:

```bash
# Check networkd status
networkctl status eth0

# View IPv6-specific configuration
networkctl status eth0 | grep -A10 "IPv6"

# Check resolved DNS
resolvectl status | grep -A5 "DNS Servers"

# Monitor networkd events
journalctl -u systemd-networkd -f
```

---

## Best Practices for IPv6 Debugging

### 1. Always Check Both Stacks

In dual-stack environments, verify both IPv4 and IPv6:

```bash
# Test both protocols
ping -c 3 google.com      # IPv4
ping6 -c 3 ipv6.google.com # IPv6

# Check which protocol applications prefer
curl -v https://google.com 2>&1 | grep "Connected to"
```

### 2. Document Your IPv6 Infrastructure

Maintain records of:

- IPv6 address allocations
- Subnet assignments
- Router configurations
- Firewall rules

### 3. Monitor IPv6 Continuously

Set up monitoring for IPv6-specific metrics:

```bash
# Add IPv6 targets to monitoring
# Example: OneUptime monitor configuration
# Target: https://[2001:db8::1]/health
# Protocol: IPv6
```

### 4. Keep Tools Updated

Ensure debugging tools support IPv6:

```bash
# Check ping6 version
ping6 -V

# Verify traceroute6 is available
which traceroute6

# Install missing tools
sudo apt install iputils-ping traceroute
```

### 5. Test During Maintenance Windows

When making IPv6 changes:

```bash
# Before changes
ping6 -c 10 2001:4860:4860::8888 > before.txt

# After changes
ping6 -c 10 2001:4860:4860::8888 > after.txt

# Compare results
diff before.txt after.txt
```

### 6. Use Automation for Repetitive Tests

Script common debugging tasks:

```bash
#!/bin/bash
# ipv6-health-check.sh
# Quick IPv6 connectivity health check script

TARGETS=(
    "2001:4860:4860::8888"  # Google DNS
    "2606:4700:4700::1111"  # Cloudflare DNS
    "2620:fe::fe"          # Quad9 DNS
)

echo "=== IPv6 Health Check ==="
echo "Date: $(date)"
echo ""

for target in "${TARGETS[@]}"; do
    echo "Testing: $target"
    if ping6 -c 3 -W 2 "$target" > /dev/null 2>&1; then
        echo "  Status: OK"
        latency=$(ping6 -c 1 "$target" 2>/dev/null | grep "time=" | sed 's/.*time=\([0-9.]*\).*/\1/')
        echo "  Latency: ${latency}ms"
    else
        echo "  Status: FAILED"
    fi
    echo ""
done
```

---

## Summary Table: ping6 and traceroute6 Options

### ping6 Command Reference

| Option | Description | Example |
|--------|-------------|---------|
| `-c count` | Send specific number of packets | `ping6 -c 5 ::1` |
| `-i interval` | Set interval between packets | `ping6 -i 0.5 ::1` |
| `-s size` | Set packet size | `ping6 -s 1400 ::1` |
| `-I interface` | Use specific interface | `ping6 -I eth0 fe80::1` |
| `-t ttl` | Set hop limit | `ping6 -t 64 ::1` |
| `-W timeout` | Set response timeout | `ping6 -W 3 ::1` |
| `-M hint` | Path MTU discovery mode | `ping6 -M do ::1` |
| `-n` | Numeric output only | `ping6 -n ::1` |
| `-v` | Verbose output | `ping6 -v ::1` |
| `-f` | Flood ping (requires root) | `sudo ping6 -f ::1` |
| `-S source` | Set source address | `ping6 -S 2001:db8::1 ::1` |

### traceroute6 Command Reference

| Option | Description | Example |
|--------|-------------|---------|
| `-m max_hops` | Set maximum hops | `traceroute6 -m 20 ::1` |
| `-q probes` | Probes per hop | `traceroute6 -q 3 ::1` |
| `-w timeout` | Timeout per probe | `traceroute6 -w 5 ::1` |
| `-n` | Numeric output only | `traceroute6 -n ::1` |
| `-I` | Use ICMP echo | `traceroute6 -I ::1` |
| `-T` | Use TCP SYN | `traceroute6 -T -p 80 ::1` |
| `-U` | Use UDP (default) | `traceroute6 -U ::1` |
| `-p port` | Set destination port | `traceroute6 -p 443 ::1` |
| `-s source` | Set source address | `traceroute6 -s 2001:db8::1 ::1` |
| `-i interface` | Use specific interface | `traceroute6 -i eth0 ::1` |

### Common Issue Quick Reference

| Issue | Diagnostic Command | Typical Cause |
|-------|-------------------|---------------|
| No connectivity | `ip -6 addr show` | IPv6 not configured |
| No route to host | `ip -6 route show` | Missing default route |
| DNS failure | `dig AAAA hostname` | No AAAA record or DNS misconfiguration |
| Timeout | `ip6tables -L -n` | Firewall blocking ICMPv6 |
| Large packet failure | `ping6 -M do -s 1452` | MTU issues |
| Link-local only | `ip -6 addr show scope global` | Router advertisements not received |

---

IPv6 debugging follows the same logical process as IPv4 - verify configuration, test connectivity, trace the path, and isolate the failure point. The tools are slightly different, and the addresses are longer, but the fundamentals remain the same. Master `ping6` and `traceroute6`, and you'll be equipped to diagnose any IPv6 connectivity issue that comes your way.
