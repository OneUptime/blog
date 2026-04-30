# How to Configure IPv6 Mesh Networks for IoT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IoT, Mesh Network, 6LoWPAN, RPL, Networking

Description: Configure IPv6 mesh networks for IoT deployments using 6LoWPAN and RPL routing, enabling multi-hop connectivity between constrained devices and a border router.

## Introduction

IPv6 mesh networks for IoT allow devices to communicate through multiple hops when direct connectivity to a border router is not possible. This is essential for large sensor deployments in buildings, factories, or outdoor environments where radio range is limited.

## Mesh Network Architecture

```mermaid
flowchart TB
    Internet --> BR["Border Router\n2001:db8:1:1::1/64"]
    BR --> R1["Router Node\n2001:db8:1:1::a1"]
    BR --> R2["Router Node\n2001:db8:1:1::a2"]
    R1 --> S1["Sensor Node\n2001:db8:1:1::b1"]
    R1 --> S2["Sensor Node\n2001:db8:1:1::b2"]
    R2 --> S3["Sensor Node\n2001:db8:1:1::b3"]
    S1 --> S4["Sensor Node\n2001:db8:1:1::c1\n(3 hops from BR)"]
```

## RPL Routing Protocol

RPL (Routing Protocol for Low-Power and Lossy Networks, RFC 6550) is a standard routing protocol for many IPv6 mesh IoT networks. It builds a DODAG (Destination-Oriented Directed Acyclic Graph) rooted at the border router.

## Setting Up a Linux-Based Border Router

```bash
# Install required packages for an IEEE 802.15.4 based mesh
sudo apt-get install wpan-tools radvd

# Configure the 802.15.4 interface
sudo iwpan phy phy0 set channel 0 26
sudo iwpan dev wpan0 set pan_id 0xabcd

# Create 6LoWPAN interface
sudo ip link add link wpan0 name lowpan0 type lowpan
sudo ip link set wpan0 up
sudo ip link set lowpan0 up

# Assign an IPv6 address to the border router's 6LoWPAN interface
sudo ip -6 addr add 2001:db8:1:1::1/64 dev lowpan0

# Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Set up radvd to provide prefix to the mesh
sudo tee /etc/radvd.conf > /dev/null << 'EOF'
interface lowpan0 {
    AdvSendAdvert on;
    AdvManagedFlag off;
    AdvOtherConfigFlag off;
    prefix 2001:db8:1:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };
};
EOF
sudo systemctl start radvd
```

## Configuring an OpenThread Mesh Network

OpenThread provides a production-ready Thread mesh implementation:

```bash
# Build or flash an OpenThread CLI image such as ot-cli-ftd for your target platform

# On each router node (using OpenThread CLI):
# 1. Set the same active dataset as the existing Thread network
> dataset set active <hex-encoded-tlvs>

# 2. Start the thread interface
> ifconfig up
> thread start

# 3. Check the device joined the mesh
> state
# child initially, then router or leader after attach completes

# 4. Show routing table
> router table
# Shows all routers in the mesh with their RLOC16 and next hop

# 5. Show all addresses
> ipaddr
# Shows link-local, mesh-local EID, RLOC, and global addresses
```

## Configuring RIOT OS for Mesh Networking

```makefile
# Makefile - RIOT OS with RPL mesh networking

BOARD = iotlab-m3
USEMODULE += gnrc_ipv6_router_default
USEMODULE += gnrc_sixlowpan_default
USEMODULE += gnrc_rpl
USEMODULE += auto_init_gnrc_netif
USEMODULE += gnrc_icmpv6_echo
USEMODULE += shell
USEMODULE += shell_cmds_default
```

```c
// main.c - Initialize RPL routing on the router node

#include "net/gnrc/rpl.h"
#include "net/gnrc/netif.h"
#include "shell.h"

int main(void) {
    char line_buf[SHELL_DEFAULT_BUFSIZE];

    // Get the first network interface (IEEE 802.15.4)
    gnrc_netif_t *netif = gnrc_netif_iter(NULL);

    if (netif != NULL) {
        // On regular mesh nodes, start the RPL thread and join via DIO messages.
        gnrc_rpl_init(netif->pid);
    }

    // On the border router node, also initialize the DODAG root with
    // gnrc_rpl_root_init() after setting the DODAG ID.

    // Start the shell for debugging
    shell_run(NULL, line_buf, SHELL_DEFAULT_BUFSIZE);
    return 0;
}
```

## Verifying Mesh Connectivity

```bash
# From the border router, ping a deep mesh node (3 hops away)
ping6 -c 3 2001:db8:1:1::c1

# Traceroute to see the path through the mesh
traceroute6 2001:db8:1:1::c1

# On a RIOT OS node, check RPL parent and routing table
> rpl
> nib route
```

## Conclusion

IPv6 mesh networks for IoT use 6LoWPAN for header compression, RPL for multi-hop routing, and a border router to bridge the mesh to the broader IPv6 network. Tools like OpenThread and RIOT OS provide production-ready implementations. The key insight is that RPL builds a routing topology automatically based on its objective function and link metrics, creating a self-healing mesh that routes around node failures.
