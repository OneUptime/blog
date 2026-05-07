# How to Troubleshoot Container Network Connectivity in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Troubleshooting, Debugging

Description: Learn systematic approaches to diagnose and fix container network connectivity issues in Podman.

---

> Network connectivity problems in containers can stem from DNS, firewall rules, network configuration, or port publishing issues. A systematic approach helps isolate and resolve the root cause quickly.

When a Podman container cannot reach other containers, the host, or external services, the problem could be at multiple layers of the networking stack. This guide provides a structured troubleshooting process.

---

## Step 1: Check Basic Container Network Configuration

```bash
# Verify the container is running

podman ps --filter name=myapp

# Check which network the container is on
podman inspect myapp --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}: {{ $v.IPAddress }}{{ printf "\n" }}{{ end }}'

# Check the network mode
podman inspect myapp --format '{{ .HostConfig.NetworkMode }}'
```

## Step 2: Test Connectivity Inside the Container

```bash
# Check the container's network interfaces
podman exec myapp ip addr show

# Check routes
podman exec myapp ip route show

# Test gateway connectivity
GATEWAY=$(podman exec myapp ip route show | grep default | awk '{print $3}')
podman exec myapp ping -c 3 "$GATEWAY"

# Test external connectivity
podman exec myapp ping -c 3 8.8.8.8

# Test DNS resolution
podman exec myapp nslookup google.com
```

## Step 3: Test Container-to-Container Connectivity

```bash
# Check if both containers are on the same network
podman inspect app1 --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}{{ end }}'
podman inspect app2 --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}{{ end }}'

# Ping by IP
APP2_IP=$(podman inspect app2 --format '{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}')
podman exec app1 ping -c 3 "$APP2_IP"

# Ping by name (requires custom network with DNS)
podman exec app1 ping -c 3 app2
```

## Step 4: Check DNS Resolution

```bash
# Verify DNS configuration
podman exec myapp cat /etc/resolv.conf

# Test container name resolution
podman exec myapp nslookup app2

# Check if DNS is enabled on the network
podman network inspect mynetwork --format '{{ .DNSEnabled }}'

# Check if aardvark-dns is running
ps aux | grep aardvark
```

## Step 5: Check Port Publishing

```bash
# Verify published ports
podman port myapp

# Check if the port is listening inside the container
podman exec myapp ss -tlnp

# Check if the port is accessible from the host
curl -v http://localhost:8080

# Check if something else is using the port on the host
ss -tlnp | grep 8080
```

## Step 6: Check Firewall Rules

```bash
# Check iptables rules (root mode)
sudo iptables -L -n | grep -A5 FORWARD
sudo iptables -L -n -t nat | grep -A5 POSTROUTING

# Check nftables (newer systems)
sudo nft list ruleset | head -50

# Check firewalld
sudo firewall-cmd --list-all 2>/dev/null

# Temporarily disable firewall for testing
# sudo systemctl stop firewalld
```

## Step 7: Check Network Backend

```bash
# Verify the network backend
podman info --format '{{ .Host.NetworkBackend }}'

# Check Netavark status
podman info --format '{{ .Host.NetworkBackendInfo }}'

# Check for errors in the network backend
podman --log-level=debug network inspect mynetwork 2>&1 | tail -20
```

## Step 8: Inspect the Host Network

```bash
# Check host network interfaces created by Podman
ip link show | grep -E "podman|veth|cni"

# Check bridge interfaces
ip link show type bridge

# Check if IP forwarding is enabled
sysctl net.ipv4.ip_forward
# Should be 1 for rootful bridge networks that need external routing

# Enable if disabled
sudo sysctl -w net.ipv4.ip_forward=1
```

## Common Issues and Solutions

| Problem | Check | Solution |
|---------|-------|---------|
| Cannot reach other containers | Same network? | `podman network connect mynetwork myapp` |
| DNS not resolving names | DNS enabled? | Use custom network, not default |
| Port not accessible | Port published? | Add `-p hostPort:containerPort` |
| No internet access | Internal network? | Remove `--internal` flag |
| Rootless port < 1024 | Privileged port | Use a high host port or lower `net.ipv4.ip_unprivileged_port_start` |
| Permission denied | Firewall? | Check iptables/nftables |

## Full Diagnostic Script

```bash
# Run a comprehensive network diagnostic
CTR="myapp"
echo "=== Container: $CTR ==="
echo "Status: $(podman inspect $CTR --format '{{ .State.Status }}')"
echo "Network Mode: $(podman inspect $CTR --format '{{ .HostConfig.NetworkMode }}')"
echo "Networks:"
podman inspect $CTR --format '{{ range $k, $v := .NetworkSettings.Networks }}  {{ $k }}: {{ $v.IPAddress }}{{ printf "\n" }}{{ end }}'
echo "Published Ports:"
podman port $CTR
echo "=== Connectivity Tests ==="
podman exec $CTR ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1 && echo "Internet: OK" || echo "Internet: FAIL"
podman exec $CTR nslookup google.com > /dev/null 2>&1 && echo "DNS: OK" || echo "DNS: FAIL"
```

## Summary

Troubleshoot Podman container networking by systematically checking the container's network configuration, testing connectivity at each layer (gateway, external, DNS), verifying port publishing, and inspecting firewall rules. Ensure containers share a custom network for DNS-based discovery, IP forwarding is enabled when required for rootful bridge routing, and the correct network backend is functioning. Use `podman --log-level=debug` for detailed diagnostic output when standard checks do not reveal the issue.
