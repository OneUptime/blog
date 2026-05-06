# How to Configure a Docker Bridge Network Subnet and Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, Bridge, Subnets, Gateway

Description: Configure the subnet, gateway, and IP allocation range for a Docker bridge network using docker network create and the IPAM driver options.

## Introduction

Docker bridge networks use IPAM (IP Address Management) to define the subnet and gateway. Properly configuring these ensures containers get predictable addresses, avoids conflicts with existing networks, and allows you to plan the IP space before deploying services.

## Creating a Bridge Network with Subnet and Gateway

```bash
# Basic subnet + gateway

docker network create \
  --driver bridge \
  --subnet 10.10.0.0/24 \
  --gateway 10.10.0.1 \
  prod-network
```

## Configuring Multiple IPAM Pools

A `bridge` network supports only a single subnet. If you need multiple subnets in one Docker network, use an `overlay` network or another driver that supports multiple IPAM configurations.

## Restricting the IP Allocation Range

`--ip-range` restricts which addresses Docker automatically assigns (while the full subnet is still routable):

```bash
# Subnet is /24, but auto-assign from the upper half of the subnet
docker network create \
  --driver bridge \
  --subnet 10.10.0.0/24 \
  --gateway 10.10.0.1 \
  --ip-range 10.10.0.128/25 \
  controlled-network
```

Addresses outside the `ip-range` but still inside the subnet can still be manually assigned with `--ip`.

## Disabling IPv6 Entirely

IPv6 address assignment is disabled by default on a user-defined bridge network unless you enable it with `--ipv6`:

```bash
docker network create \
  --driver bridge \
  --subnet 10.10.0.0/24 \
  --gateway 10.10.0.1 \
  ipv4-only-network
```

## Inspecting Network Configuration

```bash
# Full network details including IPAM configuration
docker network inspect controlled-network

# Show just the IPAM section
docker network inspect controlled-network \
  --format '{{json .IPAM}}' | python3 -m json.tool
```

Output:

```json
{
  "Driver": "default",
  "Config": [
    {
      "Subnet": "10.10.0.0/24",
      "Gateway": "10.10.0.1",
      "IPRange": "10.10.0.128/25"
    }
  ]
}
```

## Docker Compose Network with Full IPAM Configuration

```yaml
networks:
  prod-net:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 10.10.0.0/24
          gateway: 10.10.0.1
          ip_range: 10.10.0.128/25
          aux_addresses:
            reserved-host: 10.10.0.5
```

The `aux_addresses` field reserves specific IPs so Docker does not allocate them to containers.

## Common Subnet Planning

| Environment | Suggested Range |
|---|---|
| Development | 172.20.0.0/24 |
| Staging | 172.21.0.0/24 |
| Production | 10.100.0.0/24 |
| Database tier | 10.100.1.0/24 |

## Conclusion

Define subnet and gateway at network creation time using `--subnet` and `--gateway`. Use `--ip-range` to partition the pool for auto-assignment while keeping the rest available for static assignment. Inspect with `docker network inspect` to verify IPAM configuration before deploying services.
