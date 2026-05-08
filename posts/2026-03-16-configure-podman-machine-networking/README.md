# How to Configure Podman Machine Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps, Networking

Description: Learn how to configure networking for Podman machines including port forwarding, custom networks, DNS settings, and host-to-container communication.

---

> Proper network configuration ensures your containers can communicate with each other, the host, and external services.

Podman machine networking connects the virtual machine to your host network and determines how containers reach the outside world. Understanding these networking layers helps you configure port forwarding, inter-container communication, and DNS resolution. This guide covers the essential networking configurations.

---

## Default Networking

Podman machines come with networking configured out of the box. Containers can reach the internet, and port forwarding maps container ports to the host.

```bash
# Start a machine and test basic connectivity

podman machine start my-machine

# Run a container and verify internet access
podman run --rm alpine ping -c 3 google.com

# Run a container with port forwarding
podman run -d --name web -p 8080:80 nginx

# Access from the host
curl http://localhost:8080
```

## User Mode Networking

User mode networking uses a userspace network stack (gvproxy) instead of a kernel-level bridge. On macOS and Linux, user-mode networking is always enabled because these providers depend on gvproxy. The `--user-mode-networking` flag is only meaningful on Windows with the WSL backend, where it defaults to false.

```bash
# On Windows/WSL, create a machine with user mode networking
podman machine init --user-mode-networking my-machine

# Check if user mode networking is enabled
podman machine inspect my-machine | jq '.[0].UserModeNetworking'
```

User mode networking is simpler but has some limitations compared to bridge networking. It does not support connecting to the machine from other hosts on your network. It is useful in VPN configurations where the VPN may drop traffic from alternate network interfaces.

## Port Forwarding

Port forwarding maps container ports to the host machine, making services accessible.

```bash
# Forward a single port
podman run -d -p 8080:80 nginx

# Forward multiple ports
podman run -d -p 8080:80 -p 8443:443 nginx

# Forward to a specific host interface
podman run -d -p 127.0.0.1:8080:80 nginx

# Forward a range of ports
podman run -d -p 3000-3005:3000-3005 myapp

# Use a random host port
podman run -d -p 80 nginx
podman port <container-id>  # Shows the assigned port
```

## Creating Custom Networks

Custom networks allow containers to communicate by name:

```bash
# Create a custom bridge network
podman network create app-network

# Create a network with a specific subnet
podman network create --subnet 10.89.0.0/24 custom-net

# List networks
podman network ls

# Inspect a network
podman network inspect app-network
```

## Container-to-Container Communication

Use custom networks for containers that need to talk to each other:

```bash
# Create a shared network
podman network create backend

# Start a database container
podman run -d --name postgres \
    --network backend \
    -e POSTGRES_PASSWORD=secret \
    postgres:16

# Start an application container on the same network
podman run -d --name api \
    --network backend \
    -e DATABASE_HOST=postgres \
    -p 3000:3000 \
    myapi:latest

# The api container can reach postgres by name
podman exec api ping -c 2 postgres
```

## DNS Configuration

Configure DNS for containers that need custom name resolution:

```bash
# Run a container with custom DNS servers
podman run --rm --dns 8.8.8.8 --dns 8.8.4.4 alpine nslookup google.com

# Run with a custom DNS search domain
podman run --rm --dns-search example.com alpine nslookup myservice

# Add custom host entries
podman run --rm --add-host myhost:192.168.1.100 alpine ping -c 1 myhost
```

## Accessing Host Services from Containers

Containers often need to connect to services running on the host.

```bash
# Use host.containers.internal to reach the host (Podman equivalent of host.docker.internal)
podman run --rm alpine ping -c 2 host.containers.internal

# Or use the --add-host flag
podman run --rm --add-host host.local:host-gateway alpine ping -c 1 host.local

# Connect to a host service from a container
# If the host runs a service on port 5432:
podman run --rm alpine sh -c "nc -zv host.containers.internal 5432"
```

## Network Isolation

Isolate containers that should not have external access:

```bash
# Create an internal-only network
podman network create --internal isolated-net

# Containers on this network cannot reach the internet
podman run -d --name internal-service --network isolated-net alpine sleep 3600

# Verify: this should fail
podman exec internal-service ping -c 1 google.com

# But internal communication works
podman run -d --name internal-client --network isolated-net alpine sleep 3600
podman exec internal-client ping -c 1 internal-service
```

## Configuring Machine-Level Networking

For advanced networking, you can configure settings inside the Podman machine:

```bash
# SSH into the machine
podman machine ssh my-machine

# View network interfaces
ip addr show

# Check routing table
ip route

# Check DNS configuration
cat /etc/resolv.conf

# Exit
exit
```

## Troubleshooting Network Issues

```bash
# Test container internet connectivity
podman run --rm alpine ping -c 3 8.8.8.8

# Test DNS resolution
podman run --rm alpine nslookup google.com

# Check port forwarding is working
podman port my-container

# List active networks and connected containers
podman network ls
podman network inspect app-network | jq '.[].Containers'

# Check for port conflicts on the host
# macOS:
lsof -i :8080
# Linux:
ss -tlnp | grep 8080
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman run -p 8080:80 ...` | Forward port to host |
| `podman network create <name>` | Create a custom network |
| `podman run --network <name> ...` | Attach container to network |
| `podman run --dns 8.8.8.8 ...` | Set custom DNS |
| `podman network inspect <name>` | View network details |

## Summary

Podman machine networking involves multiple layers: the VM network connecting the machine to the host, port forwarding mapping container ports to host ports, and container networks enabling inter-container communication. Use custom networks for service-to-service communication, port forwarding for external access, and internal networks for isolation. Understanding these layers helps you build secure and well-connected container environments.
