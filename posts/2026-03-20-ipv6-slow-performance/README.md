# How to Troubleshoot IPv6 Slow Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Performance, Troubleshooting, MTU, TCP, Network Diagnostics

Description: Diagnose why IPv6 is slower than IPv4 on the same network, including MTU black holes, suboptimal routing paths, TCP congestion window issues, and Happy Eyeballs delays.

## Introduction

IPv6 traffic should perform similarly to IPv4 on a properly configured network. When IPv6 is noticeably slower, common causes include MTU black holes (packets silently dropped), longer routing paths, TCP slow start issues, or PMTUD failures. This guide provides tools to measure and diagnose IPv6 performance problems.

## Step 1: Measure IPv4 vs IPv6 Performance

```bash
# Compare download speed over IPv4 vs IPv6

echo "IPv4 speed:"
time curl -4 -s -o /dev/null 'https://speed.cloudflare.com/__down?bytes=50000000'

echo ""
echo "IPv6 speed:"
time curl -6 -s -o /dev/null 'https://speed.cloudflare.com/__down?bytes=50000000'

# More accurate comparison with iperf3
# Server:
iperf3 -s

# Client - IPv4:
iperf3 -c server.example.com -4 -t 10

# Client - IPv6:
iperf3 -c server.example.com -6 -t 10
```

## Step 2: Measure Latency Difference

```bash
# Compare ping latency
echo "IPv4 latency to Google:"
ping -c 10 8.8.8.8 | tail -3

echo ""
echo "IPv6 latency to Google:"
ping -6 -c 10 2001:4860:4860::8888 | tail -3

# Use mtr for path-level comparison
echo "IPv4 path:"
mtr -n -r -4 8.8.8.8

echo ""
echo "IPv6 path:"
mtr -n -r -6 2001:4860:4860::8888

# Compare hop counts and latency at each hop
```

## Step 3: Test for MTU Issues (Most Common Cause)

```bash
# Test with progressively larger ICMPv6 payloads
echo "Packet size test over IPv6:"
for size in 1000 1232 1400 1452; do
    result=$(ping -6 -M do -c 3 -s "$size" 2001:4860:4860::8888 2>&1)
    if echo "$result" | grep -q "3 received"; then
        echo "  payload $size bytes: OK"
    else
        echo "  payload $size bytes: FAIL/PARTIAL"
    fi
done

# 1232-byte payload ~= 1280-byte IPv6 packet, 1452-byte payload ~= 1500-byte IPv6 packet
# If larger payloads fail or stall: likely PMTUD / MTU black hole
# Fix on the local host firewall: allow ICMPv6 Packet Too Big
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 2 -j ACCEPT
```

## Step 4: Check TCP Performance

```bash
# Check TCP congestion window with ss (run while an IPv6 TCP transfer is active)
ss -tin6 state established | grep cwnd

# View detailed TCP metrics for an IPv6 connection
ss -tin6 state established | head -20

# Key metrics:
# cwnd: congestion window (larger = better throughput)
# rtt: round-trip time
# retrans: retransmissions (if high, indicates packet loss)
# rcvbuf/sndbuf: socket buffers

# Check TCP buffer sizes
sysctl net.core.rmem_max net.core.wmem_max
sysctl net.ipv4.tcp_rmem net.ipv4.tcp_wmem  # Applies to IPv6 too
```

## Step 5: Analyze Routing Path

```bash
# Is IPv6 taking a longer path than IPv4?
echo "IPv4 path to Google:"
traceroute -n 8.8.8.8 | tail -n +2 | wc -l

echo "IPv6 path to Google:"
traceroute -n -6 2001:4860:4860::8888 | tail -n +2 | wc -l

# Compare paths in detail
traceroute -n 8.8.8.8
traceroute -n -6 2001:4860:4860::8888

# IPv6 traffic may take a less direct path than IPv4, adding latency
# Compare per-hop latency and look for an unexpectedly longer IPv6 path
```

## Step 6: Check TCP Segmentation Offload

```bash
# On some systems, NIC offload features can interact badly with certain drivers or paths
ethtool -k eth0 | grep "tcp-segmentation-offload\|generic-segmentation\|large-receive"

# Try disabling TSO/GSO temporarily to test if it improves IPv6 performance
# (only for testing - measure before and after)
sudo ethtool -K eth0 tso off
sudo ethtool -K eth0 gso off
iperf3 -c server.example.com -6 -t 10
sudo ethtool -K eth0 tso on
sudo ethtool -K eth0 gso on
```

## Step 7: Happy Eyeballs Delay Impact

```bash
# If applications are slow to start over IPv6:
# Check if Happy Eyeballs fallback delay is too long
# RFC 8305 recommends a 250ms connection-attempt delay, but application defaults vary

# Test dual-stack behavior with curl and measure connection time
curl -w "Remote IP: %{remote_ip}\nConnect: %{time_connect}s\nTTFB: %{time_starttransfer}s\n" \
    -s -o /dev/null https://example.com

# Compare forced IPv6 and IPv4 timings separately
curl -6 -w "IPv6 Connect: %{time_connect}s\nIPv6 TTFB: %{time_starttransfer}s\n" \
    -s -o /dev/null https://example.com

curl -4 -w "IPv4 Connect: %{time_connect}s\nIPv4 TTFB: %{time_starttransfer}s\n" \
    -s -o /dev/null https://example.com

# If IPv6 connect time is much higher, check:
# 1. DNS response time for AAAA vs A
# 2. SYN timeout before fallback to IPv4
```

## Conclusion

IPv6 slow performance is most commonly caused by MTU black holes (test with large ICMPv6 payloads), longer routing paths (compare traceroute hop counts), or TCP retransmissions. Check with `iperf3` to measure raw throughput, `mtr` to compare paths, and larger `ping -6` payload tests such as `-s 1232` and `-s 1452` to identify MTU issues. Allow ICMPv6 type 2 (Packet Too Big) through all firewalls to enable proper PMTUD. In cloud environments, IPv6 traffic may traverse additional encapsulation layers that don't affect IPv4, adding latency.
