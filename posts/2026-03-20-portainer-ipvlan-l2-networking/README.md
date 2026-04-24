# How to Configure IPvlan L2 Mode for Containers in Portainer - Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, IPvlan, Docker Networking, L2 Mode, LAN Access, Network

Description: Learn how to configure Docker IPvlan L2 mode in Portainer so containers share the host's MAC address while getting unique IP addresses on the LAN.

---

IPvlan is an alternative to macvlan that lets containers share the parent interface's MAC address while having unique IP addresses. L2 mode behaves like macvlan from a routing perspective - containers get LAN IPs - but all containers use the same MAC, which avoids promiscuous mode requirements.

## IPvlan L2 vs Macvlan

| Feature | IPvlan L2 | Macvlan |
|---------|-----------|---------|
| MAC address | Shared (host MAC) | Unique per container |
| Promiscuous mode needed | No | Yes |
| Switches | No extra MAC entries | One MAC per container |
| Host-to-container | Same limitation | Same limitation |
| Use case | VM environments, one-MAC-per-port policies | Legacy apps needing unique MACs on the LAN |

## Creating an IPvlan L2 Network

Create the network via CLI before referencing it in Portainer stacks:

```bash
docker network create \
  --driver ipvlan \
  --opt ipvlan_mode=l2 \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --ip-range 192.168.1.208/29 \
  --opt parent=eth0 \
  ipvlan_l2_net
```

Or create via Portainer **Networks > Add network**:

- **Driver**: `ipvlan`
- **Driver options**: `ipvlan_mode=l2`, `parent=eth0`
- **Subnet/Gateway**: Your LAN values

## Using IPvlan L2 in a Stack

```yaml
version: "3.8"

services:
  home-assistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    hostname: homeassistant
    network_mode: host   # Home Assistant often uses host mode

  pihole:
    image: pihole/pihole:latest
    networks:
      ipvlan_l2_net:
        ipv4_address: 192.168.1.210
    environment:
      TZ: America/New_York
      FTLCONF_webserver_api_password: adminpassword
    volumes:
      - pihole_data:/etc/pihole

volumes:
  pihole_data:

networks:
  ipvlan_l2_net:
    external: true
```

## VLAN-Tagged IPvlan

For VLAN-aware setups, you can create the VLAN parent interface first:

```bash
# Create VLAN 50 interface

sudo ip link add link eth0 name eth0.50 type vlan id 50
sudo ip link set eth0.50 up

# Create IPvlan L2 on VLAN 50
docker network create \
  --driver ipvlan \
  --opt ipvlan_mode=l2 \
  --opt parent=eth0.50 \
  --subnet 10.50.0.0/24 \
  --gateway 10.50.0.1 \
  vlan50_ipvlan
```

## Host-to-Container Access

Like macvlan, the host cannot directly communicate with containers on IPvlan L2 networks. Add a dedicated host interface:

```bash
# Create an IPvlan interface for host access
sudo ip link add ipvlan0 link eth0 type ipvlan mode l2
sudo ip addr add 192.168.1.215/32 dev ipvlan0
sudo ip link set ipvlan0 up
sudo ip route add 192.168.1.208/29 dev ipvlan0
```

## Verifying Container LAN Visibility

After deploying, the container should be reachable at its LAN IP from any device on the network:

```bash
# From another machine on the LAN
ping 192.168.1.210

# From the container, verify it sees the router
docker exec -it $(docker ps -qf name=pihole) ping 192.168.1.1
```

The container IP should appear in your router's ARP table, but will show the host's MAC address rather than a unique one (unlike macvlan).

## Troubleshooting

If containers cannot reach the LAN:

```bash
# Check the IPvlan network was created with correct parent
docker network inspect ipvlan_l2_net | jq '.[0].Options'

# Verify the container got the expected IP
docker inspect $(docker ps -qf name=pihole) | jq '.[0].NetworkSettings.Networks'

# Check for IP conflicts with existing LAN devices
arp-scan --localnet | grep 192.168.1.210
```
