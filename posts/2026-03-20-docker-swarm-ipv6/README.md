# How to Configure Docker Swarm with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Swarm, IPv6, Overlay Network, Cluster, Multi-Host

Description: Configure Docker Swarm clusters with IPv6 support, create IPv6-enabled overlay networks for swarm services, and enable container communication over IPv6 across swarm nodes.

## Introduction

IPv6 networking in Docker Engine is supported on Linux hosts. Docker Swarm overlay networks can be created with IPv6 enabled, and these networks span multiple hosts. Overlay networks in Swarm use VXLAN encapsulation and can carry IPv6 traffic between containers on different nodes. Swarm services deployed on IPv6-enabled overlay networks receive IPv6 addresses in addition to their IPv4 addresses.

## Prepare Each Swarm Node

```bash
# Initialize Swarm (manager node)
docker swarm init --advertise-addr 192.168.1.10

# Join workers (on each worker node)
docker swarm join --token <token> 192.168.1.10:2377
```

## Create IPv6 Overlay Network

```bash
# Create overlay network with IPv6 (run on manager node)
docker network create \
    --driver overlay \
    --attachable \
    --ipv6 \
    --subnet 10.1.0.0/24 \
    --subnet 2001:db8:1::/64 \
    --gateway 10.1.0.1 \
    --gateway 2001:db8:1::1 \
    swarm-overlay-net

# Verify network
docker network inspect swarm-overlay-net | grep -A10 "IPAM"

# List overlay networks
docker network ls --filter driver=overlay
```

## Deploy Services on IPv6 Overlay Network

```bash
# Deploy web service with IPv6 (run on a manager node)
docker service create \
    --name web \
    --network swarm-overlay-net \
    --replicas 3 \
    --publish published=80,target=80 \
    nginx:latest

# Check service tasks
docker service ps web

# On a node currently running a web task, inspect one task container
CONTAINER_ID=$(docker ps -q --filter label=com.docker.swarm.service.name=web | head -1)
docker inspect --format '{{range .NetworkSettings.Networks}}{{println "IPv4:" .IPAddress}}{{println "IPv6:" .GlobalIPv6Address}}{{end}}' "$CONTAINER_ID"
```

## Docker Stack with IPv6

```yaml
# stack.yaml

version: "3.9"

networks:
  webnet:
    external: true
    name: webnet

  appnet:
    external: true
    name: appnet

services:
  nginx:
    image: nginx:latest
    networks:
      - webnet
    deploy:
      replicas: 3
    ports:
      - "80:80"

  api:
    image: myapi:latest
    networks:
      - webnet
      - appnet
    deploy:
      replicas: 2

  db:
    image: postgres:15
    networks:
      - appnet
    deploy:
      replicas: 1
```

```bash
# Create the overlay networks (run on a manager node)
docker network create \
    --driver overlay \
    --ipv6 \
    --subnet 10.2.0.0/24 \
    --subnet 2001:db8:2::/64 \
    --gateway 10.2.0.1 \
    --gateway 2001:db8:2::1 \
    webnet

docker network create \
    --driver overlay \
    --ipv6 \
    --subnet 10.2.1.0/24 \
    --subnet 2001:db8:3::/64 \
    --gateway 10.2.1.1 \
    --gateway 2001:db8:3::1 \
    appnet

# Deploy the stack (run on a manager node)
docker stack deploy -c stack.yaml mystack

# Check services
docker stack services mystack

# On a node running an nginx task, inspect one task container
CONTAINER_ID=$(docker ps -q --filter label=com.docker.swarm.service.name=mystack_nginx | head -1)
docker inspect --format '{{range .NetworkSettings.Networks}}{{println "IPv4:" .IPAddress}}{{println "IPv6:" .GlobalIPv6Address}}{{end}}' "$CONTAINER_ID"
```

## Verify IPv6 Connectivity Across Swarm Nodes

```bash
# On a node currently running a web task, get one task container's IPv6 address
CONTAINER_ID=$(docker ps -q --filter label=com.docker.swarm.service.name=web | head -1)
CONTAINER_IPV6=$(docker inspect --format '{{range .NetworkSettings.Networks}}{{if .GlobalIPv6Address}}{{.GlobalIPv6Address}}{{end}}{{end}}' "$CONTAINER_ID")

echo "Container IPv6: $CONTAINER_IPV6"

# On a different swarm node, attach a test container to the overlay network
docker run --rm --network swarm-overlay-net alpine \
    ping -6 -c 3 "$CONTAINER_IPV6"
```

## Conclusion

Docker Swarm supports IPv6 overlay networks by creating the overlay network with `docker network create --driver overlay --ipv6`. Services deployed on an IPv6-enabled Swarm overlay network receive IPv6 addresses alongside IPv4. For `docker stack deploy`, create the IPv6 overlay networks first and reference them as external networks in the stack file. If you also want Docker to auto-allocate IPv6 subnets for the default bridge or other local networks, configure those daemon options separately in `daemon.json`.
