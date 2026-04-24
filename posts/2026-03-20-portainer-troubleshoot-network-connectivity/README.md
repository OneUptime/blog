# How to Troubleshoot Container Network Connectivity in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, Troubleshooting, DevOps

Description: Learn how to diagnose and fix container network connectivity issues in Portainer using systematic debugging techniques.

## Introduction

Container networking issues are among the most common problems in Docker environments. Symptoms range from containers that cannot reach each other by name, to services that are unreachable from the host, to containers with no internet access. This guide provides a systematic approach to diagnosing and resolving these issues using Portainer's UI and Docker CLI tools.

## Prerequisites

- Portainer installed with a connected Docker environment
- Basic familiarity with Docker networking concepts

## Common Network Issues

| Symptom | Likely Cause |
|---------|-------------|
| Container can't reach another by name | Different networks or default bridge |
| Container can't reach the internet | Firewall rules, IP masquerade disabled |
| Host can't reach container | Port not exposed or wrong binding |
| Port binding conflict | Another process using the same port |
| Intermittent connectivity | MTU mismatch, packet loss |

## Step 1: Verify Both Containers Are on the Same Network

```bash
# Check which networks a container is on:

docker inspect container1 --format '{{range $net, $_ := .NetworkSettings.Networks}}{{$net}} {{end}}'
docker inspect container2 --format '{{range $net, $_ := .NetworkSettings.Networks}}{{$net}} {{end}}'

# If different networks, connect one:
docker network connect shared-network container1

# List all containers on a network:
docker network inspect my-network | jq '.[].Containers | to_entries[] | {name: .value.Name, ip: .value.IPv4Address}'
```

## Step 2: Test Connectivity with a Debug Container

Deploy a debugging container on the same network:

```bash
# Run a temporary debug container on the problematic network:
# Image with networking troubleshooting tools
docker run -it --rm \
  --network my-network \
  --name debug \
  nicolaka/netshoot \
  /bin/bash

# Inside the debug container:
# Test DNS resolution:
nslookup my-service
dig my-service

# Test TCP connectivity:
curl -v http://my-service:8080/health
nc -zv my-service 8080

# Test ICMP (ping):
ping -c 3 my-service

# Traceroute:
traceroute my-service
```

## Step 3: Check Container Port Exposure

```bash
# Verify a container is listening on the expected port:
docker exec my-container ss -tlnp
# or:
docker exec my-container netstat -tlnp

# Check port bindings on the host:
docker port my-container
# 8080/tcp -> 0.0.0.0:8080

# Test from the host:
curl http://localhost:8080/health

# If not reachable, check if the port is bound to 0.0.0.0 (all interfaces) or 127.0.0.1 (localhost only):
docker inspect my-container --format '{{json .NetworkSettings.Ports}}'
```

## Step 4: Check iptables Rules

On Linux hosts using Docker's default `iptables` firewall backend, incorrect firewall rules cause connectivity failures. If your host uses Docker's `nftables` backend instead, inspect `nftables` rules rather than `iptables`:

```bash
# List Docker's iptables chains:
sudo iptables -L DOCKER-USER -n
sudo iptables -L DOCKER-FORWARD -n
sudo iptables -L DOCKER -n

# Check NAT rules (required for internet access on bridge networks):
sudo iptables -t nat -L DOCKER -n

# If Docker-managed rules are missing, restart Docker:
sudo systemctl restart docker

# Check if IP masquerade (NAT) is enabled for a network:
docker network inspect my-network | jq '.[].Options'
# "com.docker.network.bridge.enable_ip_masquerade": "true"
```

## Step 5: Diagnose MTU Issues

MTU mismatches cause packet drops for large payloads while small requests succeed:

```bash
# Check MTU on Docker's default bridge interface (docker0):
ip link show docker0 | grep mtu
# mtu 1500

# Test with progressively larger payloads without allowing fragmentation:
docker exec my-container ping -M do -c 5 -s 1400 8.8.8.8   # Likely works
docker exec my-container ping -M do -c 5 -s 1472 8.8.8.8   # May fail if MTU issue

# Fix: Create a network with lower MTU (useful in VPN/overlay environments):
docker network create \
  --driver bridge \
  --opt com.docker.network.driver.mtu=1450 \
  low-mtu-network
```

## Step 6: Check for Port Conflicts

```bash
# Check if host port is already in use:
sudo ss -tlnp | grep :8080
# or:
sudo lsof -i :8080

# If Docker can't bind a port, check what's using it:
sudo fuser 8080/tcp

# Kill the conflicting process or change the container port mapping:
docker run -p 8081:8080 my-image   # Map to different host port
```

## Step 7: Common Fixes Summary

```bash
# Fix 1: Containers on different networks - connect them:
docker network connect shared-net container-a

# Fix 2: Default bridge (no DNS) - recreate on custom network:
docker network create app-net
docker stop my-app && docker rm my-app
docker run -d --network app-net --name my-app my-image

# Fix 3: No internet from container - check forwarding:
sudo sysctl net.ipv4.ip_forward
# Should be 1; if 0:
sudo sysctl -w net.ipv4.ip_forward=1

# Fix 4: Restart Docker networking if badly misconfigured:
sudo systemctl restart docker

# Fix 5: If Docker-managed firewall rules were changed manually, let Docker recreate them:
# Avoid flushing Docker-created chains by hand.
sudo systemctl restart docker
```

## Conclusion

Systematic troubleshooting starts with verifying both containers share the same custom network (not the default bridge), then testing connectivity with a debug container, checking firewall rules and port bindings, and investigating MTU mismatches for intermittent failures. The `nicolaka/netshoot` image is the most complete debugging toolkit - deploy it on any Docker network for comprehensive diagnostics. Most connectivity issues resolve by ensuring containers are on the same custom bridge network and that Docker's firewall rules are intact.
