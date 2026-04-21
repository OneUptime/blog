# How to Capture Packets on a Specific Network Interface with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, Linux, Network Interfaces, Packet Capture, Networking

Description: Use tcpdump's -i flag to capture packets on a specific network interface, including VPN tunnels, bridges, loopback, and multiple interfaces simultaneously.

On multi-interface systems - servers with multiple NICs, VPN tunnels, or Docker networking - specifying the right interface is critical for capturing the traffic you need.

## List Available Interfaces

```bash
# List all interfaces tcpdump can capture on

sudo tcpdump -D

# Output:
# 1.eth0 [Up, Running, Connected]
# 2.eth1 [Up, Running, Connected]
# 3.lo [Up, Running, Loopback]
# 4.docker0 [Up, Running, Connected]
# 5.wg0 [Up, Running, Connected]
# 6.any (Pseudo-device that captures on all interfaces)
```

## Capture on a Specific Interface

```bash
# Capture on eth0 (primary interface)
sudo tcpdump -i eth0

# Capture on a secondary interface
sudo tcpdump -i eth1

# Capture on loopback (local process communication)
sudo tcpdump -i lo

# Capture on a WireGuard VPN interface
sudo tcpdump -i wg0

# Capture on a Docker bridge
sudo tcpdump -i docker0

# Capture on all interfaces simultaneously
sudo tcpdump -i any
```

## Capturing VPN/Tunnel Traffic

Different interfaces capture traffic at different points:

```bash
# Capture UNENCRYPTED traffic inside WireGuard tunnel
sudo tcpdump -i wg0 -nn
# Shows: actual application traffic (decrypted)

# Capture ENCRYPTED WireGuard packets on the physical interface
# Replace 51820 with the ListenPort/Endpoint port your tunnel uses
sudo tcpdump -i eth0 -nn udp port 51820
# Shows: UDP packets with encrypted payload

# Useful for verifying:
# - Traffic is actually being sent through the tunnel (wg0)
# - Encrypted packets leaving via eth0
```

## Capturing Docker Container Traffic

```bash
# Capture traffic between containers on the default Docker bridge
sudo tcpdump -i docker0 -nn

# Capture traffic on the host-side veth for a specific container
CONTAINER_PID=$(docker inspect -f '{{.State.Pid}}' container_name)
CONTAINER_IFLINK=$(sudo nsenter -t "$CONTAINER_PID" -n -- cat /sys/class/net/eth0/iflink)
HOST_IFACE=$(ip -o link | awk -F': ' -v iflink="$CONTAINER_IFLINK" '$1 == iflink {print $2}' | cut -d@ -f1)
sudo tcpdump -i "$HOST_IFACE" -nn

# Capture traffic inside a specific container:
CONTAINER_PID=$(docker inspect -f '{{.State.Pid}}' container_name)
sudo nsenter -t $CONTAINER_PID -n -- tcpdump -nn -i eth0
```

## Capture on Multiple Interfaces

```bash
# Capture on all interfaces (any pseudo-interface)
sudo tcpdump -i any -nn

# Note: 'any' may duplicate packets on some kernels
# (traffic may appear twice: once per direction)

# Parallel capture on two interfaces
sudo tcpdump -i eth0 -w /tmp/eth0.pcap &
sudo tcpdump -i eth1 -w /tmp/eth1.pcap &
# Stop both:
sudo pkill tcpdump
```

## Capture by Interface Type

```bash
# Find interface names by type
ip -o link show | grep 'link/ether'          # Ethernet-style interfaces
ip link show type veth                       # Virtual Ethernet pairs (containers)
ip link show type bridge                     # Linux bridges (Docker/user-defined bridges)
ip -o link show | grep -E ': (tun|tap)[0-9]' # Common OpenVPN TUN/TAP names
ip link show type gre                        # GRE tunnel devices
wg show interfaces                           # WireGuard interfaces

# Capture on specific tunnel type
# For OpenVPN (tun0):
sudo tcpdump -i tun0 -nn

# For GRE tunnel:
sudo tcpdump -i gre1 -nn
```

## Verify Traffic Path

```bash
# Test that VPN is routing traffic:
# Terminal 1: capture on physical interface
# Replace 51820 with the ListenPort/Endpoint port your tunnel uses
sudo tcpdump -i eth0 -nn udp port 51820 -c 10

# Terminal 2: capture on VPN interface
sudo tcpdump -i wg0 -nn icmp -c 10

# Terminal 3: send traffic through VPN
ping 10.200.0.1   # IP inside VPN

# Expected results:
# eth0: shows encrypted UDP WireGuard packets
# wg0: shows plain ICMP packets
```

Specifying the correct interface is the foundation of effective tcpdump usage - capturing on the wrong interface shows either encrypted packets (useless) or no traffic at all.
