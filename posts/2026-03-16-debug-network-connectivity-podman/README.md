# How to Debug Network Connectivity in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Debugging, Networking

Description: A practical guide to diagnosing and fixing network connectivity problems in Podman containers, covering port mapping, bridge networks, firewall rules, and rootless networking.

---

> Most container networking issues boil down to three things: port mapping mistakes, firewall rules, or containers not being on the same network.

Network connectivity problems in containers can be frustrating because the issue could be anywhere between the application, the container runtime, the host network stack, or the external network. This guide gives you a systematic approach to narrow down the problem.

---

## Check Basic Network Connectivity

Start with simple connectivity tests to isolate the problem.

```bash
# Test outbound internet connectivity

podman exec my-container ping -c 3 8.8.8.8

# Test DNS resolution (separate from connectivity)
podman exec my-container nslookup google.com

# Test HTTP connectivity
podman exec my-container curl -v https://httpbin.org/get

# If curl is not available, use wget
podman exec my-container wget -qO- https://httpbin.org/get
```

## Inspect Container Network Configuration

Understand how the container is networked.

```bash
# View the container's network settings
podman inspect --format '{{json .NetworkSettings}}' my-container | python3 -m json.tool

# Check the container's IP address
podman inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my-container

# List network interfaces inside the container
podman exec my-container ip addr show

# Check the container's routing table
podman exec my-container ip route

# View port mappings
podman port my-container
```

## Debug Port Mapping Issues

Port mapping problems are the most common networking issue.

```bash
# List all port mappings for a container
podman port my-container

# Run a container with explicit port mapping
podman run -d -p 8080:80 --name web nginx:latest

# Test the port from the host
curl -v http://localhost:8080

# Check if the port is actually being listened on inside the container
podman exec web ss -tlnp

# Check if something else is using the host port
ss -tlnp | grep 8080

# Bind to a specific host interface
podman run -d -p 127.0.0.1:8080:80 nginx:latest

# Bind to all interfaces explicitly
podman run -d -p 0.0.0.0:8080:80 nginx:latest
```

## Debug Container-to-Container Communication

Containers need to be on the same Podman network to communicate directly. A custom bridge network also provides container name resolution when DNS is enabled.

```bash
# Create a custom network
podman network create app-net

# Start two containers on the same network
podman run -d --name backend --network app-net nginx:latest
podman run -d --name frontend --network app-net alpine sleep 3600

# Test connectivity using container name
podman exec frontend ping -c 3 backend

# Test connectivity using container IP
BACKEND_IP=$(podman inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' backend)
podman exec frontend ping -c 3 "$BACKEND_IP"

# Connect a running container to an additional network
podman network connect app-net existing-container
```

## Debug Firewall Issues

Host firewall rules can block container traffic.

```bash
# Check firewalld status (RHEL/Fedora/CentOS)
sudo firewall-cmd --state
sudo firewall-cmd --list-all

# Check if the container port is allowed through the firewall
sudo firewall-cmd --list-ports

# Add a port to the firewall
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload

# Check iptables rules (all Linux distros)
sudo iptables -L -n -v | head -50

# Check nftables if applicable
sudo nft list ruleset | head -50
```

## Debug Rootless Networking

Rootless Podman uses slirp4netns or pasta, which have different behaviors than root-mode networking.

```bash
# Check Podman's network backend
podman info --format '{{.Host.NetworkBackend}}'

# Check if the rootless network helper is running
pgrep -af 'slirp4netns|pasta'

# Test with explicit network mode
podman run --network slirp4netns alpine ping -c 3 8.8.8.8

# In rootless mode, ports below 1024 require special handling
# Use a high port instead
podman run -d -p 8080:80 nginx:latest

# Or configure the unprivileged port start
sudo sysctl net.ipv4.ip_unprivileged_port_start=80
```

## Use a Network Debug Container

When your container lacks networking tools, deploy a debug container.

```bash
# Use nicolaka/netshoot, a container with extensive network tools
podman run -it --rm --network container:my-container nicolaka/netshoot

# Inside netshoot, use tools like:
# tcpdump - capture packets
tcpdump -i eth0 -n port 80

# netstat - check listening ports
netstat -tlnp

# iperf3 - test bandwidth
iperf3 -c target-host

# curl - test HTTP endpoints
curl -v http://backend:8080/health
```

## Debug with tcpdump on the Host

Capture traffic at the host level to see what is happening on the network bridge.

```bash
# Find the container's network interface on the host
podman network inspect podman --format '{{.NetworkInterface}}'

# Capture traffic on the Podman bridge
sudo tcpdump -i podman0 -n host $(podman inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my-container)

# Capture only specific ports
sudo tcpdump -i podman0 -n port 80

# Save capture to a file for analysis
sudo tcpdump -i podman0 -n -w /tmp/capture.pcap
```

## Summary

When debugging network connectivity in Podman containers, start with basic reachability tests, then check port mappings, verify containers share a network, and inspect firewall rules. For rootless Podman, remember that networking works differently through slirp4netns or pasta, and ports below 1024 require extra configuration. Using a debug container with tools like `netshoot` can save significant time.
