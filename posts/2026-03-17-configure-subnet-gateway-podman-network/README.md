# How to Configure Subnet and Gateway for a Podman Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Subnets, Gateway, IP

Description: Learn how to configure custom subnets and gateways for Podman networks to control container IP addressing.

---

> Custom subnets and gateways give you precise control over container IP addressing, preventing conflicts with existing network infrastructure.

By default, Podman assigns subnets automatically. However, in production environments you often need to specify exact subnets and gateways to integrate with existing network infrastructure, avoid IP conflicts, and ensure predictable addressing.

---

## Setting a Custom Subnet and Gateway

```bash
# Create a network with specific subnet and gateway

podman network create \
  --subnet 10.50.0.0/24 \
  --gateway 10.50.0.1 \
  custom-net

# Verify the configuration
podman network inspect custom-net --format '{{ range .Subnets }}Subnet: {{ .Subnet }}, Gateway: {{ .Gateway }}{{ end }}'
```

## Configuring IP Range

Restrict the pool of assignable container IPs within the subnet:

```bash
# Limit container IPs to a specific range within the subnet
podman network create \
  --subnet 10.50.0.0/24 \
  --gateway 10.50.0.1 \
  --ip-range 10.50.0.100-10.50.0.254 \
  ranged-net

# Containers will get IPs from 10.50.0.100 to 10.50.0.254
podman run -d --name app1 --network ranged-net \
  docker.io/library/alpine:latest tail -f /dev/null

podman inspect app1 --format '{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}'
```

## Multiple Subnets

```bash
# Create networks with different subnets for different purposes
podman network create --subnet 10.10.0.0/24 --gateway 10.10.0.1 frontend-net
podman network create --subnet 10.20.0.0/24 --gateway 10.20.0.1 backend-net
podman network create --subnet 10.30.0.0/24 --gateway 10.30.0.1 database-net

# Verify all subnets
for net in frontend-net backend-net database-net; do
  subnet=$(podman network inspect "$net" --format '{{ range .Subnets }}{{ .Subnet }}{{ end }}')
  echo "$net: $subnet"
done
```

## Avoiding Subnet Conflicts

```bash
# Check existing network subnets before creating new ones
podman network ls --format "{{ .Name }}" | while read -r net; do
  subnet=$(podman network inspect "$net" --format '{{ range .Subnets }}{{ .Subnet }}{{ end }}')
  echo "$net: $subnet"
done

# Check host network ranges to avoid conflicts
ip route show
```

## Using /16 Subnets

```bash
# Large subnet for many containers
podman network create \
  --subnet 172.30.0.0/16 \
  --gateway 172.30.0.1 \
  large-net

# Containers get IPs from 172.30.0.2 to 172.30.255.254
podman run -d --name big-app --network large-net \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Assigning Static IPs Within the Subnet

```bash
# Create a network and assign a specific IP to a container
podman network create --subnet 10.50.0.0/24 --gateway 10.50.0.1 static-net

podman run -d --name db \
  --network static-net \
  --ip 10.50.0.10 \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

podman run -d --name cache \
  --network static-net \
  --ip 10.50.0.11 \
  docker.io/library/redis:latest

# Verify assigned IPs
podman inspect db --format '{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}'
podman inspect cache --format '{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}'
```

## Dual-Stack Subnet Configuration

```bash
# Create a network with both IPv4 and IPv6 subnets
podman network create \
  --subnet 10.60.0.0/24 \
  --gateway 10.60.0.1 \
  --ipv6 \
  --subnet fd00:10:60::/64 \
  --gateway fd00:10:60::1 \
  dual-stack-net
```

## Summary

Configure custom subnets and gateways with `--subnet` and `--gateway` when creating Podman networks. Use `--ip-range` to restrict the assignable IP pool, and `--ip` to assign static addresses to individual containers. Always check existing subnets and host routes to avoid conflicts. Use different networks with different subnets for different application tiers to enforce network isolation.
