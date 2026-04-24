# How to Fix MAC Address Collisions in Docker Compose via Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Docker Compose, Troubleshooting, Networking

Description: Resolve MAC address collision errors in Docker Compose stacks deployed via Portainer, which cause containers to fail with network conflicts on recreate operations.

## Introduction

MAC address collisions in Docker occur when multiple containers are assigned the same MAC address on the same network. This most often happens when containers are recreated from a compose file that explicitly sets `mac_address` values, or when the same static MAC address is reused across multiple deployments. Portainer stack recreations are a common trigger.

## Understanding MAC Address Collisions

Docker automatically assigns MAC addresses to containers. Problems arise when:
1. A compose file explicitly sets `mac_address` and the same address is reused on the same network
2. The same compose file is deployed multiple times with duplicate static MAC addresses
3. Macvlan deployments or other manually managed network settings introduce duplicate MACs on the same Layer 2 network

## Step 1: Identify the Error

```bash
# Look for MAC address errors in Portainer logs

docker logs portainer 2>&1 | grep -i "mac\|address already\|ARP"

# Check Docker daemon logs
journalctl -u docker | grep -i "mac\|duplicate\|conflict" | tail -20

# Check recent container stop/die events
docker events --filter event=die --since 1h | head -20
```

## Step 2: Find Containers with Explicit MAC Addresses

```bash
# Find compose files with explicit MAC addresses
grep -r "mac_address" /path/to/your/compose-files/ 2>/dev/null

# List all containers with their network names and MAC addresses
docker ps -aq | xargs -r docker inspect \
  --format '{{.Name}}: {{range $network, $cfg := .NetworkSettings.Networks}}{{$network}}={{$cfg.MacAddress}} {{end}}' | sort

# Find duplicate MACs on the same network
docker ps -aq | xargs -r docker inspect \
  --format '{{range $network, $cfg := .NetworkSettings.Networks}}{{println $network $cfg.MacAddress}}{{end}}' | sort | uniq -d
```

## Step 3: Fix - Remove Explicit MAC Addresses from Compose Files

The simplest fix is to let Docker assign MAC addresses automatically:

```yaml
# BEFORE (problematic - causes collision on recreation)
services:
  myapp:
    image: myapp:latest
    networks:
      mynet:
        mac_address: "02:42:ac:11:00:02"  # Remove this

networks:
  mynet:

# AFTER (correct - Docker auto-assigns unique MAC)
services:
  myapp:
    image: myapp:latest
    networks:
      - mynet

networks:
  mynet:
```

In Portainer, remove the `mac_address` entries and redeploy. If the stack is Git-backed, make the same change in the repository and redeploy from Git.

## Step 4: Fix - Assign Unique MAC Addresses

If you need explicit MAC addresses (e.g., for DHCP reservations), ensure uniqueness:

```yaml
services:
  app1:
    image: myapp:latest
    networks:
      mynet:
        # Use a unique, locally administered MAC address
        mac_address: "02:42:ac:11:00:10"

  app2:
    image: myapp:latest
    networks:
      mynet:
        mac_address: "02:42:ac:11:00:11"  # Different last octet

  app3:
    image: myapp:latest
    networks:
      mynet:
        mac_address: "02:42:ac:11:00:12"

networks:
  mynet:
```

## Step 5: Fix - Reset the Network

If MAC collisions have left a stale network behind, remove the stack and recreate it. `docker compose down` already removes Compose-managed networks, so only run `docker network rm` if the network still exists:

```bash
# Stop all containers using the network
docker compose down

# If the network still exists, remove it manually
docker network rm stack-name_network-name

# Recreate by bringing the stack back up
docker compose up -d
```

## Step 6: Fix via Portainer Stack Redeploy

In Portainer:
1. Go to **Stacks** → select the affected stack
2. If the stack was deployed with the **Web Editor**, click **Editor** and remove/fix `mac_address` entries
3. If the stack was deployed from Git, update the Compose file in the repository, then use **Pull and redeploy** (or detach the stack from Git if you need to edit it in Portainer)
4. Click **Update the stack** for Web Editor stacks, or redeploy the Git-backed stack
5. Enable **Re-pull image** if you also want Portainer to pull fresh images during the redeploy

## Step 7: Check for Host Network MAC Conflicts

```bash
# Check the host's network interfaces
ip link show

# Check the Docker bridge interface
ip link show docker0

# Inspect the default bridge network
docker network inspect bridge
```

Conflicts between `docker0` and a physical interface are rare. If you review `/etc/docker/daemon.json`, remember that `bip` and `fixed-cidr` change bridge IP/subnet allocation, not container MAC assignment, so they are not a standard fix for Compose MAC collisions.

## Step 8: Handle Macvlan Networks

Macvlan networks expose containers directly on the physical network, so any static MAC addresses must be unique on that Layer 2 segment:

```yaml
# When using macvlan, ensure all containers have unique MACs
networks:
  macvlan-net:
    driver: macvlan
    driver_opts:
      parent: eth0
    ipam:
      driver: default
      config:
        - subnet: "192.168.1.0/24"
          gateway: "192.168.1.1"

services:
  myapp:
    image: myapp:latest
    networks:
      macvlan-net:
        # For macvlan, MAC must be unique on the physical network
        mac_address: "02:42:c0:a8:01:10"
        ipv4_address: "192.168.1.100"
```

## Step 9: Monitor for Future Conflicts

```bash
# Script to check for MAC duplicates periodically
#!/bin/bash
# check-mac-duplicates.sh

CONTAINERS=$(docker ps -aq)

if [ -z "$CONTAINERS" ]; then
  echo "OK: No containers to inspect"
  exit 0
fi

MACS=$(docker inspect $CONTAINERS \
  --format '{{range $network, $cfg := .NetworkSettings.Networks}}{{println $network $cfg.MacAddress $.Name}}{{end}}' 2>/dev/null)

DUPLICATE_MACS=$(echo "$MACS" | awk '{print $1 " " $2}' | sort | uniq -d)

if [ -n "$DUPLICATE_MACS" ]; then
  echo "WARNING: Duplicate MAC addresses detected on the same network:"
  echo "$DUPLICATE_MACS"
  echo ""
  echo "Containers with these network/MAC pairs:"
  while IFS= read -r duplicate; do
    echo "$MACS" | grep -F "$duplicate"
  done <<< "$DUPLICATE_MACS"
else
  echo "OK: No duplicate MAC addresses"
fi
```

## Conclusion

MAC address collisions in Docker Compose stacks deployed via Portainer are most commonly caused by explicitly set `mac_address` values in compose files that get reused on the same network during redeploys. The simplest fix is to remove explicit MAC addresses and let Docker auto-assign them. If MAC assignment is required for DHCP reservations or macvlan networking, ensure each container has a genuinely unique MAC address.
