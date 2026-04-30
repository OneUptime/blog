# How to Fix MTU-Related Connectivity Problems (Packet Too Large)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, Packet Too Large, PMTUD, ICMP, Troubleshooting

Description: Learn how to diagnose and fix MTU-related connectivity issues where large packets are silently dropped, causing partial connectivity - small packets work but large transfers fail.

## The MTU Problem Pattern

MTU issues have a distinctive pattern:
- Pings work, web browsing partially works
- HTTPS pages load but large downloads hang
- SSH connects but hangs after banner
- VPN tunnels work for small packets but not large transfers

This happens when PMTUD ICMP messages are blocked, breaking Path MTU Discovery (PMTUD): in IPv4 this is ICMP "Fragmentation Needed" (destination unreachable, type 3 code 4), and in IPv6 it is ICMPv6 "Packet Too Big".

## Step 1: Identify MTU Issues with Ping

```bash
# Test with increasing packet sizes to find the MTU limit

# -M do = Don't Fragment, -s = payload size

# Linux
ping -M do -s 1472 192.168.1.1   # 1472 + 28 byte header = 1500 (standard MTU)
ping -M do -s 1400 192.168.1.1   # Try smaller
ping -M do -s 1300 8.8.8.8       # Try across internet

# If 1472 fails but 1400 works, MTU is between 1428 and 1500

# Windows
ping -f -l 1472 192.168.1.1      # -f = Don't Fragment, -l = size
ping -f -l 1400 8.8.8.8
```

## Step 2: Find the Path MTU

```bash
# Binary search for exact PMTU (Linux)
#!/bin/bash
TARGET=8.8.8.8
LOW=0
HIGH=1472

while [ $((HIGH - LOW)) -gt 1 ]; do
    MID=$(( (LOW + HIGH) / 2 ))
    if ping -M do -s $MID -c 1 -W 2 $TARGET &>/dev/null; then
        LOW=$MID
    else
        HIGH=$MID
    fi
done

echo "Path MTU to $TARGET: $((LOW + 28)) bytes (payload: $LOW)"
```

```bash
# tracepath - discovers the path MTU and shows where it changes
tracepath 8.8.8.8
# Look for: pmtu XXXX entries showing where MTU decreases
```

## Step 3: Check Current Interface MTU

```bash
# Linux
ip link show eth0 | grep mtu
# Legacy alternative if net-tools is installed
ifconfig eth0 | grep mtu

# Windows
netsh interface ipv4 show subinterfaces
# Shows MTU for each interface

# macOS
networksetup -getMTU "Ethernet"
```

## Step 4: Fix by Lowering MTU on the Interface

```bash
# Linux - lower MTU to match network requirements
sudo ip link set eth0 mtu 1450    # Common for PPPoE networks
sudo ip link set tun0 mtu 1400    # VPN tunnels typically need lower MTU

# Make permanent (NetworkManager)
nmcli con mod "Wired connection 1" ethernet.mtu 1450
nmcli con up "Wired connection 1"

# Make permanent (netplan)
# /etc/netplan/01-netcfg.yaml
```

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      mtu: 1450
```

```bash
# Windows
netsh interface ipv4 set subinterface "Ethernet" mtu=1450 store=persistent
netsh interface ipv4 show subinterfaces
```

## Step 5: Fix PMTUD Blackhole with TCP MSS Clamping

When ICMP "Fragmentation Needed" packets are blocked, use TCP MSS clamping as a workaround:

```bash
# Linux - clamp TCP MSS at the WAN interface
# MSS = MTU - 40 (20 IP header + 20 TCP header)
# For MTU 1450: MSS = 1410

sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu

# Or set explicit MSS value
sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1410

# Make persistent (for systems using iptables-persistent / netfilter-persistent)
sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
```

## Step 6: Verify ICMP Is Not Blocked

```bash
# IPv4 ICMP type 3 code 4 = "Fragmentation Needed" - must not be blocked
# Check iptables
sudo iptables -L -n | grep -i icmp

# Allow ICMP fragmentation needed
sudo iptables -I INPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT
sudo iptables -I FORWARD -p icmp --icmp-type fragmentation-needed -j ACCEPT

# Windows Firewall - ensure ICMP is allowed through
netsh advfirewall firewall show rule name="Core Networking - Destination Unreachable"
```

## Conclusion

MTU problems are identified by the pattern of small packets working while large transfers fail. Diagnose with `ping -M do -s SIZE target` to find the maximum working size. Fix by lowering the interface MTU to match the path limit (`ip link set eth0 mtu 1450`), applying TCP MSS clamping with iptables at the router, and ensuring ICMP type 3 code 4 "Fragmentation Needed" packets are not blocked by firewalls. For VPN tunnels, set MTU to 1400 or lower to account for tunnel overhead.
