# How to Configure Macvlan Networks for Direct LAN Access in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Macvlan, Docker Networking, LAN Access, Network, IP Address

Description: Learn how to configure Docker macvlan networks in Portainer so containers get their own IP addresses on your physical LAN, appearing as separate devices.

---

Macvlan allows Docker containers to appear as physical devices on your LAN, each with their own MAC and IP address. This is ideal for home automation systems, network appliances (Pi-hole, AdGuard Home), and any service that needs to be directly reachable on the local network.

## Prerequisites

- A Linux Docker host with a physical network interface (e.g., `eth0`)
- IP address range on your LAN available for container assignment
- Network equipment or a VM virtual switch that allows multiple MAC addresses (some VM platforms require promiscuous mode)

```bash
# If your VM platform requires it, enable promiscuous mode inside the guest

sudo ip link set eth0 promisc on

# Optional: make it persistent on the guest
echo 'ACTION=="add", KERNEL=="eth0", RUN+="/sbin/ip link set %k promisc on"' \
  | sudo tee /etc/udev/rules.d/99-promisc.rules
```

On virtualized platforms, you may also need to allow promiscuous mode or multiple MAC addresses on the hypervisor's virtual switch or port group.

## Creating a Macvlan Network in Portainer

In Portainer, go to **Networks > Add network**:

- **Driver**: `macvlan`
- **Driver options**: set `parent=eth0`
- **Subnet**: Your LAN subnet, e.g., `192.168.1.0/24`
- **Gateway**: Your router, e.g., `192.168.1.1`
- **IPv4 range**: A range of IPs reserved for containers, e.g., `192.168.1.200/29` (usable addresses are `.201`-`.206` before exclusions)
- **Excluded IP**: Reserve one address such as `192.168.1.206` if you plan to create a host-side macvlan interface later

Or create via CLI:

```bash
docker network create \
  --driver macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --ip-range 192.168.1.200/29 \
  --aux-address host=192.168.1.206 \
  --opt parent=eth0 \
  lan_macvlan
```

## Using the Macvlan Network in a Stack

If you prefer to define the macvlan network in the stack itself, assign a specific IP to each container:

```yaml
services:
  pihole:
    image: pihole/pihole:latest
    hostname: pihole
    networks:
      lan_macvlan:
        ipv4_address: 192.168.1.201   # Fixed LAN IP for Pi-hole
    environment:
      TZ: America/New_York
      FTLCONF_webserver_api_password: adminpassword
      FTLCONF_dns_listeningMode: 'ALL'
      FTLCONF_misc_etc_dnsmasq_d: 'true'
    volumes:
      - pihole_data:/etc/pihole
      - dnsmasq_data:/etc/dnsmasq.d

  adguard:
    image: adguard/adguardhome:latest
    hostname: adguard
    networks:
      lan_macvlan:
        ipv4_address: 192.168.1.202   # Different LAN IP for AdGuard
    volumes:
      - adguard_data:/opt/adguardhome/work
      - adguard_conf:/opt/adguardhome/conf

volumes:
  pihole_data:
  dnsmasq_data:
  adguard_data:
  adguard_conf:

networks:
  lan_macvlan:
    driver: macvlan
    driver_opts:
      parent: eth0
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
          ip_range: 192.168.1.200/29
          aux_addresses:
            host: 192.168.1.206
```

## Accessing Containers from the Host

A limitation of macvlan is that the host cannot directly communicate with containers on the macvlan network; this is a restriction in the Linux kernel. Reserve one address for the host (for example `192.168.1.206`) and create a macvlan interface to work around this:

```bash
# Create a host-side macvlan interface to communicate with containers
sudo ip link add macvlan0 link eth0 type macvlan mode bridge
sudo ip addr add 192.168.1.206/32 dev macvlan0
sudo ip link set macvlan0 up

# Add a route to the container IP range
sudo ip route add 192.168.1.200/29 dev macvlan0
```

## 802.1Q VLAN Tagging

For setups with VLAN-tagged traffic, use a dot-notation parent. Docker creates the VLAN sub-interface automatically:

```bash
# Docker interprets eth0.100 as VLAN 100 on eth0
docker network create \
  --driver macvlan \
  --opt parent=eth0.100 \
  --subnet 192.168.100.0/24 \
  --gateway 192.168.100.1 \
  vlan100_net
```

## When to Use Macvlan vs Bridge

| Scenario | Use |
|----------|-----|
| Container needs a LAN IP | Macvlan |
| Avoid NAT for specific services | Macvlan |
| Normal app stack | Bridge |
| Containers communicate with each other only | Bridge with internal |
| Swarm multi-host | Overlay |
