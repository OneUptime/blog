# How to Fix Swarm MTU Issues with Portainer on Hetzner - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Networking, MTU, Hetzner, DevOps

Description: Learn how to diagnose and fix MTU-related networking issues in Docker Swarm deployments on Hetzner Cloud infrastructure.

## Introduction

Hetzner Cloud private networking uses an MTU of 1450 bytes. If your Swarm nodes communicate over that private network and your overlay networks are still using Docker Swarm's default MTU of 1500, you can run into intermittent connectivity issues between services. Symptoms include services that can ping each other but fail on larger payloads, or services that work fine initially but fail under load. This guide explains the root cause and how to fix it.

## The Problem

Hetzner Cloud private network interfaces have an MTU of 1450 bytes, while Docker Swarm overlay networks use an MTU of 1500 by default. This mismatch means:

1. Packets larger than 1450 bytes can be dropped or fragmented on the path between Swarm nodes
2. Many protocols and applications don't handle fragmentation well
3. This causes intermittent failures for larger HTTP requests, database queries, or API calls

## Symptoms

- Services can reach each other intermittently
- Small requests succeed, large requests fail
- Containers or Swarm services timeout randomly
- `ping` works but `curl` fails with large responses
- gRPC connections drop unexpectedly

## Diagnosis

```bash
# Check current MTU on the interface used for Swarm traffic
ip addr
# Look for the private interface (for example ens10) and note mtu 1450

# Check overlay network MTU
docker network inspect ingress --format '{{json .Options}}'

# Test with PMTU discovery
ping -c 1 -M do -s 1422 <remote-private-ip>   # 1422 + 28 byte IP/ICMP header = 1450
ping -c 1 -M do -s 1423 <remote-private-ip>   # 1423 + 28 = 1451, above Hetzner's private-network MTU

# If 1422 succeeds and 1423 fails, you have confirmed the 1450-byte path MTU
```

## Step 1: Know What the Docker Daemon MTU Setting Changes

The `mtu` setting in `/etc/docker/daemon.json` applies to Docker's default `bridge` network for standalone containers. It does **not** retroactively change existing Swarm overlay networks. For Swarm, the important fix is to recreate the ingress and user-defined overlay networks with the correct MTU in the next steps.

## Step 2: Recreate the Overlay Networks

Existing overlay networks keep their old MTU. You must recreate them:

```bash
# Run these commands on a swarm manager

# List all overlay networks
docker network ls --filter driver=overlay

# Remove services using the networks first, then remove and recreate
# WARNING: This is disruptive; schedule maintenance
# Docker also recommends ensuring all nodes run the same Docker Engine version
# before removing and recreating the ingress network

# Remove the default ingress network
docker network rm ingress

# Recreate with correct MTU
docker network create \
  --driver overlay \
  --ingress \
  --opt com.docker.network.driver.mtu=1450 \
  ingress

# Recreate custom overlay networks
docker network rm my-overlay-net
docker network create \
  --driver overlay \
  --opt com.docker.network.driver.mtu=1450 \
  my-overlay-net
```

## Step 3: Configure MTU in Compose/Stack Files

For Portainer stacks, specify MTU in the networks section:

```yaml
version: "3.8"

services:
  web:
    image: nginx:alpine
    networks:
      - app-net

  api:
    image: myapi:latest
    networks:
      - app-net

networks:
  app-net:
    driver: overlay
    driver_opts:
      com.docker.network.driver.mtu: "1450"    # Match Hetzner private-network MTU
```

## Step 4: Configure MTU for New Swarm Stacks in Portainer

When deploying stacks via Portainer on Docker Swarm, set the MTU in the Compose file's `networks` section. Portainer deploys Swarm stacks using `docker stack deploy`, so the network definition in the stack file is where you set the MTU for new overlay networks.

1. Open your stack in Portainer
2. Edit the Compose file to add MTU driver options to each overlay network
3. Click **Update the stack**

## Step 5: Configure Docker Bridge Network MTU

If you also run standalone containers on Docker's default `bridge` network, align that network separately:

```bash
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "mtu": 1450
}
EOF

sudo systemctl restart docker
```

## Step 6: Verify the Fix

```bash
# Check new MTU on overlay network
docker network inspect ingress --format '{{json .Options}}'
# Should show: {"com.docker.network.driver.mtu":"1450"}

# Test connectivity with large packets between services
# From inside a container:
ping -c 1 -M do -s 1422 other-service    # 1422 + 28 = 1450
```

## Step 7: Automate MTU Configuration with Cloud Init

For new Hetzner servers that will join the Swarm, you can preconfigure the default bridge MTU automatically. Swarm overlay networks still need `com.docker.network.driver.mtu: 1450` when you create them:

```yaml
# cloud-init.yml for new Hetzner VMs
#cloud-config
write_files:
  - path: /etc/docker/daemon.json
    content: |
      {
        "mtu": 1450,
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "10m",
          "max-file": "3"
        }
      }

runcmd:
  - systemctl restart docker
```

## Other Cloud Providers with MTU Issues

Similar issues can occur on any provider when the path MTU between Swarm nodes is lower than the MTU configured on the overlay networks. Check the actual interface MTU on the nodes you use for Swarm traffic instead of assuming one provider-wide value.

## Alternative: Use a Private Network

Hetzner private networks are a good option for Swarm node-to-node communication. Attach all nodes to the same private network and use private IPs for Swarm traffic. Hetzner private interfaces use MTU 1450, so set your Swarm overlay networks to 1450 as shown above:

```bash
# After attaching each node to the same Hetzner private network,
# use private IPs for Swarm control and data traffic
docker swarm init --advertise-addr <private-ip> --data-path-addr <private-ip>
docker swarm join --token ... --advertise-addr <private-ip> --data-path-addr <private-ip> <manager-private-ip>:2377
```

## Conclusion

MTU mismatches are a common but easily overlooked cause of intermittent networking issues in Docker Swarm on Hetzner. If your swarm uses Hetzner private networking, the core fix is to recreate the ingress and user-defined overlay networks with MTU `1450` and to keep that value in your stack definitions going forward. If you also run standalone containers on Docker's default bridge network, align the daemon MTU there as well. Once configured, your Swarm services will have reliable networking for all payload sizes.
