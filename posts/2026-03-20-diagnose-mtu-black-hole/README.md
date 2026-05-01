# How to Diagnose MTU Black Hole Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, Black Hole, PMTUD, Networking, Linux, Troubleshooting

Description: Diagnose and fix MTU black hole issues where TCP connections establish but data transfer hangs because ICMP Fragmentation Needed messages are blocked.

## Introduction

An MTU black hole exists when a router on the path discards oversized packets with DF bit set and the needed ICMP Fragmentation Needed message never reaches the sender. The sender never learns the correct MTU and continues sending oversized packets - all of which are silently dropped. The result is a TCP connection that completes the handshake (small packets work), but data transfer hangs (large packets are silently dropped).

## Classic Black Hole Symptoms

```bash
Symptoms of an MTU black hole:
  - SSH connects and shell prompt appears, but commands with large output hang
  - HTTP connects and sends request, but response body never arrives
  - SCP/rsync starts but stalls at 0 bytes transferred
  - Small HTTP HEAD requests work; GET requests for large files hang
  - ping succeeds (small packets); wget/curl hangs (large packets)
  - Works when copying small files; large file transfers hang or timeout
```

## Diagnose the Black Hole

```bash
# Step 1: Confirm connection works (small packets):

ping -c 3 10.20.0.5      # Small ICMP - should succeed
curl -I http://10.20.0.5  # HTTP HEAD - small response

# Step 2: Test large packet delivery:
ping -M do -s 1472 -c 3 10.20.0.5   # Large + DF bit
# If times out (no response, no error message): possible black hole / filtered ICMP
# If error "Frag needed" or "message too long": NOT a black hole (ICMP is working)

# Step 3: Compare different payload sizes:
ping -M do -s 1472 -c 1 10.20.0.5 && echo "1500 MTU works"
ping -M do -s 1400 -c 1 10.20.0.5 && echo "1428 MTU works"
ping -M do -s 1200 -c 1 10.20.0.5 && echo "1228 MTU works"
ping -M do -s 576  -c 1 10.20.0.5 && echo "604 MTU works"
# Find the threshold where packets start failing
```

## Locate the Black Hole

```bash
# Use tracepath to find where path MTU changes:
tracepath -n 10.20.0.5
# Shows the discovered path MTU and prints "pmtu N" when it changes

# Optional: if traceroute is installed, use MTU discovery mode:
traceroute --mtu -n 10.20.0.5
# Prints F=NUM when a smaller MTU is discovered on the path
```

## Confirm ICMP is Blocked

```bash
# Start capture on your interface:
tcpdump -i eth0 -n 'icmp' &

# Send oversized packet to destination:
ping -M do -s 1472 -c 3 10.20.0.5   # Or use the largest size that fails in Step 3

# Check capture output:
# If NO ICMP type 3 code 4 arrives: ICMP is being dropped somewhere
# If ICMP type 3 code 4 arrives: PMTUD is working, different issue

# Also check if ICMP is arriving on different interface:
tcpdump -i any -n 'icmp[0] = 3 and icmp[1] = 4'
```

## Fix Options

```bash
# Option 1: Allow ICMP Fragmentation Needed through firewall
# (Fix the root cause)
iptables -I INPUT  -p icmp --icmp-type fragmentation-needed -j ACCEPT
iptables -I OUTPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT
iptables -I FORWARD -p icmp --icmp-type fragmentation-needed -j ACCEPT

# Option 2: TCP MSS clamping (works even with ICMP blocked)
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

iptables -t mangle -A OUTPUT -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Option 3: Reduce interface MTU (if you control the bottleneck)
# Find the actual path MTU first with tracepath
ACTUAL_MTU=$(tracepath -n 10.20.0.5 | grep pmtu | tail -1 | grep -oP 'pmtu \K[0-9]+')
ip link set eth0 mtu $ACTUAL_MTU

# Option 4: Configure application to use small packets
# For IPv4 TCP applications: set socket's IP_MTU_DISCOVER to IP_PMTUDISC_DONT
# Allows kernel to fragment (less efficient but works)
```

## Test Fix is Working

```bash
# After applying fix:

# Test large packet delivery:
ping -M do -s 1472 -c 3 10.20.0.5
# OR:
ping -M do -s 1400 -c 3 10.20.0.5

# Test TCP large data:
wget -O /dev/null http://10.20.0.5/largefile
# Should complete without hanging

# Monitor for no more black hole drops:
tcpdump -i eth0 -n 'tcp and host 10.20.0.5' | \
  awk '/length [0-9]+/{if($NF > 1000) print "Large packet:", $0}'
# Large packets should now appear and get responses
```

## Conclusion

MTU black holes are diagnosed by finding the size threshold below which packets succeed, and confirming ICMP Fragmentation Needed messages are not arriving. The fix is either allowing ICMP type 3 code 4 through firewalls (ideal), or applying TCP MSS clamping to prevent oversized segments from being sent in the first place. MSS clamping is the more practical fix when you don't control all firewalls on the path. Always test with SSH, SCP, or large HTTP downloads after applying the fix to confirm large data flows work.
