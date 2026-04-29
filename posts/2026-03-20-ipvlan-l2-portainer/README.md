# How to Configure IPvlan L2 Mode for Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, IPvlan, Networking, LAN, Advanced Networking

Description: Configure IPvlan L2 mode networks to give containers direct LAN access while sharing the host's MAC address, managed through Portainer.

## Introduction

IPvlan is similar to Macvlan but all containers share the host's MAC address. In L2 mode, containers get unique IP addresses on your LAN while using the same MAC address as the host interface. This works better in environments where MAC address filtering is enforced (cloud VMs, strict enterprise networks). This guide covers deploying IPvlan L2 via Portainer.

## IPvlan vs Macvlan

| Feature | Macvlan | IPvlan L2 |
|---------|---------|-----------|
| MAC address | Each container has its own | Shared with host |
| IP address | Unique LAN IP | Unique LAN IP |
| Host-container communication | Requires workaround | Same workaround needed |
| Cloud/VM compatibility | May be blocked | Better compatibility |
| Switch port security | Issues possible | Works in most environments |

## Prerequisites

```bash
# Check kernel version (IPvlan requires kernel 4.2+)

uname -r

# Verify network interface
ip link show
```

## Step 1: Create IPvlan L2 Network

```bash
# Create IPvlan L2 network
# Containers share host's MAC but get unique IPs
docker network create \
  --driver ipvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  --ip-range=192.168.1.192/27 \
  --opt ipvlan_mode=l2 \
  --opt parent=eth0 \
  ipvlan_l2

# Verify network was created
docker network inspect ipvlan_l2
```

## Step 2: Create in Portainer

In Portainer: **Networks** > **Add network**
- Name: `ipvlan_l2`
- Driver: `ipvlan`
- Driver options:
  - `ipvlan_mode`: `l2`
  - `parent`: `eth0`
- Subnet: `192.168.1.0/24`
- Gateway: `192.168.1.1`
- IP Range: `192.168.1.192/27` (gives IPs .193-.222)

## Step 3: Deploy Containers on IPvlan L2

```yaml
# docker-compose.yml - IPvlan L2 deployment
networks:
  ipvlan_l2:
    external: true  # Created beforehand

services:
  # Service with dedicated LAN IP
  dns_server:
    image: pihole/pihole:latest
    container_name: pihole_ipvlan
    restart: unless-stopped
    networks:
      ipvlan_l2:
        ipv4_address: 192.168.1.200  # Dedicated LAN IP
    environment:
      - FTLCONF_webserver_api_password=secure_password
      - FTLCONF_dns_upstreams=1.1.1.1;9.9.9.9
    volumes:
      - /opt/pihole/etc:/etc/pihole
      - /opt/pihole/dnsmasq:/etc/dnsmasq.d
    cap_add:
      - NET_ADMIN

  # NTP server on LAN
  ntpserver:
    image: cturra/ntp:latest
    container_name: ntp_server
    restart: unless-stopped
    networks:
      ipvlan_l2:
        ipv4_address: 192.168.1.201  # NTP server IP
    environment:
      - NTP_SERVERS=pool.ntp.org

  # MQTT broker on LAN (for IoT)
  mosquitto:
    image: eclipse-mosquitto:latest
    container_name: mosquitto
    restart: unless-stopped
    networks:
      ipvlan_l2:
        ipv4_address: 192.168.1.202  # MQTT broker IP
    volumes:
      - /opt/mosquitto/config:/mosquitto/config
      - /opt/mosquitto/data:/mosquitto/data
```

## Step 4: Configure Router DHCP Exclusions

Exclude the IPvlan range from your router's DHCP server to prevent conflicts:

```text
Router DHCP Configuration:
- DHCP pool: 192.168.1.10 - 192.168.1.190
- Keep outside the DHCP pool: 192.168.1.192 - 192.168.1.223
  - .1: Router
  - .192 - .222: Docker IPvlan containers
  - .223: Host IPvlan interface
```

## Step 5: Host-to-Container Communication

Like Macvlan, you need a sub-interface for host-to-container communication:

```bash
# Create IPvlan sub-interface for host
ip link add ipvlan_host link eth0 type ipvlan mode l2
ip addr add 192.168.1.223/32 dev ipvlan_host
ip link set ipvlan_host up

# Add route to IPvlan subnet
ip route add 192.168.1.192/27 dev ipvlan_host

# Test
ping 192.168.1.200  # Should reach Pi-hole container now
```

## Step 6: Compare IPvlan L2 vs Bridge Network

```yaml
# Same application deployed two ways

# Via Bridge Network (port mapping required)
services:
  app_bridge:
    image: myapp:latest
    ports:
      - "8080:80"   # Must expose port
    networks:
      - bridge_net

networks:
  bridge_net:
    driver: bridge

---

# Via IPvlan L2 (direct LAN IP)
services:
  app_ipvlan:
    image: myapp:latest
    # No port mapping needed!
    networks:
      ipvlan_l2:
        ipv4_address: 192.168.1.205

networks:
  ipvlan_l2:
    external: true
```

Access via bridge: `http://HOST_IP:8080`

Access via IPvlan L2: `http://192.168.1.205:80` directly

## Verify IPvlan Configuration

```bash
# Check that container shares host MAC address
docker exec pihole_ipvlan ip link show eth0
# Should show the HOST's MAC address (same as host)

# Compare with host MAC
ip link show eth0

# Verify LAN accessibility from another device
ping 192.168.1.200

# Check routing
docker exec pihole_ipvlan ip route
```

## Conclusion

IPvlan L2 provides a great alternative to Macvlan when you're in a MAC-restricted environment. Containers get real LAN IP addresses and are accessible directly from any device on your network without port mapping, while sharing the host's MAC address avoids issues with MAC address filtering and port security policies. Portainer manages these containers like any others - you get logs, stats, and restart capabilities from the same dashboard.
