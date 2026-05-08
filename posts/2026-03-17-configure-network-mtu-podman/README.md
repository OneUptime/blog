# How to Configure Network MTU for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, MTU, Performance

Description: Learn how to configure the Maximum Transmission Unit (MTU) for Podman networks to optimize performance and avoid fragmentation.

---

> Setting the correct MTU prevents packet fragmentation and improves throughput for containerized workloads.

The Maximum Transmission Unit defines the largest packet size a network interface can transmit without fragmentation. Mismatched MTU values between the host, container bridge, and upstream network can cause silent packet drops, degraded performance, or connection stalls. Podman lets you set the MTU when creating a network.

---

## Checking the Host MTU

Before configuring container networks, determine the MTU of your host interface.

```bash
# Check the MTU of the host's primary interface

ip link show eth0 | grep mtu

# Typical output: mtu 1500 qdisc fq_codel state UP
```

## Creating a Network with a Custom MTU

Use the `--opt` flag to pass the MTU option when creating a Podman network.

```bash
# Create a network with MTU 9000 for jumbo frame support
podman network create --opt mtu=9000 jumbo-net

# Verify the network configuration
podman network inspect jumbo-net | grep -i mtu
```

## Creating a Network with a Smaller MTU

Some environments like VPNs or overlay networks require a smaller MTU to account for encapsulation overhead.

```bash
# Create a network with MTU 1400 for VPN environments
podman network create --opt mtu=1400 vpn-net

# Run a container on this network
podman run -d --name vpn-app --network vpn-net docker.io/library/nginx:alpine

# Install diagnostic tools used in the verification steps
podman exec vpn-app apk add --no-cache iproute2 iputils
```

## Verifying the Container MTU

```bash
# Check the MTU inside the container
podman exec vpn-app cat /sys/class/net/eth0/mtu
# Expected output: 1400

# Alternatively, use ip link
podman exec vpn-app ip link show eth0
```

## Testing for Fragmentation

```bash
# Send a packet at the MTU size to test for fragmentation
# The -M do flag sets the don't-fragment bit
GATEWAY=$(podman network inspect vpn-net --format "{{range .Subnets}}{{.Gateway}}{{end}}")
podman exec vpn-app ping -c 3 -s 1372 -M do "$GATEWAY"

# If the MTU is correct, all packets arrive
# If MTU is too large, you will see "message too long" errors
```

## Common MTU Values

```bash
# Standard Ethernet: 1500
podman network create --opt mtu=1500 standard-net

# Jumbo frames: 9000
podman network create --opt mtu=9000 jumbo-net

# VXLAN overlay: 1450 (1500 minus 50 bytes overhead)
podman network create --opt mtu=1450 overlay-net

# WireGuard VPN: 1420 (1500 minus 80 bytes overhead)
podman network create --opt mtu=1420 wireguard-net
```

## Summary

Configuring the MTU on Podman networks avoids packet fragmentation and keeps throughput predictable. Always match your container network MTU to the underlying transport, subtracting any encapsulation overhead for VPNs or overlay networks.
