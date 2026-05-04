# How to Create a GRE Tunnel with ip tunnel add

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GRE, Tunneling, Linux, Networking, Ip-command, IPv4

Description: Create a Generic Routing Encapsulation (GRE) tunnel between two Linux hosts using ip tunnel add to carry IPv4 traffic over an IP network.

## Introduction

GRE (Generic Routing Encapsulation) is a simple tunneling protocol that encapsulates one network protocol inside another. It is commonly used to connect two private networks over the public internet or to carry multicast and routing protocol traffic across a network that would not otherwise support it.

## Prerequisites

- Two Linux hosts with public or routable IPv4 addresses
- Root or sudo access on both hosts
- The `ip` command (part of `iproute2`)

## Network Topology

```yaml
Host A (10.0.0.1 public) ---[GRE tunnel]--- Host B (10.0.0.2 public)
      tunnel IP: 172.16.0.1/30              tunnel IP: 172.16.0.2/30
```

## Creating the Tunnel on Host A

```bash
# Create GRE tunnel interface named gre1 on Host A
# local = this host's public IP, remote = remote host's public IP, ttl = TTL for encapsulated packets
sudo ip tunnel add gre1 mode gre \
  local 10.0.0.1 \
  remote 10.0.0.2 \
  ttl 255

# Bring up the tunnel interface
sudo ip link set gre1 up

# Assign an inner (tunnel) IPv4 address
sudo ip addr add 172.16.0.1/30 dev gre1
```

## Creating the Tunnel on Host B

```bash
# Create GRE tunnel interface on Host B (mirror configuration)
# local = Host B's public IP, remote = Host A's public IP
sudo ip tunnel add gre1 mode gre \
  local 10.0.0.2 \
  remote 10.0.0.1 \
  ttl 255

sudo ip link set gre1 up
sudo ip addr add 172.16.0.2/30 dev gre1
```

## Adding Routes Through the Tunnel

To reach Host A's private network (192.168.1.0/24) from Host B:

```bash
# On Host B: route to Host A's private subnet via the tunnel
sudo ip route add 192.168.1.0/24 via 172.16.0.1 dev gre1
```

## Verifying the Tunnel

```bash
# Check tunnel interface state
ip link show gre1
ip addr show gre1

# Ping the far end of the tunnel
ping -c 3 172.16.0.2

# Show tunnel details
ip tunnel show gre1
```

## Enabling IP Forwarding

For the tunnel to route traffic between networks, enable IP forwarding:

```bash
# Enable IP forwarding temporarily
sudo sysctl -w net.ipv4.ip_forward=1

# Make it persistent across reboots
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.d/99-ipforward.conf
```

## Removing the Tunnel

```bash
sudo ip link set gre1 down
sudo ip tunnel del gre1
```

## Limitations

- GRE has no built-in encryption - combine with IPsec for secure tunnels
- GRE adds 24 bytes of overhead, so adjust MTU on the tunnel interface accordingly

```bash
# Set MTU to avoid fragmentation (1500 - 24 GRE overhead)
sudo ip link set gre1 mtu 1476
```

## Conclusion

`ip tunnel add` makes it quick to establish GRE tunnels for testing or lightweight site connectivity. For production use, always add IPsec encryption or use WireGuard instead.
