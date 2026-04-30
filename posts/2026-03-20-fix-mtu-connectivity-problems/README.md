# How to Fix MTU-Related Connectivity Problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, Networking, Troubleshooting, Linux, VPN, PMTUD, Fragmentation

Description: Learn how to diagnose and fix MTU mismatch problems that cause partial connectivity, slow performance, and mysterious packet loss on Linux systems and VPN tunnels.

---

MTU (Maximum Transmission Unit) mismatches cause some of the most frustrating networking problems: connections work for small packets but fail for large ones, websites partially load, or VPN tunnels drop large file transfers. This guide covers diagnosis and resolution.

---

## Understanding MTU Issues

The standard Ethernet MTU is 1500 bytes. For IPv4, when a packet exceeds the MTU of a link, it must be fragmented - or dropped if the DF (Don't Fragment) bit is set. IPv6 routers do not fragment packets; they send ICMPv6 "Packet Too Big" instead. MTU problems occur when:

- VPN tunnels add overhead, reducing effective MTU
- Firewalls block ICMP "Fragmentation Needed" / "Packet Too Big" messages (breaking PMTUD)
- Different network segments have different MTUs
- Jumbo frames are configured on some but not all devices

---

## Symptoms of MTU Problems

- Large web pages or file transfers fail but small ones succeed
- SSH connections hang after typing (authentication works, but large terminal output freezes)
- VPN tunnels drop large packets
- `ping` works but browsing or SCP fails
- Connections time out after initial handshake

---

## Diagnosing MTU Problems

### The Classic MTU Test

```bash
# Test with ping and DF bit set (-M do on Linux)

# Find the largest packet size that succeeds

# Test with 1472 bytes (1500 - 20 IP header - 8 ICMP = 1472)
ping -M do -s 1472 8.8.8.8

# If this fails, try smaller sizes
ping -M do -s 1400 8.8.8.8
ping -M do -s 1200 8.8.8.8
ping -M do -s 1000 8.8.8.8

# Binary search to find the exact maximum
ping -M do -s 1450 8.8.8.8   # Works?
ping -M do -s 1460 8.8.8.8   # Works?
ping -M do -s 1465 8.8.8.8   # Works?
```

### Check Current MTU Settings

```bash
# Show MTU for all interfaces
ip link show

# Output includes:
# mtu 1500  ← standard
# mtu 1420  ← typical for VPN tunnel

# Check specific interface
ip link show eth0 | grep mtu
```

### Test Path MTU

```bash
# Tracepath discovers MTU along each hop
tracepath 8.8.8.8

# Output shows:
# 1?: [LOCALHOST] pmtu 1500
# 1:  192.168.1.1  0.5ms pmtu 1492
# 2:  10.0.0.1    5.2ms
```

---

## Fixing MTU on Linux

### Temporary Fix (ip command)

```bash
# Set MTU to 1420 for VPN interface
sudo ip link set dev tun0 mtu 1420

# Or for physical interface
sudo ip link set dev eth0 mtu 1400
```

### Permanent Fix (systemd-networkd)

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Link]
MTUBytes=1400
```

```bash
sudo systemctl restart systemd-networkd
```

### Permanent Fix (NetworkManager)

```bash
# Use the NetworkManager connection profile name
nmcli connection modify "<connection-name>" 802-3-ethernet.mtu 1400
nmcli connection up "<connection-name>"
```

### Permanent Fix (/etc/network/interfaces)

```bash
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    mtu 1400
```

---

## Fixing MTU for VPN Tunnels

VPN tunnels add overhead, reducing the available MTU:

| Tunnel Type | Overhead | Recommended MTU |
|-------------|----------|-----------------|
| IPSec (ESP) | ~60 bytes | 1440 |
| WireGuard   | ~60 bytes | 1420 |
| OpenVPN UDP | ~50 bytes | 1450 |
| GRE         | ~24 bytes | 1476 |

```bash
# WireGuard interface
sudo ip link set wg0 mtu 1420

# Or in wg config:
# /etc/wireguard/wg0.conf
[Interface]
MTU = 1420
```

---

## TCP MSS Clamping (iptables)

When you can't control all endpoints, use TCP MSS clamping to force TCP to use a smaller segment size:

```bash
# Clamp MSS to PMTU for forwarded TCP traffic through a Linux router/firewall
sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu

# Or set an explicit IPv4 MSS (1360 for a 1400-byte path MTU)
sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1360

# Save current rules to a file (example path used by iptables-persistent on Debian/Ubuntu)
sudo iptables-save > /etc/iptables/rules.v4
```

---

## ICMP PMTUD Error Verification

MTU problems often come from PMTUD-related ICMP being blocked:

```bash
# IPv4: ICMP destination unreachable, fragmentation needed (type 3 code 4)
sudo tcpdump -i eth0 -n "icmp[0] = 3 and icmp[1] = 4"

# IPv6: ICMPv6 Packet Too Big (type 2)
sudo tcpdump -i eth0 -n "icmp6 and icmp6[icmp6type] = icmp6-packettoobig"

# If you see these messages but connections still fail,
# the host or firewall is dropping them before they're processed
```

---

## Windows MTU Fix

```powershell
# Check current MTU
netsh interface ipv4 show subinterfaces

# Set MTU
netsh interface ipv4 set subinterface "Ethernet" mtu=1400 store=persistent

# Verify
netsh interface ipv4 show subinterfaces
```

---

## Best Practices

1. **Set consistent MTU** across all devices on a path, including VPN endpoints
2. **Use TCP MSS clamping** as a safety net when MTU is unpredictable
3. **Never block PMTUD ICMP messages** - IPv4 uses ICMP unreachable (fragmentation needed), and IPv6 uses ICMPv6 Packet Too Big
4. **Test with ping -M do** after any network change involving tunnels
5. **Document MTU settings** in your network runbook for each tunnel type

---

## Conclusion

MTU problems are diagnosed with `ping -M do -s XXXX` to find the effective path MTU, and fixed by setting the correct MTU on the affected interface or tunnel. Use TCP MSS clamping as a fallback when path MTU discovery is unreliable.

---

*Monitor your network connectivity and detect packet loss with [OneUptime](https://oneuptime.com).*
