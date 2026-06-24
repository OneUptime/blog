# How to Use ULA Addresses for Internal Docker Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, ULA, Unique Local Address, Internal Networks, RFC 4193

Description: Configure Docker networks with RFC 4193 Unique Local Addresses (ULA) for private container-to-container communication, understand ULA structure, and generate unique ULA prefixes for your Docker...

## Introduction

Unique Local Addresses (ULA) in the `fd00::/8` range are the recommended address space for Docker private networks. Like RFC 1918 IPv4 addresses, ULA addresses are not globally routable and are suitable for internal container communication. Each Docker host or environment should use a unique ULA prefix to avoid conflicts in multi-host or VPN-connected setups. ULA prefixes are generated with a pseudo-random 40-bit global ID to provide a high probability of uniqueness.

## Generate a ULA Prefix

```python
#!/usr/bin/env python3
# generate_ula.py - Generate a pseudo-random ULA /48 prefix for Docker

import os
import binascii

def generate_ula():
    # Generate 5 random bytes (40-bit global ID)
    global_id = os.urandom(5)
    hex_id = binascii.hexlify(global_id).decode()

    # Format as ULA prefix: fd + global_id (40 bits) + ::/48
    prefix = "fd{0}:{1}:{2}::/48".format(
        hex_id[0:2],
        hex_id[2:6],
        hex_id[6:10]
    )
    return prefix

print("Generated ULA /48 prefix:", generate_ula())
# Example output: fd3a:1b2c:4d5e::/48

```

```bash
# Alternative: use python3 one-liner
python3 -c "
import os, binascii
b = os.urandom(5)
h = binascii.hexlify(b).decode()
print('fd%s:%s:%s::/48' % (h[0:2], h[2:6], h[6:10]))
"
```

## Configure Docker Networks with ULA

```json
{
  "ipv6": true,
  "ip6tables": true,
  "fixed-cidr-v6": "fd3a:1b2c:4d5e::/64",
  "default-address-pools": [
    {"base": "172.20.0.0/16", "size": 24},
    {"base": "fd3a:1b2c:4d5e:100::/56", "size": 64}
  ]
}
```

```bash
# Restart Docker after updating daemon.json
sudo systemctl restart docker

# Create named networks using ULA subnets from your /48
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 172.20.1.0/24 \
    --subnet fd3a:1b2c:4d5e:1::/64 \
    web-net

docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 172.20.2.0/24 \
    --subnet fd3a:1b2c:4d5e:2::/64 \
    --internal \
    db-net
```

## Docker Compose with ULA Addresses

```yaml
# compose.yaml - ULA-based IPv6 networking

networks:
  frontend:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.20.1.0/24
        - subnet: fd3a:1b2c:4d5e:1::/64

  backend:
    driver: bridge
    enable_ipv6: true
    internal: true
    ipam:
      config:
        - subnet: 172.20.2.0/24
        - subnet: fd3a:1b2c:4d5e:2::/64

services:
  web:
    image: nginx:latest
    networks:
      - frontend

  api:
    image: traefik/whoami:latest
    networks:
      - frontend
      - backend

  db:
    image: postgres:15
    networks:
      backend:
        ipv6_address: fd3a:1b2c:4d5e:2::20
```

## Benefits of ULA vs Globally Routable Addresses

```text
ULA (fd00::/8):
  + No registration required
  + Not globally routable on the internet
  + Stable across deployments
  + Works offline / in air-gapped environments
  + Free to use, no coordination needed
  - Not reachable from internet (by design)
  - Need NAT or proxy for internet access

Globally Routable:
  + Can be routed on the internet
  + No NAT needed
  - Requires a registered prefix
  - Accidental firewall misconfiguration = internet exposure
  - May not be available in all environments
```

## Conclusion

Use ULA addresses from the `fd00::/8` range for all internal Docker container networks. Generate a pseudo-random 40-bit global ID to create your own `/48` prefix using the Python snippet above. Carve `/64` subnets from your `/48` for each Docker network, and use consecutive subnet numbers for organization (`:1::/64` for web, `:2::/64` for database, etc.). ULA addresses provide private IPv6 networking that is not globally routable, making them ideal for internal Docker container communication when combined with normal port-publishing and firewall controls.
