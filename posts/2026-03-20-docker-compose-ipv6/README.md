# How to Create Docker Compose Services with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, IPv6, Networking, Service

Description: Configure Docker Compose services with IPv6 networking, define IPv6 subnets in Compose network definitions, and connect multi-container applications over IPv6.

## Introduction

Docker Compose supports IPv6 networking through the `networks` configuration in `compose.yaml` on Docker daemons running on Linux hosts. You define IPv6 subnets in the network's `ipam` configuration and set `enable_ipv6: true`. Services connected to IPv6 networks receive IPv6 addresses automatically. This enables containerized applications to communicate over IPv6 both within Compose and with external IPv6 networks.

## Basic Docker Compose with IPv6

```yaml
# compose.yaml

networks:
  webnet:
    driver: bridge
    enable_ipv6: true
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
        - subnet: fd00:1234:5678:1::/64
          gateway: fd00:1234:5678:1::1

services:
  web:
    image: nginx:latest
    networks:
      - webnet
    ports:
      - "80:80"  # Publishes on both IPv4 and IPv6 by default

  app:
    image: busybox:1.36
    command: ["sh", "-c", "tail -f /dev/null"]
    networks:
      - webnet
```

## Full Stack with Multiple IPv6 Networks

```yaml
# compose.yaml - production-grade dual-stack setup

networks:
  frontend:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.21.1.0/24
        - subnet: fd00:1234:5678:2::/64

  backend:
    driver: bridge
    enable_ipv6: true
    internal: true  # Externally isolated network
    ipam:
      config:
        - subnet: 172.21.2.0/24
        - subnet: fd00:1234:5678:3::/64

services:
  nginx:
    image: nginx:latest
    networks:
      - frontend
    ports:
      - "80:80"
      - "443:443"

  api:
    image: busybox:1.36
    command: ["sh", "-c", "tail -f /dev/null"]
    networks:
      - frontend
      - backend
    environment:
      - DB_HOST=db

  db:
    image: postgres:15
    networks:
      - backend
    environment:
      - POSTGRES_PASSWORD=secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Assign Static IPv6 Address to a Service

```yaml
# compose.yaml - static IPv6 assignment

networks:
  appnet:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.22.0.0/24
        - subnet: fd00:1234:5678:4::/64

services:
  web:
    image: nginx:latest
    networks:
      appnet:
        ipv4_address: 172.22.0.10
        ipv6_address: fd00:1234:5678:4::10

  db:
    image: redis:7
    networks:
      appnet:
        ipv4_address: 172.22.0.20
        ipv6_address: fd00:1234:5678:4::20
```

## Verify IPv6 in Running Compose Services

```bash
# Start the stack

docker compose up -d

# Check service IPv6 addresses
docker inspect --format='{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}' "$(docker compose ps -q web)"

# Inspect the network
docker network inspect <project>_webnet | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('EnableIPv6:', data[0]['EnableIPv6'])
for name, info in data[0]['Containers'].items():
    print(f'Container: {info[\"Name\"]} IPv6: {info.get(\"IPv6Address\", \"none\")}')
"

# Test IPv6 connectivity between services
docker compose exec app ping -6 -c 3 web

# Test IPv6 access to the published service from the host
curl http://[::1]:80
```

## Conclusion

Configure IPv6 in Docker Compose by setting `enable_ipv6: true` and defining an IPv6 subnet in the `ipam.config` section of each network. Use ULA prefixes (`fd00::/8`) for internal networks. Set `internal: true` on backend networks to create an externally isolated network. Assign static IPv6 addresses with `ipv6_address` in the service network config. Test IPv6 connectivity with commands such as `docker compose exec app ping -6 web` and `curl http://[::1]:80`.
