# How to Configure Docker Daemon Default Address Pools for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, daemon.json, Address Pool, Configuration

Description: Configure Docker daemon default address pools in /etc/docker/daemon.json to control which IPv4 subnets are used when creating new bridge networks without an explicit subnet.

## Introduction

When you run `docker network create` without specifying a subnet, Docker picks from its default address pool. Configuring `default-address-pools` in `daemon.json` ensures Docker chooses subnets from a range you control, preventing conflicts with your existing network infrastructure.

## Configuring daemon.json

```bash
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "default-address-pools": [
    {
      "base": "10.200.0.0/16",
      "size": 24
    },
    {
      "base": "10.201.0.0/16",
      "size": 24
    }
  ]
}
EOF
```

- `base`: the parent range from which Docker will carve subnets
- `size`: the prefix length of each allocated subnet (24 = /24)

With this config, new networks are allocated from these pools in `/24` blocks. For example, `docker network create mynet` can allocate `10.200.0.0/24`, then `10.200.1.0/24`, and so on.

## Applying the Configuration

```bash
sudo systemctl restart docker

# Verify by creating a network without specifying a subnet

docker network create test-pool
docker network inspect test-pool --format '{{(index .IPAM.Config 0).Subnet}}'
# Example output: 10.200.0.0/24
```

## Combining bip and address pools

```json
{
  "bip": "192.168.90.1/24",
  "default-address-pools": [
    {
      "base": "10.200.0.0/16",
      "size": 24
    }
  ]
}
```

- `bip`: sets the IPv4 address and subnet for the default `docker0` bridge
- `default-address-pools`: supplies subnets for new bridge networks when you do not set `--subnet`

## Multiple Pools for Different Purposes

```json
{
  "default-address-pools": [
    {
      "base": "10.200.0.0/16",
      "size": 24
    },
    {
      "base": "10.201.0.0/16",
      "size": 28
    }
  ]
}
```

Docker allocates subnets from the configured pools. Use `/28` subnets for tiny networks to conserve address space, but remember Docker also assigns a gateway address inside that subnet.

## Viewing Current Address Pool Allocation

```bash
# See all networks and their subnets
docker network ls --format '{{.Name}}' | xargs -I {} docker network inspect {} --format '{{.Name}}: {{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

## Planning Address Pool Sizes

| Use Case | Recommended base | size |
|---|---|---|
| General purpose | 10.200.0.0/16 | 24 |
| Microservices with many networks | 10.200.0.0/14 | 24 |
| Small test networks | 10.201.0.0/16 | 28 |

## Conclusion

Configure `default-address-pools` in `/etc/docker/daemon.json` to direct Docker to your preferred IPv4 ranges when creating bridge networks without explicit subnets. This is especially important in environments where `172.16.0.0/12` or `192.168.0.0/16` ranges conflict with VPN or corporate infrastructure.
