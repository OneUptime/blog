# How to Debug IPv6 Path MTU Discovery Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, MTU, Networking, Troubleshooting, Linux, DevOps

Description: A comprehensive guide to diagnosing and resolving IPv6 Path MTU Discovery (PMTUD) issues that cause connectivity problems, packet loss, and application timeouts in modern network environments.

---

## Introduction

Path MTU Discovery (PMTUD) is a critical networking mechanism that determines the maximum transmission unit (MTU) size along a network path. While this process works seamlessly in most cases, IPv6 PMTUD issues can cause frustrating connectivity problems that are often difficult to diagnose. Unlike IPv4, IPv6 does not allow routers to fragment packets, making PMTUD essential for proper IPv6 operation.

In this comprehensive guide, we will explore how to identify, diagnose, and resolve IPv6 PMTUD issues using various tools and techniques. Whether you are a network administrator, DevOps engineer, or site reliability engineer, understanding these concepts will help you maintain reliable IPv6 connectivity.

## Understanding IPv6 Path MTU Discovery

### How PMTUD Works

Path MTU Discovery in IPv6 works through the following process:

1. A source host sends packets with the "Don't Fragment" flag implicitly set (all IPv6 packets)
2. If a packet is too large for a link along the path, the router drops it
3. The router sends back an ICMPv6 "Packet Too Big" message containing the MTU of the limiting link
4. The source host reduces its packet size and retransmits

### Key Differences from IPv4

IPv6 PMTUD differs from IPv4 in several important ways:

- **No fragmentation by routers**: IPv6 routers never fragment packets; only the source host can
- **Minimum MTU**: IPv6 requires a minimum MTU of 1280 bytes (vs 576 for IPv4)
- **ICMPv6 dependency**: PMTUD relies entirely on ICMPv6 Packet Too Big messages
- **Extension headers**: IPv6 extension headers can add complexity to MTU calculations

## Prerequisites

Before diving into debugging, ensure you have the following tools available:

```bash
# Check if required tools are installed
which ping6 traceroute6 tcpdump ip ss ndisc6

# Install missing tools on Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y iputils-ping traceroute tcpdump iproute2 ndisc6

# Install missing tools on RHEL/CentOS/Fedora
sudo dnf install -y iputils traceroute tcpdump iproute ndisc6

# Install missing tools on macOS
brew install nmap mtr
```

## Diagnostic Commands and Techniques

### 1. Checking Current MTU Settings

The first step in debugging PMTUD issues is to understand your current MTU configuration.

#### View Interface MTU

```bash
# Linux: View MTU for all interfaces
ip link show

# Linux: View MTU for a specific interface
ip link show eth0

# Alternative using ifconfig (deprecated but still available)
ifconfig eth0

# macOS: View MTU settings
networksetup -getMTU en0
ifconfig en0
```

Example output:

```
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP mode DEFAULT group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff
```

#### View IPv6 PMTU Cache

```bash
# Linux: View the IPv6 route cache including PMTU values
ip -6 route show cache

# View PMTU for a specific destination
ip -6 route get 2001:db8::1

# Show all cached routes with MTU information
ip -6 route show cache | grep -i mtu
```

Example output:

```
2001:db8::1 via fe80::1 dev eth0 src 2001:db8::2 metric 1024
    cache mtu 1400
```

### 2. Testing PMTUD with Ping

The `ping6` command is invaluable for testing PMTUD behavior.

#### Basic PMTUD Test

```bash
# Linux: Send large packets with Don't Fragment flag
ping6 -M do -s 1452 -c 5 2001:db8::1

# Explanation of flags:
# -M do    : Set DF flag (prohibit fragmentation)
# -s 1452  : Packet size (1452 + 48 bytes header = 1500 total)
# -c 5     : Send 5 packets

# macOS: Similar test
ping6 -D -s 1452 -c 5 2001:db8::1
```

#### Finding the Path MTU

Use a binary search approach to find the exact path MTU:

```bash
#!/bin/bash
# Script to find path MTU to a destination

DESTINATION="$1"
MIN_MTU=1280
MAX_MTU=1500
HEADER_SIZE=48  # IPv6 header (40) + ICMPv6 header (8)

if [ -z "$DESTINATION" ]; then
    echo "Usage: $0 <ipv6-destination>"
    exit 1
fi

echo "Finding path MTU to $DESTINATION..."

while [ $MIN_MTU -lt $MAX_MTU ]; do
    MID=$(( (MIN_MTU + MAX_MTU + 1) / 2 ))
    PAYLOAD=$(( MID - HEADER_SIZE ))

    if ping6 -M do -s $PAYLOAD -c 1 -W 2 "$DESTINATION" > /dev/null 2>&1; then
        MIN_MTU=$MID
        echo "MTU $MID: OK"
    else
        MAX_MTU=$(( MID - 1 ))
        echo "MTU $MID: Too large"
    fi
done

echo "Path MTU to $DESTINATION is $MIN_MTU bytes"
```

### 3. Tracing the Path

#### Using traceroute6

```bash
# Basic IPv6 traceroute
traceroute6 2001:db8::1

# Traceroute with specific packet size
traceroute6 -M 1400 2001:db8::1

# Traceroute using UDP
traceroute6 -U 2001:db8::1

# Traceroute using TCP (useful when ICMP is blocked)
sudo traceroute6 -T -p 443 2001:db8::1
```

#### Using mtr for Continuous Monitoring

```bash
# Interactive MTR
mtr -6 2001:db8::1

# Report mode with specific packet size
mtr -6 --report --report-cycles 10 -s 1400 2001:db8::1

# MTR with TCP probes
sudo mtr -6 --tcp --port 443 2001:db8::1
```

### 4. Packet Capture Analysis

#### Capturing ICMPv6 Packet Too Big Messages

```bash
# Capture all ICMPv6 traffic
sudo tcpdump -i eth0 -nn icmp6

# Capture only Packet Too Big messages (type 2)
sudo tcpdump -i eth0 -nn 'icmp6 and ip6[40] == 2'

# Save capture to file for analysis
sudo tcpdump -i eth0 -nn -w pmtud_debug.pcap 'icmp6'

# Capture with verbose output
sudo tcpdump -i eth0 -nn -v 'icmp6 and ip6[40] == 2'
```

Example output of a Packet Too Big message:

```
12:34:56.789012 IP6 2001:db8:1::1 > 2001:db8:2::1: ICMP6, packet too big, mtu 1400, length 1240
```

#### Using Wireshark Filters

If you have captured packets to a file, use these Wireshark display filters:

```
# All ICMPv6 Packet Too Big messages
icmpv6.type == 2

# PMTUD-related traffic to/from specific host
(ipv6.src == 2001:db8::1 or ipv6.dst == 2001:db8::1) and icmpv6.type == 2

# Large packets that might trigger PMTUD
ipv6.plen > 1400
```

### 5. Checking Socket-Level PMTU

#### Using ss to View Socket Information

```bash
# View TCP sockets with detailed information
ss -6 -t -i

# Filter for established connections
ss -6 -t -i state established

# View socket memory and queue information
ss -6 -t -m
```

Example output:

```
State    Recv-Q Send-Q Local Address:Port    Peer Address:Port
ESTAB    0      0      [2001:db8::1]:22      [2001:db8::2]:54321
         cubic wscale:7,7 rto:204 rtt:3.5/1.5 ato:40 mss:1380 pmtu:1400
         rcvmss:1380 advmss:1428 cwnd:10 bytes_sent:1234 bytes_acked:1234
```

#### Checking PMTU via procfs

```bash
# View IPv6 route cache
cat /proc/net/ipv6_route

# View network statistics
cat /proc/net/snmp6 | grep -i icmp

# Check for PMTUD-related counters
cat /proc/net/snmp6 | grep -E "Icmp6(InPkt|OutPkt)TooBig"
```

### 6. Kernel and System Configuration

#### Viewing Current Settings

```bash
# Check if PMTUD is enabled
sysctl net.ipv6.conf.all.mtu

# View all IPv6-related sysctl settings
sysctl -a | grep ipv6

# Check specific interface settings
sysctl net.ipv6.conf.eth0.mtu

# View TCP MTU probing settings
sysctl net.ipv4.tcp_mtu_probing
```

#### Enabling TCP MTU Probing

TCP MTU probing can help work around PMTUD black holes:

```bash
# Enable TCP MTU probing (helps with PMTUD black holes)
# 0 = disabled, 1 = enabled when black hole detected, 2 = always enabled
sudo sysctl -w net.ipv4.tcp_mtu_probing=1

# Set the base MSS for probing
sudo sysctl -w net.ipv4.tcp_base_mss=1024

# Make changes permanent
echo "net.ipv4.tcp_mtu_probing = 1" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_base_mss = 1024" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Common PMTUD Issues and Solutions

### Issue 1: ICMPv6 Blocked by Firewall

**Symptoms:**
- Large packets fail silently
- Small pings work, large pings timeout
- TCP connections hang during data transfer
- Application timeouts after initial connection

**Diagnosis:**

```bash
# Test if ICMPv6 is being blocked
ping6 -M do -s 1452 -c 5 destination

# Check if Packet Too Big messages are received
sudo tcpdump -i eth0 -nn 'icmp6 and ip6[40] == 2' &
ping6 -M do -s 1452 -c 5 destination

# Check firewall rules
sudo ip6tables -L -n -v | grep -i icmp
sudo nft list ruleset | grep -i icmpv6
```

**Solution:**

```bash
# Allow ICMPv6 Packet Too Big messages (iptables)
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT

# Allow ICMPv6 Packet Too Big messages (nftables)
sudo nft add rule inet filter input icmpv6 type packet-too-big accept
sudo nft add rule inet filter output icmpv6 type packet-too-big accept

# Allow all essential ICMPv6 (recommended)
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
```

### Issue 2: Tunnel MTU Overhead

**Symptoms:**
- PMTUD works on direct links but fails over tunnels
- VPN or tunnel connections have packet loss
- Specific packet sizes cause failures

**Diagnosis:**

```bash
# Check tunnel interface MTU
ip -6 link show | grep -A1 'tun\|tap\|gre\|sit\|vti'

# Calculate expected MTU based on tunnel type
# GRE over IPv6: Original MTU - 44 bytes
# 6in4 tunnel: Original MTU - 20 bytes
# IPsec: Original MTU - 50-70 bytes (varies by cipher)

# Test with reduced MTU
ping6 -M do -s 1400 -c 5 destination
```

**Solution:**

```bash
# Set appropriate MTU for tunnel interface
sudo ip link set dev tun0 mtu 1400

# For WireGuard tunnels
sudo ip link set dev wg0 mtu 1420

# For OpenVPN tunnels (in config file)
# Add: tun-mtu 1400

# For IPsec tunnels (strongSwan)
# Set in ipsec.conf:
# conn mytunnel
#     mtu = 1400

# Make permanent (add to interface config)
# /etc/network/interfaces.d/tun0
# post-up ip link set dev tun0 mtu 1400
```

### Issue 3: PMTU Black Holes

**Symptoms:**
- TCP connections stall after initial handshake
- HTTP GET works but POST with large body fails
- SSH connections hang when transferring files
- Works with smaller packet sizes

**Diagnosis:**

```bash
# Check if PMTU is being cached correctly
ip -6 route show cache

# Test with progressively smaller packet sizes
for size in 1500 1400 1300 1280; do
    echo "Testing MTU $size..."
    ping6 -M do -s $((size - 48)) -c 2 destination
done

# Monitor for Packet Too Big messages while testing
sudo tcpdump -i any -nn 'icmp6 and ip6[40] == 2' &
```

**Solution:**

```bash
# Enable TCP MTU probing
sudo sysctl -w net.ipv4.tcp_mtu_probing=1

# Clamp MSS at firewall (workaround)
sudo ip6tables -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu

# Or set a specific MSS value
sudo ip6tables -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1220

# For nftables
sudo nft add rule inet filter forward tcp flags syn / syn,rst \
    counter tcp option maxseg size set 1220
```

### Issue 4: Asymmetric Routing

**Symptoms:**
- PMTUD works intermittently
- Path MTU differs based on direction
- ICMPv6 responses arrive on wrong interface

**Diagnosis:**

```bash
# Check routing tables
ip -6 route show

# Trace path in both directions (from both ends)
traceroute6 remote_destination
# (run from remote): traceroute6 your_address

# Check for multiple default routes
ip -6 route show default

# Monitor ICMP on all interfaces
sudo tcpdump -i any -nn icmp6
```

**Solution:**

```bash
# Ensure symmetric routing or accept ICMP on all interfaces
sudo sysctl -w net.ipv6.conf.all.accept_source_route=0

# Configure policy routing if needed
ip -6 rule add from 2001:db8::1/128 table 100
ip -6 route add default via fe80::gateway dev eth0 table 100

# Verify ICMP is accepted on all interfaces
for iface in $(ip -6 link show | grep -oP '^\d+: \K[^:@]+'); do
    sudo ip6tables -A INPUT -i $iface -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
done
```

### Issue 5: Incorrect MTU on Intermediate Devices

**Symptoms:**
- PMTUD failures only to certain destinations
- Works through some paths but not others
- Specific hop causes packet loss

**Diagnosis:**

```bash
# Identify the problematic hop
mtr -6 --report -s 1500 destination

# Test MTU at each hop
for hop in $(traceroute6 -n destination | awk 'NR>1 {print $2}' | grep -v '\*'); do
    echo "Testing $hop..."
    ping6 -M do -s 1452 -c 2 $hop 2>&1
done

# Check if specific hop drops large packets
traceroute6 -M 1500 destination
traceroute6 -M 1400 destination
```

**Solution:**

If the problematic device is under your control:

```bash
# Increase MTU on the device (if possible)
sudo ip link set dev eth0 mtu 1500

# Or reduce MTU on your end to match
sudo ip link set dev eth0 mtu 1400

# Configure MSS clamping as workaround
sudo ip6tables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1340
```

### Issue 6: Jumbo Frame Misconfiguration

**Symptoms:**
- Network works within datacenter but fails externally
- Large MTU configured but external connections fail
- PMTUD not properly reducing packet size

**Diagnosis:**

```bash
# Check if jumbo frames are configured
ip link show | grep mtu

# Test standard MTU connectivity
ping6 -M do -s 1452 -c 5 external_destination

# Test jumbo frame connectivity (internal)
ping6 -M do -s 8952 -c 5 internal_destination
```

**Solution:**

```bash
# Ensure edge devices have standard MTU
sudo ip link set dev wan0 mtu 1500

# Keep jumbo frames only on internal interfaces
sudo ip link set dev lan0 mtu 9000

# Configure MTU per-route if needed
ip -6 route add 2001:db8:external::/48 via fe80::gw dev wan0 mtu 1500
ip -6 route add 2001:db8:internal::/48 via fe80::gw dev lan0 mtu 9000
```

### Issue 7: Container and Kubernetes PMTUD Issues

**Symptoms:**
- PMTUD fails inside containers
- Pod-to-pod communication works but external fails
- CNI plugin MTU misconfiguration

**Diagnosis:**

```bash
# Check container network MTU
docker network inspect bridge | grep -i mtu

# Kubernetes: Check CNI configuration
kubectl get cm -n kube-system kube-proxy -o yaml | grep -i mtu
cat /etc/cni/net.d/*.conf | grep -i mtu

# Check pod interface MTU
kubectl exec -it pod-name -- ip link show

# Test from inside container
kubectl exec -it pod-name -- ping6 -M do -s 1452 -c 5 external_destination
```

**Solution:**

```bash
# Docker: Set MTU when creating network
docker network create --opt com.docker.network.driver.mtu=1400 mynetwork

# Docker daemon configuration (/etc/docker/daemon.json)
# {
#   "mtu": 1400
# }

# Kubernetes Calico CNI (/etc/cni/net.d/calico.conf)
# Set "mtu": 1400 in the configuration

# Kubernetes Flannel
kubectl edit cm -n kube-system kube-flannel-cfg
# Set "mtu": 1400

# Restart affected pods after MTU changes
kubectl rollout restart deployment my-deployment
```

## Advanced Debugging Techniques

### Using eBPF for Deep Packet Inspection

```bash
# Install bpftrace
sudo apt-get install bpftrace

# Trace ICMPv6 Packet Too Big messages
sudo bpftrace -e 'tracepoint:icmp:icmp_receive {
    if (args->type == 2) {
        printf("Packet Too Big from %s, MTU: %d\n",
               ntop(args->saddr), args->mtu);
    }
}'

# Trace TCP MSS values
sudo bpftrace -e 'tracepoint:tcp:tcp_rcv_space_adjust {
    printf("Socket %p: MSS=%d PMTU=%d\n",
           args->sk, args->mss, args->pmtu);
}'
```

### Creating a PMTUD Test Script

```bash
#!/bin/bash
# Comprehensive PMTUD diagnostic script

DEST="$1"
LOGFILE="/tmp/pmtud_diagnostic_$(date +%Y%m%d_%H%M%S).log"

if [ -z "$DEST" ]; then
    echo "Usage: $0 <ipv6-destination>"
    exit 1
fi

echo "PMTUD Diagnostic Report for $DEST" | tee $LOGFILE
echo "=================================" | tee -a $LOGFILE
echo "Date: $(date)" | tee -a $LOGFILE
echo "" | tee -a $LOGFILE

# 1. Local Interface Information
echo "## Local Interface Configuration" | tee -a $LOGFILE
ip -6 addr show | tee -a $LOGFILE
echo "" | tee -a $LOGFILE

# 2. Current MTU Settings
echo "## Interface MTU Settings" | tee -a $LOGFILE
ip link show | grep mtu | tee -a $LOGFILE
echo "" | tee -a $LOGFILE

# 3. Route to Destination
echo "## Route to Destination" | tee -a $LOGFILE
ip -6 route get $DEST | tee -a $LOGFILE
echo "" | tee -a $LOGFILE

# 4. PMTU Cache
echo "## PMTU Cache Entries" | tee -a $LOGFILE
ip -6 route show cache | tee -a $LOGFILE
echo "" | tee -a $LOGFILE

# 5. Ping Tests
echo "## Ping Tests (Various Sizes)" | tee -a $LOGFILE
for size in 1500 1400 1300 1280; do
    payload=$((size - 48))
    echo "Testing packet size $size (payload $payload)..." | tee -a $LOGFILE
    ping6 -M do -s $payload -c 3 -W 2 $DEST 2>&1 | tee -a $LOGFILE
    echo "" | tee -a $LOGFILE
done

# 6. Traceroute
echo "## Traceroute" | tee -a $LOGFILE
traceroute6 -n $DEST 2>&1 | tee -a $LOGFILE
echo "" | tee -a $LOGFILE

# 7. Kernel Settings
echo "## Relevant Kernel Settings" | tee -a $LOGFILE
sysctl net.ipv4.tcp_mtu_probing | tee -a $LOGFILE
sysctl net.ipv4.tcp_base_mss | tee -a $LOGFILE
echo "" | tee -a $LOGFILE

# 8. Firewall Rules (ICMPv6)
echo "## ICMPv6 Firewall Rules" | tee -a $LOGFILE
sudo ip6tables -L -n -v 2>/dev/null | grep -i icmp | tee -a $LOGFILE
echo "" | tee -a $LOGFILE

# 9. ICMP Statistics
echo "## ICMPv6 Statistics" | tee -a $LOGFILE
cat /proc/net/snmp6 | grep -i icmp | tee -a $LOGFILE
echo "" | tee -a $LOGFILE

echo "Diagnostic report saved to: $LOGFILE"
```

### Continuous PMTUD Monitoring

```bash
#!/bin/bash
# Monitor PMTUD health continuously

DEST="$1"
INTERVAL="${2:-60}"
LOGFILE="/var/log/pmtud_monitor.log"

while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Test current path MTU
    result=$(ping6 -M do -s 1452 -c 1 -W 5 $DEST 2>&1)

    if echo "$result" | grep -q "1 received"; then
        echo "$timestamp - OK: Path MTU >= 1500" >> $LOGFILE
    else
        # Find actual MTU
        for mtu in 1400 1300 1280; do
            payload=$((mtu - 48))
            if ping6 -M do -s $payload -c 1 -W 2 $DEST >/dev/null 2>&1; then
                echo "$timestamp - DEGRADED: Path MTU = $mtu" >> $LOGFILE
                break
            fi
        done
    fi

    sleep $INTERVAL
done
```

## OneUptime Integration for PMTUD Monitoring

OneUptime can help you monitor PMTUD health across your infrastructure. Here are some approaches:

### Custom Monitor Configuration

```yaml
# Example OneUptime monitor configuration for PMTUD
monitors:
  - name: "IPv6 PMTUD Health Check"
    type: "custom"
    interval: "5m"
    script: |
      #!/bin/bash
      DEST="2001:db8::1"
      if ping6 -M do -s 1452 -c 3 -W 5 $DEST >/dev/null 2>&1; then
        echo "OK"
        exit 0
      else
        echo "PMTUD failure detected"
        exit 1
      fi

  - name: "ICMPv6 Packet Too Big Monitor"
    type: "custom"
    interval: "1m"
    script: |
      #!/bin/bash
      count=$(grep "Icmp6InPktTooBigs" /proc/net/snmp6 | awk '{print $2}')
      echo "packet_too_big_count=$count"
```

### Alert Configuration

Set up alerts for PMTUD issues:

```yaml
alerts:
  - name: "PMTUD Failure Alert"
    condition: "monitor.status == 'down'"
    channels:
      - slack
      - pagerduty
    message: |
      IPv6 PMTUD failure detected!

      Affected destination: {{ monitor.destination }}
      Current path MTU: {{ monitor.detected_mtu }}
      Expected MTU: 1500

      Troubleshooting steps:
      1. Check ICMPv6 firewall rules
      2. Verify intermediate device MTU settings
      3. Review tunnel configurations
```

## Summary Table: Quick Reference

| Issue | Symptoms | Diagnosis Command | Solution |
|-------|----------|-------------------|----------|
| ICMPv6 Blocked | Large packets timeout | `sudo tcpdump -i eth0 icmp6` | Allow ICMPv6 type 2 in firewall |
| Tunnel MTU | VPN packet loss | `ip link show \| grep tun` | Reduce tunnel MTU by overhead |
| PMTU Black Hole | TCP stalls after handshake | `ip -6 route show cache` | Enable tcp_mtu_probing=1 |
| Asymmetric Routing | Intermittent failures | `traceroute6` from both ends | Configure symmetric routes |
| Wrong Intermediate MTU | Hop-specific failures | `mtr -6 --report destination` | MSS clamping or fix device |
| Jumbo Frame Issues | Internal OK, external fails | `ping6 -M do -s 1452 dest` | Standard MTU on edge devices |
| Container MTU | Pod external connectivity | `kubectl exec -- ip link` | Configure CNI MTU settings |

## Troubleshooting Checklist

Use this checklist when debugging IPv6 PMTUD issues:

- [ ] Verify local interface MTU settings (`ip link show`)
- [ ] Check PMTU cache for destination (`ip -6 route show cache`)
- [ ] Test with various packet sizes (`ping6 -M do -s SIZE dest`)
- [ ] Capture ICMPv6 traffic (`tcpdump -i eth0 icmp6`)
- [ ] Review firewall rules for ICMPv6 (`ip6tables -L -n -v`)
- [ ] Check for tunnels and their MTU overhead
- [ ] Verify intermediate device MTU settings
- [ ] Test TCP MSS negotiation (`ss -6 -t -i`)
- [ ] Enable TCP MTU probing if needed
- [ ] Configure MSS clamping as last resort
- [ ] Monitor with OneUptime for ongoing visibility

## Conclusion

IPv6 Path MTU Discovery issues can be challenging to diagnose, but with the right tools and systematic approach, you can identify and resolve most problems. The key points to remember are:

1. **ICMPv6 is essential**: Never block ICMPv6 Packet Too Big messages
2. **Tunnels add overhead**: Always account for encapsulation when setting MTU
3. **TCP MTU probing helps**: Enable it as a safety net for black holes
4. **Monitor continuously**: Use OneUptime or similar tools to catch issues early
5. **Document your findings**: Keep records of known path MTUs in your environment

By following the diagnostic procedures and solutions outlined in this guide, you will be well-equipped to handle IPv6 PMTUD issues and maintain reliable connectivity across your network infrastructure.

## Additional Resources

- RFC 8201: Path MTU Discovery for IP version 6
- RFC 4443: ICMPv6 (Internet Control Message Protocol for IPv6)
- Linux Kernel Networking Documentation
- OneUptime Documentation for Custom Monitors

---

Have questions about IPv6 networking or OneUptime monitoring? Join our community or reach out to our support team for assistance.
