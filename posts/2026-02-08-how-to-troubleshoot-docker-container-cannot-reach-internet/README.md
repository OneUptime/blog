# How to Troubleshoot Docker Container Cannot Reach Internet

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, Troubleshooting, DNS, Containers, DevOps

Description: A systematic guide to diagnosing and fixing Docker containers that cannot reach the internet, covering DNS, routing, firewall, and bridge issues.

---

Few Docker problems are more frustrating than a container that simply cannot reach the internet. You run `docker exec my-container curl google.com` and it just hangs or returns an error. The host has connectivity, other containers might work fine, but this one is stuck. This guide walks through a systematic approach to diagnosing and fixing the problem.

## Step 1: Verify the Host Has Internet Access

Before diving into Docker, confirm the host machine itself can reach the internet:

```bash
# Test basic connectivity from the host
ping -c 3 8.8.8.8

# Test DNS resolution from the host
nslookup google.com

# Test HTTP from the host
curl -s -o /dev/null -w "%{http_code}" https://google.com
```

If the host does not have internet access, the problem is not Docker-specific. Fix the host networking first.

## Step 2: Check DNS Resolution Inside the Container

The most common reason containers cannot reach the internet is DNS failure. The container can reach IP addresses but cannot resolve hostnames.

Test DNS inside the container:

```bash
# Test if the container can reach an IP directly (bypassing DNS)
docker exec my-container ping -c 1 8.8.8.8

# Test if DNS resolution works
docker exec my-container nslookup google.com
```

If pinging an IP works but DNS fails, the problem is DNS configuration.

### Fix: Set Custom DNS Servers

Override the container's DNS settings:

```bash
# Run the container with explicit DNS servers
docker run --rm --dns 8.8.8.8 --dns 1.1.1.1 alpine ping -c 3 google.com
```

For a permanent fix, configure DNS in the Docker daemon:

```json
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
```

Save this to `/etc/docker/daemon.json` and restart Docker:

```bash
# Restart Docker to apply DNS configuration
sudo systemctl restart docker
```

### Fix: Check /etc/resolv.conf Inside the Container

Docker copies DNS settings from the host. If the host uses a local DNS resolver (like systemd-resolved on Ubuntu), the container might get `127.0.0.53` as its DNS server, which does not work inside the container:

```bash
# Check what DNS server the container is using
docker run --rm alpine cat /etc/resolv.conf
```

If it shows `nameserver 127.0.0.53` or `nameserver 127.0.0.1`, that is the problem. The container cannot reach a localhost DNS service running on the host.

Fix it by pointing Docker at real DNS servers:

```json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}
```

## Step 3: Check IP Forwarding

Docker needs IP forwarding enabled on the host for containers to reach the internet. Check if it is enabled:

```bash
# Check if IP forwarding is enabled (should return 1)
sysctl net.ipv4.ip_forward
```

If it returns `0`, enable it:

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Make it permanent
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

Docker normally enables this automatically, but some host configurations or security tools might disable it.

## Step 4: Check iptables and NAT Rules

Docker uses iptables NAT rules to masquerade container traffic. If these rules are missing or corrupted, containers cannot reach the internet.

Check the NAT masquerade rules:

```bash
# Look for Docker's masquerade rules
sudo iptables -t nat -L POSTROUTING -v -n | grep -i docker
```

You should see something like:

```
MASQUERADE  all  --  172.17.0.0/16    0.0.0.0/0
```

If the masquerade rule is missing, restart Docker to recreate it:

```bash
# Restart Docker to regenerate iptables rules
sudo systemctl restart docker
```

### Fix: Check for Conflicting Firewall Rules

Other firewall tools (UFW, firewalld, nftables) can interfere with Docker's iptables rules.

For UFW on Ubuntu:

```bash
# Check if UFW is blocking Docker traffic
sudo ufw status

# If UFW is active, allow forwarding in the UFW config
sudo nano /etc/default/ufw
# Change DEFAULT_FORWARD_POLICY="DROP" to DEFAULT_FORWARD_POLICY="ACCEPT"

# Restart UFW
sudo ufw reload
```

For firewalld:

```bash
# Add the docker0 interface to the trusted zone
sudo firewall-cmd --permanent --zone=trusted --add-interface=docker0
sudo firewall-cmd --reload
```

## Step 5: Check the Docker Bridge Network

The docker0 bridge might be down or misconfigured:

```bash
# Check if the docker0 bridge is up
ip link show docker0

# Check the docker0 bridge IP configuration
ip addr show docker0

# Check if the bridge has the right subnet
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

If docker0 is missing or down, restart Docker:

```bash
# Restart Docker to recreate the bridge
sudo systemctl restart docker
```

## Step 6: Check the Container's Network Configuration

Look at the container's actual network settings:

```bash
# Check the container's IP address and gateway
docker exec my-container ip addr show eth0
docker exec my-container ip route

# Check the container's DNS configuration
docker exec my-container cat /etc/resolv.conf
```

The default route should point to the Docker bridge gateway (typically 172.17.0.1 for the default bridge). If the route is missing, the container has no path to the internet.

## Step 7: Check for Network Mode Issues

Different network modes have different connectivity characteristics:

```bash
# Check which network mode the container is using
docker inspect my-container --format '{{.HostConfig.NetworkMode}}'
```

- `bridge` (default): Should have internet access through NAT
- `host`: Uses the host's network stack directly, should work if the host works
- `none`: No networking at all, this is intentional isolation
- `container:<name>`: Shares another container's network, check that container
- Custom network with `internal: true`: Intentionally blocks internet access

If the network is `none` or `internal`, the container is isolated by design.

## Step 8: Test with a Fresh Container

Rule out container-specific issues by testing with a clean Alpine container:

```bash
# Test basic internet connectivity with a fresh container
docker run --rm alpine ping -c 3 8.8.8.8

# Test DNS
docker run --rm alpine nslookup google.com

# Test HTTP
docker run --rm alpine wget -qO- http://ifconfig.me
```

If the fresh container works but your application container does not, the problem is specific to that container's image or configuration.

## Step 9: Check Docker Daemon Proxy Settings

If your host is behind a corporate proxy, Docker containers need proxy configuration too:

```bash
# Check if Docker daemon has proxy settings
sudo systemctl show docker --property=Environment
```

Configure proxy for the Docker daemon:

```bash
# Create the systemd override directory
sudo mkdir -p /etc/systemd/system/docker.service.d

# Create a proxy configuration file
sudo tee /etc/systemd/system/docker.service.d/proxy.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1,*.internal.company.com"
EOF

# Reload and restart Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

For containers to use the proxy, pass environment variables:

```bash
# Run a container with proxy settings
docker run --rm \
  -e HTTP_PROXY=http://proxy.example.com:8080 \
  -e HTTPS_PROXY=http://proxy.example.com:8080 \
  -e NO_PROXY=localhost,127.0.0.1 \
  alpine wget -qO- http://ifconfig.me
```

## Step 10: Check for Docker Network Conflicts

Docker's default subnet (172.17.0.0/16) might conflict with your corporate or VPN network:

```bash
# Check Docker's default subnet
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'

# Check host routes for conflicts
ip route | grep 172.17
```

If there is a conflict, change Docker's default address pool:

```json
{
  "default-address-pools": [
    {
      "base": "10.200.0.0/16",
      "size": 24
    }
  ]
}
```

Save to `/etc/docker/daemon.json` and restart Docker.

## Quick Diagnostic Script

Here is a script that runs through all common checks:

```bash
#!/bin/bash
# docker-network-diag.sh - Diagnose Docker container internet connectivity

echo "=== Host Connectivity ==="
ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1 && echo "PASS: Host can reach 8.8.8.8" || echo "FAIL: Host cannot reach 8.8.8.8"

echo ""
echo "=== IP Forwarding ==="
FORWARD=$(sysctl -n net.ipv4.ip_forward)
[ "$FORWARD" = "1" ] && echo "PASS: IP forwarding enabled" || echo "FAIL: IP forwarding disabled"

echo ""
echo "=== Docker Bridge ==="
ip link show docker0 > /dev/null 2>&1 && echo "PASS: docker0 bridge exists" || echo "FAIL: docker0 bridge missing"

echo ""
echo "=== NAT Rules ==="
sudo iptables -t nat -L POSTROUTING -n 2>/dev/null | grep -q MASQUERADE && echo "PASS: NAT masquerade rules exist" || echo "FAIL: NAT masquerade rules missing"

echo ""
echo "=== Container Connectivity Test ==="
docker run --rm --dns 8.8.8.8 alpine ping -c 1 -W 5 8.8.8.8 > /dev/null 2>&1 && echo "PASS: Container can ping 8.8.8.8" || echo "FAIL: Container cannot ping 8.8.8.8"

echo ""
echo "=== Container DNS Test ==="
docker run --rm --dns 8.8.8.8 alpine nslookup google.com > /dev/null 2>&1 && echo "PASS: Container DNS works" || echo "FAIL: Container DNS broken"
```

## Summary

When a Docker container cannot reach the internet, work through the problem systematically. Start with DNS - it is the most common cause. Check IP forwarding, iptables NAT rules, and the Docker bridge. Look for firewall conflicts, proxy requirements, and subnet overlaps. Test with a fresh container to isolate the issue. Most connectivity problems come down to DNS misconfiguration, missing iptables rules, or a firewall blocking Docker's NAT traffic.
