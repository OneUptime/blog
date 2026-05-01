# How to Configure Docker IPvlan Networks with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, IPvlan, Network Driver, L3 Networking

Description: Create Docker IPvlan networks with IPv6 support using L2 and L3 modes, understand the difference between IPvlan and Macvlan, and configure containers with routable IPv6 addresses using IPvlan.

## Introduction

IPvlan is a Docker network driver that gives containers direct L2 (Ethernet) or L3 (IP routing) network access using the parent interface's MAC address. Unlike Macvlan, IPvlan shares the parent's MAC address - all containers use the host's MAC. IPvlan L3 mode is particularly useful when you want containers to have IPv6 addresses routed at layer 3 without changing MAC addresses, making it compatible with networks that restrict MAC address changes (like some cloud environments).

## IPvlan L2 Mode with IPv6

```bash
# L2 mode: containers are on the same L2 segment as the host

# All containers share the parent interface's MAC address
# Replace the 2001:db8::/32 documentation prefix with your real IPv6 prefix in production

docker network create \
    --driver ipvlan \
    --opt ipvlan_mode=l2 \
    --opt parent=eth0 \
    --ipv6 \
    --subnet 192.168.1.0/24 \
    --subnet 2001:db8:1::/64 \
    --gateway 192.168.1.1 \
    --gateway 2001:db8:1::1 \
    ipvlan-l2-net

# Run containers
docker run -d \
    --name web-l2 \
    --network ipvlan-l2-net \
    --ip6 2001:db8:1::30 \
    nginx:latest

docker run -d \
    --name peer-l2 \
    --network ipvlan-l2-net \
    --ip6 2001:db8:1::31 \
    nginx:latest

# Verify IPv6
docker inspect --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}' web-l2
# 2001:db8:1::30

# Confirm shared MAC (same as host eth0)
docker inspect --format '{{range .NetworkSettings.Networks}}{{.MacAddress}}{{end}}' web-l2
cat /sys/class/net/eth0/address
# Both should show same MAC
```

## IPvlan L3 Mode with IPv6 (Recommended for Routing)

```bash
# L3 mode: Docker acts as an IPv6 router between containers and external networks
# Requires adding a route on the upstream router
# Replace the 2001:db8::/32 documentation prefix with your real IPv6 prefix in production

docker network create \
    --driver ipvlan \
    --opt ipvlan_mode=l3 \
    --opt parent=eth0 \
    --ipv6 \
    --subnet 192.168.100.0/24 \
    --subnet 2001:db8:100::/64 \
    ipvlan-l3-net

# NOTE: L3 mode has NO gateway - routing is handled by ipvlan driver
# The upstream router needs a route:
# ip -6 route add 2001:db8:100::/64 via <host-eth0-ipv6>

# Run container in L3 mode
docker run -d \
    --name web-l3 \
    --network ipvlan-l3-net \
    --ip6 2001:db8:100::10 \
    nginx:latest

# Container can reach external IPv6 destinations if upstream router has the route
docker exec web-l3 curl -6 -s https://ipv6.icanhazip.com
```

## Docker Compose with IPvlan

```yaml
# compose.yaml

networks:
  ipvlan-net:
    driver: ipvlan
    driver_opts:
      parent: eth0
      ipvlan_mode: l2
    enable_ipv6: true
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
        - subnet: 2001:db8:1::/64
          gateway: 2001:db8:1::1

services:
  web:
    image: nginx:latest
    networks:
      ipvlan-net:
        ipv6_address: 2001:db8:1::40

  api:
    image: myapi:latest
    networks:
      ipvlan-net:
        ipv6_address: 2001:db8:1::41
```

## IPvlan vs Macvlan Comparison

```text
Feature              IPvlan              Macvlan
-----------          ----------          ----------
MAC address          Shared (host MAC)   Unique per container
L2 broadcast         Yes (L2 mode)       Yes
L3 routing           Yes (L3 mode)       No
Cloud compatibility  Better              Worse (MAC restrictions)
Host isolation       Yes (L2 mode)       Yes
Kernel version       4.2+                3.9+
IPv6 support         Yes                 Yes
VLAN support         Yes                 Yes
```

## Test IPv6 Connectivity

```bash
# Test container-to-container
docker exec web-l2 curl -6 -I http://[2001:db8:1::31]

# Test container-to-internet (L2 mode)
docker exec web-l2 curl -6 -s https://ipv6.icanhazip.com

# Test container-to-host (L2 mode has same isolation issue as macvlan)
# Use a separate ipvlan interface on host for host access with an unused IPv6 in the subnet:
sudo ip link add link eth0 name ipvlan-host type ipvlan mode l2
sudo ip -6 addr add 2001:db8:1::254/64 dev ipvlan-host
sudo ip link set ipvlan-host up
```

## Conclusion

Docker IPvlan networks support IPv6 in both L2 mode (containers on same L2 as host) and L3 mode (Docker routes IPv6 between containers and upstream router). IPvlan shares the host's MAC address, making it compatible with cloud environments that restrict per-interface MAC addresses (unlike Macvlan). L3 mode is preferred for routing-heavy setups and requires adding a route on the upstream router pointing to the container IPv6 subnet via the host's IPv6 address. When you adapt these examples for real deployments, replace the `2001:db8::/32` documentation prefix with a valid IPv6 prefix for your environment.
