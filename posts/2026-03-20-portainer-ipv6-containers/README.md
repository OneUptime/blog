# How to Set Up IPv6 for Containers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, IPv6, Docker Networking, Network Configuration, Container Networking

Description: Learn how to enable and configure IPv6 for Docker containers in Portainer, including global daemon settings and per-network IPv6 configuration.

---

On Linux, Docker supports IPv6 for containers. For user-defined networks used by Portainer stacks, you enable IPv6 on the network itself; the `ipv6` and `fixed-cidr-v6` daemon settings are for Docker's default `bridge` network.

## Step 1: Enable IPv6 for Docker's Default Bridge

Edit `/etc/docker/daemon.json` on the host:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00::/64",
  "ip6tables": true
}
```

Restart Docker after changing daemon config:

```bash
sudo systemctl restart docker
```

The `fixed-cidr-v6` range shown here is a ULA (Unique Local Address) subnet - suitable for internal container networking on the default bridge. Use a routed public IPv6 prefix only if you specifically need globally routable container addresses.

## Step 2: Create an IPv6-Enabled Network

Create a network with an IPv6 subnet:

```bash
docker network create \
  --driver bridge \
  --ipv6 \
  --subnet 172.28.0.0/16 \
  --subnet fd00:100::/64 \
  --gateway fd00:100::1 \
  ipv6_net
```

Or in Portainer's **Networks > Add network**, under **IPv6 Network configuration**:

- Set **IPv6 Subnet**: `fd00:100::/64`
- Set **IPv6 Gateway**: `fd00:100::1`

## Step 3: Use IPv6 Networks in a Stack

```yaml
services:
  api:
    image: my-api:latest
    networks:
      - ipv6_net

  web:
    image: nginx:alpine
    networks:
      - ipv6_net
    ports:
      - "80:80"
      - "443:443"

networks:
  ipv6_net:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.28.0.0/16
        - subnet: fd00:100::/64
          gateway: fd00:100::1
```

## Verifying IPv6 Connectivity

```bash
# Check the container's IPv6 address

docker inspect $(docker ps -qf name=api) | \
  jq '.[0].NetworkSettings.Networks[].GlobalIPv6Address'

# Test IPv6 connectivity from inside the container
docker exec -it $(docker ps -qf name=web) ping -6 -c 4 fd00:100::1

# Test connectivity between containers using IPv6
docker exec -it $(docker ps -qf name=web) ping -6 -c 4 api
```

## Nginx Listening on IPv6

Configure Nginx to accept both IPv4 and IPv6 connections:

```nginx
server {
    listen 80;
    listen [::]:80;         # IPv6 listener
    listen 443 ssl;
    listen [::]:443 ssl;    # IPv6 SSL listener

    server_name example.com;
    # ...
}
```

## IPv6 with Macvlan (Global IPv6 Addresses)

For containers that need globally routable IPv6 addresses from your ISP prefix:

```bash
# Assuming your ISP assigned 2001:db8::/48 to your router
# And your Docker host is on 2001:db8:0:1::/64

docker network create \
  --driver macvlan \
  --opt parent=eth0 \
  --subnet 2001:db8:0:1::/64 \
  --gateway 2001:db8:0:1::1 \
  --ipv6 \
  global_ipv6_net
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Container has no IPv6 address | IPv6 not enabled on the user-defined network | Create the network with `--ipv6` or add `enable_ipv6: true` |
| Cannot reach the IPv6 gateway | Invalid IPv6 subnet or gateway configuration | Recreate the network with a valid IPv6 subnet and gateway, or omit the gateway and let Docker choose one |
| IPv6 works internally but not externally | Required ports are not published, or external routing to the container subnet is missing | Publish the required ports, or configure direct routing to the container subnet |
| External IPv6 reachability disappears after restart | Static routes were added manually and not persisted | Persist the route on the host or upstream router with your network manager |
