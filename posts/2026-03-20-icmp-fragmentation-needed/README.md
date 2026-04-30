# How to Troubleshoot ICMP Fragmentation Needed Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, MTU, Fragmentation, Troubleshooting, IPv4, VPN

Description: Diagnose and fix issues caused by ICMP Fragmentation Needed messages being blocked or ignored, leading to mysterious TCP connection failures.

## Introduction

ICMP Type 3 Code 4 (Fragmentation Needed) is the signal a router sends when it receives a packet with the Don't Fragment (DF) bit set that is too large to forward on the next link. This message is essential for PMTUD - without it, TCP connections appear to work for small data but silently fail for larger transfers.

## Symptoms of Blocked Fragmentation Needed

- SSH connects successfully but hangs when displaying a large directory listing
- HTTPS works for simple pages but fails for large file downloads
- VPN tunnels establish but application traffic fails
- `ping -s 100 host` works, `ping -s 1400 -M do host` times out

## Finding the MTU Bottleneck

```bash
# Binary search for the actual path MTU using ping

# Start with 1472 (1500 - 28 bytes for IP+ICMP headers)

ping -s 1472 -M do -c 3 8.8.8.8   # Try full size
ping -s 1200 -M do -c 3 8.8.8.8   # Try smaller
ping -s 1400 -M do -c 3 8.8.8.8   # Narrow down

# Use tracepath which automatically discovers path MTU
tracepath 8.8.8.8
# Example output can reveal where the path MTU drops:
# 1?: [LOCALHOST]  pmtu 1500
# 1: 192.168.1.1   1.2ms
# ...
# 5: 10.0.0.1      8ms   pmtu 1400  <-- Path MTU drops here
```

## Capturing Fragmentation Needed Messages

```bash
# Capture ICMP Frag Needed packets
tcpdump -i eth0 -n -v 'icmp[0]=3 and icmp[1]=4'

# If you see these messages, PMTUD is working:
# 10.0.0.1 > 192.168.1.10: ICMP need-to-frag, next-hop MTU 1400

# If you DON'T see them but connections hang, the ICMP error may be
# filtered on the return path, or the router may be creating an MTU black hole
```

## Fixing Fragmentation Needed Problems

### Fix 1: TCP MSS Clamping (Recommended for VPNs)

```bash
# Clamp MSS on all forwarded TCP traffic
# This tells TCP endpoints to use smaller segments
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# For a specific interface (e.g., VPN tunnel)
iptables -t mangle -A FORWARD -o tun0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1360
```

### Fix 2: Reduce Interface MTU

```bash
# Reduce MTU on the sending interface to match the path MTU
ip link set eth0 mtu 1400

# For VPN tunnels, set conservative MTU
ip link set tun0 mtu 1360
```

### Fix 3: Allow Fragmentation Needed Through Firewall

```bash
# Ensure iptables passes Frag Needed messages (NEVER block this)
iptables -I INPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT
iptables -I FORWARD -p icmp --icmp-type fragmentation-needed -j ACCEPT
iptables -I OUTPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT
```

## Verifying the Fix

```bash
# After applying MSS clamping or MTU reduction, test large transfers
curl -v -o /dev/null https://proof.ovh.net/files/100Mb.dat

# Also verify with ping using the discovered path MTU
# For a 1400-byte path MTU, use 1372 bytes of ICMP payload (1400 - 28)
ping -s 1372 -M do -c 5 8.8.8.8
# Should succeed; larger payloads should clearly report MTU mismatch

# Check that TCP connections no longer hang
ssh user@remote-server "dd if=/dev/zero bs=1M count=10 | wc -c"
# Should complete without hanging
```

## Conclusion

Fragmentation Needed issues are tricky because they break specific large transfers while leaving small connections working. The root cause is almost always either a firewall blocking ICMP Type 3 Code 4 or a MTU mismatch in VPN/tunnel configurations. MSS clamping is the most robust fix for tunnel environments, while fixing firewall rules is the correct approach for stateful firewalls blocking PMTUD messages.
