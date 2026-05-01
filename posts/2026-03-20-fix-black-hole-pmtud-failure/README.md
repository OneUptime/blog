# How to Fix Black Hole Router Issues Caused by PMTUD Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, Black Hole, PMTUD, TCP, iptables, Linux, Networking, Troubleshooting

Description: Fix TCP connections that stall due to black hole routers blocking ICMP Fragmentation Needed messages, using MSS clamping, ICMP policy fixes, and path MTU override techniques.

## Introduction

Path MTU Discovery (PMTUD) depends on ICMP Type 3 Code 4 "Fragmentation Needed" messages being delivered back to the TCP sender. When a firewall blocks these messages, the sender never learns the smaller MTU and continues sending oversized packets that are silently dropped - creating a "black hole." The connection appears to work (handshake uses small packets) but data transfer stalls. Fixing this requires either unblocking ICMP or using MSS clamping as a bypass.

## Identify PMTUD Failure

```bash
# Symptom: large data transfers stall but small exchanges work

# Test: HTTP HEAD works but GET of large file hangs

# Step 1: Check if large ping reaches destination
ping -M do -s 1472 -c 3 10.20.0.5
# Timeout with no response = black hole candidate

# Step 2: Check if ICMP Fragmentation Needed is blocked
tcpdump -i eth0 -n 'icmp[0] = 3 and icmp[1] = 4' &
ping -M do -s 1472 -c 3 10.20.0.5
# If tcpdump shows NO ICMP type 3/4: the ICMP isn't reaching this host
# If tcpdump shows ICMP type 3/4: PMTUD is working and the path is signaling a lower MTU

# Step 3: Confirm TCP stall pattern
timeout 15 curl -v http://10.20.0.5/large-file -o /dev/null
# Watch: TCP connect and HTTP headers arrive, then the body transfer stalls

# Step 4: Inspect the advertised TCP MSS on a fresh connection
tcpdump -i eth0 -n -c 1 'tcp[tcpflags] & tcp-syn != 0 and host 10.20.0.5' -v 2>&1 | grep mss &
curl --interface eth0 -v http://10.20.0.5/large-file -o /dev/null
```

## Fix 1: Allow ICMP Fragmentation Needed (Preferred)

```bash
# This fixes the root cause: allow ICMP type 3 code 4 through firewalls

# On Linux iptables firewall:
iptables -I INPUT  -p icmp --icmp-type fragmentation-needed -j ACCEPT
iptables -I OUTPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT
iptables -I FORWARD -p icmp --icmp-type fragmentation-needed -j ACCEPT

# Persist the rules using your distro's firewall tooling.
# Example on Debian/Ubuntu with iptables-persistent:
iptables-save > /etc/iptables/rules.v4

# Verify rule is in place:
iptables -L -n | grep -A 2 "icmp"

# On cloud security groups (AWS):
# Inbound rule: Allow ICMP type 3 code 4 from 0.0.0.0/0
# Also make sure network ACLs are not denying the same ICMP message.
# aws ec2 authorize-security-group-ingress \
#   --group-id sg-xxxx \
#   --ip-permissions 'IpProtocol=icmp,FromPort=3,ToPort=4,IpRanges=[{CidrIp=0.0.0.0/0}]'

# Test: ICMP should now arrive when large packet hits smaller MTU:
tcpdump -i eth0 -n 'icmp[0] = 3 and icmp[1] = 4'
ping -M do -s 1472 -c 3 10.20.0.5
```

## Fix 2: TCP MSS Clamping (Works Without ICMP)

```bash
# MSS clamping rewrites TCP SYN MSS to prevent oversized segments
# Works even if ICMP is blocked - prevents the problem before it starts

# On the router/gateway between networks:
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# If you know the exact path MTU (e.g., 1400):
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1360  # 1400 - 20 byte IPv4 header - 20 byte TCP header

# If the Linux host itself also originates TCP connections:
iptables -t mangle -A OUTPUT -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Verify:
iptables -t mangle -L -v -n | grep TCPMSS

# Test: TCP connections should now complete large transfers
curl http://10.20.0.5/large-file -o /dev/null --progress-bar
```

## Fix 3: Override PMTUD on Sockets

```bash
# Disable PMTUD entirely for specific connections:
# This allows fragmentation instead of blocking

# System-wide (not recommended for production):
sysctl -w net.ipv4.ip_no_pmtu_disc=1
# 0 = PMTUD enabled (default)
# 1 = PMTUD disabled by default for new sockets

# Per-socket in application code:
# IP_MTU_DISCOVER with IP_PMTUDISC_DONT

# Or raise the minimum PMTU floor used when PMTUD is disabled:
sysctl -w net.ipv4.route.min_pmtu=576
# Cached PMTU values will not go below 576

# View PMTU on an active TCP socket:
ss -ti dst 10.20.0.5
# Shows connection info including pmtu:<value>
```

## Fix 4: Reduce Interface MTU

```bash
# If you control the bottleneck: just reduce MTU to match path

# Find actual path MTU:
tracepath -n 10.20.0.5
# Read the pmtu value from output

# Set interface MTU to match path:
PMTU=$(tracepath -n 10.20.0.5 | grep "Resume" | \
  grep -oP 'pmtu \K[0-9]+' || echo "1500")
ip link set eth0 mtu $PMTU
echo "Set interface MTU to $PMTU"

# All connections from this host will now fit the path MTU
ip link show eth0 | grep mtu
```

## Verify the Fix Works

```bash
# After applying fix, run comprehensive test:

echo "=== Testing MTU Black Hole Fix ==="

# Test 1: A too-large DF ping should no longer fail silently
ping -M do -s 1472 -c 3 10.20.0.5
# Expect either replies or an immediate "Frag needed" message

# Test 2: Large file download should complete
wget -O /dev/null -q --show-progress http://10.20.0.5/large-file && \
  echo "PASS: Large HTTP download works" || \
  echo "FAIL: Large HTTP download still stalls"

# Test 3: If you chose Fix 1, confirm ICMP Frag Needed now reaches this host
timeout 5 tcpdump -i eth0 -n 'icmp[0] = 3 and icmp[1] = 4' &
ping -M do -s 1472 -c 3 10.20.0.5
wait
# tcpdump should now show ICMP type 3 code 4 instead of nothing

# Test 4: Inspect the live TCP socket PMTU during a transfer
curl http://10.20.0.5/large-file -o /dev/null &
sleep 1
ss -ti dst 10.20.0.5 | grep -o 'pmtu:[0-9]*'
```

## Conclusion

PMTUD black holes are fixed by either allowing ICMP Type 3 Code 4 through all firewalls on the path (the proper fix) or applying TCP MSS clamping on your edge router (the practical workaround). MSS clamping is preferred when you don't control all firewalls: it prevents TCP from ever sending segments that would exceed the path MTU. Apply `--clamp-mss-to-pmtu` on the FORWARD chain on a router, and on OUTPUT only for TCP sessions originated by the Linux host itself. After applying the fix, verify with `wget` or `curl` of large files - these expose black holes better than ping does.
