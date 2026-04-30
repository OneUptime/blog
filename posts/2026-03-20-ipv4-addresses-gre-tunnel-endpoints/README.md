# How to Assign IPv4 Addresses to GRE Tunnel Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, GRE, Tunnel, IPv4, iproute2, Networking, Point-to-Point

Description: Assign appropriate IPv4 addresses to GRE tunnel interface endpoints using /30 or /31 point-to-point subnets and configure routing through the tunnel.

## Introduction

GRE tunnels create a point-to-point virtual link, and the addresses assigned to the tunnel endpoints (tunnel IPs) are different from the underlay IPs used to establish the tunnel. Choosing the right subnet size and assigning addresses correctly is important for both routing and manageability.

## Understanding the Two Types of IPs

| IP Type | Purpose | Example |
|---|---|---|
| Underlay IP (local/remote) | Establishes the tunnel through the network | `10.0.0.1` / `10.0.0.2` |
| Tunnel IP (overlay) | Routes traffic through the tunnel | `172.16.0.1` / `172.16.0.2` |

## Recommended Subnet Sizes for Point-to-Point Links

```text
/30 subnet: 4 IPs - network, 2 hosts, broadcast
Example: 172.16.0.0/30 → .1 and .2 are usable

/31 subnet: 2 IPs - both are host addresses (RFC 3021)
Example: 172.16.0.0/31 → .0 and .1 are both usable
```

## Assign /30 Addresses to GRE Tunnel

```bash
# Host A: tunnel endpoint A uses the lower IP

ip addr add 172.16.0.1/30 dev gre0
ip link set gre0 up

# Host B: tunnel endpoint B uses the higher IP
ip addr add 172.16.0.2/30 dev gre0
ip link set gre0 up
```

## Assign /31 Addresses (More Efficient)

```bash
# Host A
ip addr add 172.16.1.0/31 dev gre0
ip link set gre0 up

# Host B
ip addr add 172.16.1.1/31 dev gre0
ip link set gre0 up
```

## Assign /32 with a Peer (Point-to-Point Host Route)

For the most explicit configuration:

```bash
# Host A: assign /32 with peer directive
ip addr add 172.16.0.1 peer 172.16.0.2/32 dev gre0

# Host B: assign /32 with peer directive
ip addr add 172.16.0.2 peer 172.16.0.1/32 dev gre0
```

## Verify Address Assignment

```bash
# Check tunnel interface IP
ip addr show gre0

# Check the auto-added route for the tunnel subnet
ip route show dev gre0
```

## Add Routes Through the Tunnel

After assigning tunnel IPs, add routes for remote networks:

```bash
# On Host A: reach 192.168.2.0/24 (Host B's LAN) via tunnel
ip route add 192.168.2.0/24 via 172.16.0.2

# On Host B: reach 192.168.1.0/24 (Host A's LAN) via tunnel
ip route add 192.168.1.0/24 via 172.16.0.1
```

## Naming Conventions for Multiple Tunnels

When managing multiple GRE tunnels, use descriptive names:

```bash
# Site-to-site tunnel: hostA-to-hostB
ip tunnel add gre-site-b mode gre local 10.0.0.1 remote 10.0.0.2 ttl 255
ip addr add 172.16.0.1/30 dev gre-site-b
ip link set gre-site-b up

# Another tunnel: hostA-to-hostC
ip tunnel add gre-site-c mode gre local 10.0.0.1 remote 10.0.0.3 ttl 255
ip addr add 172.16.0.5/30 dev gre-site-c
ip link set gre-site-c up
```

## Conclusion

GRE tunnel endpoint IPs should use /30 or /31 subnets to conserve address space on point-to-point links. The tunnel IPs (overlay) are completely separate from the underlay IPs used in the `local` and `remote` parameters. After assigning tunnel IPs, add static routes for remote subnets pointing through the tunnel's far-end IP.
