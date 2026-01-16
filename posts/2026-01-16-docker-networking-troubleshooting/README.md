# How to Troubleshoot Docker Container Networking Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, Troubleshooting, DNS, DevOps

Description: Learn how to diagnose and fix common Docker networking problems including DNS resolution failures, container connectivity issues, port binding errors, and network isolation problems.

---

Docker networking issues can be frustrating because containers seem isolated from normal debugging tools. Understanding Docker's networking model and having the right diagnostic commands makes troubleshooting much easier.

## Docker Network Basics

```
Docker Network Architecture

┌─────────────────────────────────────────────────────────────┐
│                        Host                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  docker0 bridge                      │    │
│  │                   172.17.0.1                         │    │
│  │     ┌───────────┐     ┌───────────┐                 │    │
│  │     │ Container │     │ Container │                 │    │
│  │     │ 172.17.0.2│     │ 172.17.0.3│                 │    │
│  │     └───────────┘     └───────────┘                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                     NAT / Port Mapping                       │
│                           │                                  │
│                    Host Port 8080 ──────► Container 80       │
└─────────────────────────────────────────────────────────────┘
```

## Diagnostic Commands

### Check Container Network Settings

```bash
# View container's network configuration
docker inspect --format='{{json .NetworkSettings}}' mycontainer | jq

# Get container IP address
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mycontainer

# List container's ports
docker port mycontainer
```

### Check Docker Networks

```bash
# List all networks
docker network ls

# Inspect a network
docker network inspect bridge

# See which containers are on a network
docker network inspect bridge -f '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{println}}{{end}}'
```

## Container Cannot Reach Internet

### Symptoms

```bash
docker exec mycontainer ping google.com
# ping: google.com: Temporary failure in name resolution
```

### Diagnostic Steps

```bash
# Check DNS resolution
docker exec mycontainer cat /etc/resolv.conf

# Try IP directly (bypass DNS)
docker exec mycontainer ping 8.8.8.8

# Check routing
docker exec mycontainer ip route
```

### Solutions

#### DNS Issues

```bash
# Run with custom DNS
docker run --dns 8.8.8.8 myimage

# Or configure daemon-wide
# /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}
sudo systemctl restart docker
```

#### Firewall Blocking Docker

```bash
# Check iptables rules
sudo iptables -L -n | grep -i docker

# Reset Docker iptables rules
sudo systemctl restart docker

# On firewalld systems
sudo firewall-cmd --zone=docker --add-masquerade --permanent
sudo firewall-cmd --reload
```

#### IP Forwarding Disabled

```bash
# Check IP forwarding
cat /proc/sys/net/ipv4/ip_forward
# Should be 1

# Enable if disabled
sudo sysctl -w net.ipv4.ip_forward=1

# Make permanent
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
```

## Container-to-Container Communication Issues

### Containers on Same Network Cannot Connect

```bash
# Verify containers are on same network
docker network inspect mynetwork

# Test connectivity by IP
docker exec container1 ping 172.18.0.3

# Test by container name (should work on custom networks)
docker exec container1 ping container2
```

### Solutions

```bash
# Create custom network (enables DNS by name)
docker network create mynetwork

# Run containers on same network
docker run -d --name container1 --network mynetwork myimage
docker run -d --name container2 --network mynetwork myimage

# Now they can reach each other by name
docker exec container1 ping container2
```

### Containers on Default Bridge Network

```bash
# Default bridge doesn't support DNS by name
# Must use --link (deprecated) or IP addresses

# Better: Use custom network
docker network create app-network
docker run -d --name db --network app-network postgres
docker run -d --name app --network app-network -e DB_HOST=db myapp
```

## Port Binding Issues

### Port Already in Use

```bash
docker run -p 8080:80 nginx
# Error: Bind for 0.0.0.0:8080 failed: port is already allocated
```

#### Find What's Using the Port

```bash
# Linux
sudo lsof -i :8080
sudo netstat -tlnp | grep 8080
ss -tlnp | grep 8080

# Find Docker container using port
docker ps --format "{{.Names}}: {{.Ports}}" | grep 8080
```

#### Solutions

```bash
# Use different host port
docker run -p 8081:80 nginx

# Stop conflicting container
docker stop conflicting-container

# Kill process using port
sudo kill $(sudo lsof -t -i:8080)
```

### Cannot Access Container from Host

```bash
# Container running but not accessible
curl http://localhost:8080
# Connection refused
```

#### Diagnostic Steps

```bash
# Check port mapping
docker port mycontainer
# 80/tcp -> 0.0.0.0:8080

# Check container is running
docker ps

# Check application is listening inside container
docker exec mycontainer netstat -tlnp
docker exec mycontainer ss -tlnp

# Check if app binds to 0.0.0.0 not 127.0.0.1
docker exec mycontainer cat /etc/nginx/nginx.conf | grep listen
```

#### Common Fix: App Listening on Wrong Interface

```bash
# App binds to 127.0.0.1 (localhost only)
# Change to bind to 0.0.0.0 (all interfaces)

# Example for Node.js
app.listen(3000, '0.0.0.0')

# Example for Flask
app.run(host='0.0.0.0', port=5000)
```

## DNS Resolution Issues

### Container DNS Not Working

```bash
docker exec mycontainer nslookup google.com
# ;; connection timed out; no servers could be reached
```

### Check DNS Configuration

```bash
# View resolv.conf
docker exec mycontainer cat /etc/resolv.conf

# Check host DNS
cat /etc/resolv.conf
```

### Solutions

```bash
# Specify DNS server
docker run --dns 8.8.8.8 --dns 8.8.4.4 myimage

# Docker Compose
services:
  app:
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

### Internal DNS (Service Discovery)

```bash
# On custom networks, Docker provides DNS for container names
docker network create mynet
docker run -d --name db --network mynet postgres
docker run -d --name app --network mynet myapp

# Inside app container:
# db resolves to db container's IP

# For docker-compose, service names are DNS names automatically
```

## Network Isolation Issues

### Container Needs Host Network Access

```bash
# Use host network mode (no isolation)
docker run --network host myimage

# Container shares host's network stack
# No port mapping needed, app binds directly to host ports
```

### Container Needs to Access Host Services

```bash
# Access host from container
# Linux: Use host.docker.internal (Docker 20.10+)
docker run --add-host host.docker.internal:host-gateway myimage

# Inside container:
curl http://host.docker.internal:3000

# Or use host's IP
HOST_IP=$(ip route | grep default | awk '{print $3}')
docker run -e HOST_IP=$HOST_IP myimage
```

### Docker Compose Host Access

```yaml
services:
  app:
    image: myimage
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

## Network Performance Issues

### Slow Network in Containers

```bash
# Test network speed
docker run --rm networkstatic/iperf3 -c iperf.he.net

# Compare with host network
docker run --rm --network host networkstatic/iperf3 -c iperf.he.net
```

### Optimize Network

```bash
# Use host network for performance-critical apps
docker run --network host myapp

# Increase MTU if needed
docker network create --opt com.docker.network.driver.mtu=9000 high-perf
```

## Debugging Tools

### Install Network Tools in Container

```bash
# Alpine
docker exec mycontainer apk add --no-cache curl bind-tools iputils

# Debian/Ubuntu
docker exec mycontainer apt-get update && apt-get install -y curl dnsutils iputils-ping net-tools
```

### Use nicolaka/netshoot for Debugging

```bash
# Attach debugging container to target's network namespace
docker run --rm -it --network container:mycontainer nicolaka/netshoot

# Now you have full networking tools available
ping google.com
nslookup db
tcpdump -i eth0
```

### Debug Compose Networks

```bash
# List compose networks
docker network ls | grep myproject

# Attach debug container to compose network
docker run --rm -it --network myproject_default nicolaka/netshoot
```

## Quick Reference

| Issue | Command | Solution |
|-------|---------|----------|
| Find container IP | `docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' container` | - |
| DNS not working | `docker exec container cat /etc/resolv.conf` | Use `--dns 8.8.8.8` |
| Cannot reach internet | `docker exec container ping 8.8.8.8` | Check iptables, ip_forward |
| Port in use | `sudo lsof -i :PORT` | Change port or stop process |
| Container-to-container | Create custom network | `docker network create mynet` |
| Access host from container | - | Use `host.docker.internal` |

## Summary

| Problem | First Check | Likely Solution |
|---------|-------------|-----------------|
| No internet | Can ping IP but not hostname | DNS issue - add `--dns` |
| Port not accessible | App binds to 127.0.0.1 | Bind to 0.0.0.0 |
| Containers can't communicate | Same network? | Create custom network |
| DNS by container name fails | Using default bridge | Switch to custom network |
| General debugging | - | Use nicolaka/netshoot container |

Docker networking issues usually fall into a few categories: DNS configuration, port binding, network isolation, and firewall rules. Custom networks solve most container-to-container communication problems, and explicitly setting DNS servers fixes most resolution issues.

