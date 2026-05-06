# How to Change the Default Docker Bridge Network IPv4 Subnet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, Bridge, daemon.json, Configuration

Description: Change the default IPv4 subnet used by Docker's docker0 bridge network by configuring the bip option in /etc/docker/daemon.json to avoid conflicts with existing network ranges.

## Introduction

Docker's default bridge (`docker0`) uses `172.17.0.0/16` by default. This conflicts with many corporate VPNs and internal networks that also use the `172.16.0.0/12` range. Changing the default bridge IP (bip) resolves these conflicts.

## Modifying daemon.json

Edit or create `/etc/docker/daemon.json`:

```bash
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "bip": "192.168.90.1/24",
  "default-address-pools": [
    {
      "base": "192.168.91.0/24",
      "size": 24
    }
  ]
}
EOF
```

- `bip` (Bridge IP): sets the IP address and subnet for the `docker0` bridge
- `default-address-pools`: controls the subnets used for new custom bridge networks

## Restarting Docker

```bash
# Restart Docker to apply the change

sudo systemctl restart docker

# Verify docker0 now uses the new subnet
ip addr show docker0
```

Expected output:

```text
inet 192.168.90.1/24 brd 192.168.90.255 scope global docker0
```

## Verifying the Default Network IPAM

```bash
docker network inspect bridge | grep -A 10 '"IPAM"'
```

Output should show the new subnet:

```json
"Config": [
    {
        "Subnet": "192.168.90.0/24",
        "Gateway": "192.168.90.1"
    }
]
```

## Impact on Running Containers

**Warning:** Changing the default bridge subnet requires stopping containers attached to the default bridge network. Containers attached only to custom user-defined networks are not affected.

```bash
# Save the IDs of running containers on the default bridge
bridge_containers="$(docker ps -q --filter network=bridge)"

# Stop those containers before applying the change
if [ -n "$bridge_containers" ]; then
  docker stop $bridge_containers
fi

# Apply the change
sudo systemctl restart docker

# Start the same containers again
if [ -n "$bridge_containers" ]; then
  docker start $bridge_containers
fi
```

## Choosing a Safe Subnet

Choose a subnet that does not overlap with:
- Your LAN subnet (e.g., 192.168.1.0/24)
- VPN ranges (often 10.0.0.0/8 or 172.16.0.0/12)
- AWS, Azure, or GCP VPC ranges

Safe choices for `docker0`:
- `192.168.90.0/24`
- `10.200.0.0/24`
- `192.168.240.0/24`

## Conclusion

Change `bip` in `/etc/docker/daemon.json` to move the default `docker0` bridge to a non-conflicting subnet. Restart Docker to apply the change. For new custom networks, `default-address-pools` controls what subnets are used when no explicit subnet is specified.
