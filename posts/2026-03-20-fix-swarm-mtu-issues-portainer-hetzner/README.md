# How to Fix Swarm MTU Issues with Portainer on Hetzner

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker Swarm, Portainer, MTU, Hetzner, Networking, Troubleshooting

Description: Learn how to diagnose and fix MTU mismatch issues that cause network failures in Docker Swarm deployments on Hetzner Cloud.

## The Problem: MTU Mismatches on Hetzner

Hetzner Cloud private networks use an MTU of **1450 bytes** (the public interface remains **1500 bytes**). If a Docker Swarm overlay network is created without matching that lower MTU, larger packets can be dropped and connectivity between Swarm services can fail in hard-to-diagnose ways.

Symptoms include:
- Services timing out randomly
- Large payloads failing while small ones succeed
- DNS resolution working but HTTP requests hanging

## Diagnosing the Issue

```bash
# Check the MTU of your host interfaces
ip addr

# Check whether the ingress network was created with an explicit MTU option
docker network inspect ingress --format '{{json .Options}}'

# Probe the path MTU on a Hetzner private network
ping -c 1 -M do -s 1422 <target-ip>
ping -c 1 -M do -s 1423 <target-ip>
```

## Fix 1: Configure Docker Daemon MTU for Bridge Networks

Edit `/etc/docker/daemon.json` if you also want Docker's default `bridge` network on the host to use MTU 1450:

```json
{
  "mtu": 1450
}
```

Apply the change:

```bash
# Restart Docker to apply the new MTU setting
sudo systemctl restart docker
```

This Docker daemon `mtu` setting applies to the default `bridge` network. Swarm overlay networks still need `com.docker.network.driver.mtu` set explicitly.

## Fix 2: Set MTU Per Network in Compose File

You can set the MTU on individual overlay networks in your stack's Compose file:

```yaml
version: "3.8"

services:
  web:
    image: nginx:alpine
    networks:
      - hetzner-net

networks:
  hetzner-net:
    driver: overlay
    driver_opts:
      # Match Hetzner's network MTU to avoid packet fragmentation
      com.docker.network.driver.mtu: "1450"
```

## Fix 3: Re-Create the Ingress Network

If your Swarm was already initialized before the MTU was fixed, re-create the default ingress network:

```bash
# Remove the old ingress network (services that publish ports must be removed first)
docker network rm ingress

# Re-create ingress with the correct MTU
docker network create \
  --driver overlay \
  --ingress \
  --opt com.docker.network.driver.mtu=1450 \
  ingress
```

## Verifying the Fix

```bash
# Confirm the overlay network now has the correct MTU
docker network inspect ingress --format '{{json .Options}}'

# From a container that has ping installed, probe the path MTU
docker exec -it <container-id> ping -c 1 -M do -s 1422 <other-container-ip>
docker exec -it <container-id> ping -c 1 -M do -s 1423 <other-container-ip>
```

## Conclusion

MTU mismatches are a common and frustrating issue on Hetzner Cloud. On Hetzner private networks, always set `com.docker.network.driver.mtu=1450` on your Swarm overlay networks and re-create `ingress` if it was created with the wrong MTU. If you also use Docker bridge networks on the host, set the daemon `mtu` to `1450` there as well.
