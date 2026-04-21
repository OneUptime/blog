# How to Troubleshoot Cross-Network Container Communication in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, Troubleshooting, DNS, Connectivity, Debugging

Description: Diagnose and fix cross-container networking issues in Portainer, including DNS resolution failures, connectivity problems between networks, and firewall interference.

---

Container networking issues are among the most common problems in Docker deployments. This guide provides systematic debugging steps for diagnosing cross-network communication failures in Portainer.

## Common Symptoms

- `connection refused` - service is not running or wrong port
- `no such host` - DNS resolution failure
- `connection timed out` - firewall or wrong network
- `network xxx not found` - container not on expected network

## Step 1: Verify Container Status

Check that both containers are running and healthy in Portainer's container list:

```bash
docker ps | grep -E "container-a|container-b"
# Both should show "Up" status and "healthy" if health checks are configured

```

## Step 2: Check Network Membership

Containers need a shared Docker network for direct communication by container or service name:

```bash
# List networks a container is connected to
docker inspect container-a --format "{{json .NetworkSettings.Networks}}" | jq 'keys'

# List all containers on a specific network
docker network inspect my-network --format "{{range .Containers}}{{.Name}} {{end}}"

# Check if two containers share any network
docker inspect container-a | jq '.[0].NetworkSettings.Networks | keys'
docker inspect container-b | jq '.[0].NetworkSettings.Networks | keys'
```

## Step 3: Test DNS Resolution

From inside a container, test if the target service name resolves:

```bash
# Use Portainer's container console or docker exec
docker exec container-a nslookup target-service
# Or
docker exec container-a getent hosts target-service

# Expected output:
# Server: 127.0.0.11 (Docker's embedded DNS on custom networks)
# Name: target-service
# Address: 172.18.0.x
```

Common DNS issue: containers on different networks cannot resolve each other's names.

## Step 4: Test TCP Connectivity

After DNS resolves, test TCP connectivity:

```bash
# Test if port is reachable
docker exec container-a nc -zv target-service 8080
# Connection to target-service 8080 port [tcp] succeeded!

# Test with curl
docker exec container-a curl -v http://target-service:8080/health
```

## Step 5: Check Firewall Rules

On Linux hosts using Docker's iptables backend, host firewall rules can interfere with Docker networking:

```bash
# Check iptables rules affecting Docker
sudo iptables -L DOCKER -n --line-numbers
sudo iptables -L DOCKER-USER -n --line-numbers

# Check for DROP policies or rules in the FORWARD chain
sudo iptables -L FORWARD -n | grep DROP
```

## Step 6: Inspect Network Configuration

Look for misconfigured subnets or gateway conflicts:

```bash
# Inspect the network configuration
docker network inspect my-network

# Check for subnet conflicts
docker network ls --format "{{.Name}}" | \
  xargs -I {} docker network inspect {} --format "{{.Name}}: {{range .IPAM.Config}}{{.Subnet}}{{end}}"
```

## Fixing Common Issues

### Issue: Containers on different networks

```yaml
# Fix: Add the missing container to the correct network
services:
  container-a:
    networks:
      - shared-net

  container-b:
    networks:
      - shared-net    # Add this - was missing before

networks:
  shared-net:
    driver: bridge
```

### Issue: Container using default bridge (no DNS)

The default `bridge` network doesn't support automatic container-name DNS. Move containers to a custom network:

```yaml
# Fix: Always use custom named networks
networks:
  my-app-net:    # Custom network with DNS support
    driver: bridge
```

### Issue: Cross-stack communication

```yaml
# Fix: Use external network to share between stacks
# Stack A creates it:
networks:
  shared:
    name: my-shared-net

# Stack B joins it:
networks:
  shared:
    external: true
    name: my-shared-net
```

## Summary

Cross-network container communication issues usually fall into three categories: containers on different networks, DNS resolution failures, or host firewall interference. Systematic testing with `nslookup`, `nc`, and `iptables` inspection helps isolate the root cause. The most common fix is ensuring both services share the same custom Docker network.
