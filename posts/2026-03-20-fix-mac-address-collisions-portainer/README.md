# How to Fix MAC Address Collisions in Docker Compose via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, MAC Address, Docker Compose, Networking, Macvlan

Description: Learn how to fix MAC address collision errors in Docker Compose stacks deployed via Portainer, particularly relevant for macvlan networks and static MAC assignments.

---

MAC address collisions in Docker occur when two containers or network interfaces are assigned the same MAC address. This is most common with macvlan networks or when manually specifying MAC addresses in Compose files.

## When MAC Collisions Occur

- Manually setting `mac_address` in Compose without ensuring uniqueness
- Cloning a VM or host and redeploying the same macvlan or static network settings on the same Layer-2 network

## Diagnosing a Collision

```bash
# Check if a stack failed with MAC-related errors

# Replace "portainer" if your Portainer container uses a different name
docker logs portainer 2>&1 | grep -i "mac\|duplicate\|collision"

# Or check Docker events
docker events --filter type=network --since 5m

# Check MAC addresses currently in use on a network
# Replace macvlan_net with the network name used by your stack
docker network inspect macvlan_net | python3 -c "
import json, sys
data = json.load(sys.stdin)
for net in data:
    for cid, info in (net.get('Containers') or {}).items():
        print(f'{info[\"Name\"]}: {info[\"MacAddress\"]}')"
```

## Fixing Manual MAC Address Conflicts in Compose

If your Compose file assigns a MAC explicitly, generate a unique locally administered unicast address:

```bash
# Generate a random MAC address with the locally-administered bit set
python3 -c "
import random
mac = [0x02,                    # Locally administered unicast
       random.randint(0x00, 0xff),
       random.randint(0x00, 0xff),
       random.randint(0x00, 0xff),
       random.randint(0x00, 0xff),
       random.randint(0x00, 0xff)]
print(':'.join(f'{b:02x}' for b in mac))
"
```

Update the Compose YAML in Portainer with the new MAC using the network attachment syntax:

```yaml
services:
  myservice:
    image: myimage
    networks:
      macvlan_net:
        # Use a unique MAC for each container on macvlan networks
        mac_address: "02:42:ac:11:00:02"
```

## Fixing Macvlan IP Pool Overlap

For macvlan networks, define an explicit IP allocation range to reduce address overlap:

```yaml
networks:
  macvlan_net:
    driver: macvlan
    driver_opts:
      parent: eth0
    ipam:
      config:
        - subnet: 192.168.1.0/24
          ip_range: 192.168.1.200/28    # Only assign from .200-.215
          gateway: 192.168.1.1
```

## Preventing Collisions When Cloning Hosts

When cloning a VM that runs Docker with macvlan interfaces, do not reuse the same static `mac_address` or `ipv4_address` values on the same Layer-2 network. Update the stack definition in Portainer and redeploy it; the CLI equivalent is:

```bash
# Stop and remove the existing stack containers
docker compose down

# After updating any static mac_address / ipv4_address values, recreate the stack
docker compose up -d
```
