# How to Configure MTU for IPv4 VPN Tunnels to Avoid Fragmentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, VPN, IPv4, WireGuard, OpenVPN, Networking

Description: Understand VPN tunnel overhead and configure the correct MTU on WireGuard and OpenVPN interfaces to prevent IPv4 packet fragmentation.

Packet fragmentation inside VPN tunnels degrades performance and can cause connectivity issues. Correctly setting the MTU on tunnel interfaces eliminates fragmentation by ensuring encapsulated packets fit within the physical network's MTU.

## Understanding VPN Overhead

Every VPN protocol adds a header overhead to each packet:

| Protocol | Overhead | Recommended MTU |
|---|---|---|
| WireGuard (UDP/IPv4) | ~60 bytes | 1420 |
| OpenVPN (UDP) | ~70 bytes | 1410 |
| OpenVPN (TCP) | ~80 bytes | 1400 |
| IPSec (ESP/UDP) | ~73 bytes | 1400 |

With a typical Ethernet MTU of 1500 bytes, subtract the overhead to get the tunnel MTU.

## Discovering the Correct MTU with Ping

```bash
# Test with progressively larger packet sizes, using the Don't Fragment flag

# Start at 1400 and increase until packets start failing
ping -M do -s 1400 <VPN_ENDPOINT_IP>
ping -M do -s 1420 <VPN_ENDPOINT_IP>
ping -M do -s 1440 <VPN_ENDPOINT_IP>
# The largest size that succeeds + 28 bytes (IP+ICMP headers) = optimal MTU
```

## Setting MTU for WireGuard

In the `[Interface]` section:

```ini
# /etc/wireguard/wg0.conf

[Interface]
PrivateKey = <PRIVATE_KEY>
Address = 10.0.0.1/24
ListenPort = 51820
# Explicitly set the tunnel MTU (recommended value for WireGuard over Ethernet)
MTU = 1420
```

Or set it via `ip link`:

```bash
sudo ip link set dev wg0 mtu 1420
```

## Setting MTU for OpenVPN

In the OpenVPN config file:

```conf
# Reduce the maximum segment size to avoid fragmentation
# tun-mtu controls the tunnel's effective MTU
tun-mtu 1400

# Fragment large packets before sending through the tunnel
fragment 1300

# Clamp TCP MSS to prevent large TCP packets from causing fragmentation
mssfix 1300
```

## Setting MTU for IPSec (StrongSwan)

StrongSwan automatically sets PMTU, but you can manually configure it:

```bash
# Check current MTU on the XFRM interface
ip link show

# Set MTU on the virtual interface
sudo ip link set xfrm0 mtu 1400
```

## Setting TCP MSS via iptables

A universal approach for all VPN types is to clamp TCP MSS at the firewall:

```bash
# Clamp TCP MSS on the VPN interface to match the tunnel MTU
sudo iptables -t mangle -A FORWARD -i wg0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1380

sudo iptables -t mangle -A FORWARD -o wg0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1380
```

## Verifying No Fragmentation

```bash
# Transfer a large file and check for fragmentation with tcpdump
sudo tcpdump -i wg0 'ip[6:2] & 0x1fff != 0'
# If this shows output, packets are being fragmented

# Check IP fragmentation statistics (look at FragOKs, FragFails,
# FragCreates, ReasmReqds, ReasmOKs, ReasmFails columns)
grep "^Ip:" /proc/net/snmp
```

Proper MTU configuration is often the difference between a functional VPN and one that mysteriously fails for large file transfers or certain applications.
