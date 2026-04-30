# How to Troubleshoot IPv4 Packet Fragmentation and Reassembly Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Fragmentation, MTU, PMTUD, tcpdump, Troubleshooting, Networking

Description: Learn how to diagnose and fix IPv4 packet fragmentation issues, including MTU mismatches, ICMP black holes, and path MTU discovery failures that cause mysterious connectivity problems.

---

Fragmentation failures cause application-level hangs: TCP connections establish but data transfer stalls. The root cause is usually ICMP "fragmentation needed" messages being blocked by firewalls.

## How Path MTU Discovery (PMTUD) Works

```text
Sender sends 1500-byte packet with DF bit set
  → Router with 1400-byte MTU drops packet
  → Router sends ICMP Type 3 Code 4 "Fragmentation Needed"
  → Sender reduces packet size

If ICMP is blocked by firewall:
  → Sender never learns smaller MTU
  → Large packets silently dropped
  → TCP connects but data transfers hang
```

## Diagnosing with ping

```bash
# Find the maximum MTU that passes without fragmentation

ping -M probe -s 1472 192.168.1.10   # 1472 + 28 (IP+ICMP headers) = 1500
ping -M probe -s 1400 192.168.1.10   # Try smaller sizes
ping -M probe -s 1200 192.168.1.10

# On macOS
ping -D -s 1472 192.168.1.10

# When fragmentation is needed, you'll see:
# "From x.x.x.x: frag needed and DF set (mtu = 1400)"
```

## Diagnosing with tcpdump

```bash
# Capture ICMP fragmentation needed messages
tcpdump -i eth0 "icmp[icmptype] == 3 and icmp[icmpcode] == 4"

# Look for:
# IP 10.0.0.1 > 192.168.1.10: ICMP 10.0.0.2 unreachable - need to frag (mtu 1400)
```

## Checking Interface MTU

```bash
ip link show eth0 | grep mtu
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...

# For VPN/tunnel interfaces (often need lower MTU)
ip link show tun0   # 1500 - overhead = typically 1420-1480
```

## Fixing: Set MTU on Interface

```bash
# Set MTU to match the path MTU
ip link set eth0 mtu 1450

# For PPPoE (subtract 8 bytes overhead)
ip link set pppoe0 mtu 1492

# For IPSec/VPN tunnels
ip link set tun0 mtu 1400
```

## Fixing: TCP MSS Clamping (Better than lowering MTU)

```bash
# Clamp TCP MSS to prevent fragmentation (iptables)
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Or set explicit MSS value
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1360

# nftables equivalent
table ip mangle {
  chain forward {
    type filter hook forward priority mangle;
    tcp flags syn tcp option maxseg size set rt mtu
  }
}
```

## Verifying Fragmentation Statistics

```bash
# Check kernel fragmentation stats
cat /proc/net/snmp | grep Ip:
# Look for: IpReasmFails, IpFragFails
netstat -s | grep -i "fragment\|reassemb"
```

## Key Takeaways

- PMTUD failures cause TCP connections that establish but stall during data transfer - the classic ICMP black hole.
- Allow ICMP Type 3 Code 4 ("fragmentation needed") through firewalls; blocking it breaks PMTUD.
- TCP MSS clamping (`--clamp-mss-to-pmtu`) is preferable to lowering MTU as it only affects TCP.
- Use `ping -M probe -s 1472` to binary search for the effective path MTU between two hosts on current Linux systems.
