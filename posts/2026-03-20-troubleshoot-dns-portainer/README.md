# How to Troubleshoot DNS Resolution Issues in Portainer - Troubleshoot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, DNS, Troubleshooting, Networking, Debugging

Description: Diagnose and fix common Docker DNS resolution failures including service name lookup errors, external DNS failures, and split-brain DNS issues in containers managed by Portainer.

## Introduction

DNS failures are among the most common container networking issues. When containers can't resolve service names or external hostnames, applications fail in ways that look like network outages. This guide covers systematic DNS troubleshooting from inside containers, common failure patterns, and their fixes.

## Step 1: Verify Basic DNS from Inside a Container

```bash
# Access the container (via Portainer Exec or CLI)

docker exec -it my_container sh

# Check what DNS servers the container is using
cat /etc/resolv.conf
# Typical output on a user-defined Docker network:
# nameserver 127.0.0.11   <- Docker's embedded DNS
# options ndots:0
# Containers on the default bridge network may inherit the host DNS servers instead.

# Test Docker service name resolution
nslookup database
nslookup redis

# Test external DNS
nslookup google.com
nslookup github.com

# If nslookup is not available, use getent
getent hosts database
getent hosts google.com
```

## Step 2: Use netshoot for Advanced DNS Debugging

```bash
# Run a debug container with networking tools
docker run --rm -it \
  --network your_app_network \
  nicolaka/netshoot

# Inside netshoot - comprehensive DNS testing
dig database          # Detailed DNS response for service name
dig @127.0.0.11 database  # Query Docker's embedded DNS directly
dig google.com        # External DNS test
dig +trace google.com  # Full DNS resolution chain

# DNS query timing
time nslookup database
time nslookup google.com

# Watch DNS traffic in real-time
tcpdump -ni any port 53
```

## Step 3: Common Issue - Containers on Different Networks

```bash
# Problem: Service name not resolving
# Cause: Containers are on different networks

# Check which networks each container belongs to
docker inspect api_container | jq '.[].NetworkSettings.Networks | keys'
docker inspect database_container | jq '.[].NetworkSettings.Networks | keys'
# If they don't share a network, DNS won't work

# Fix: Connect both containers to the same network
docker network connect shared_network api_container
docker network connect shared_network database_container

# Verify they're on the same network now
docker network inspect shared_network | jq '.[].Containers | keys'
```

## Step 4: Common Issue - DNS Server Not Responding

```bash
# Test if Docker's embedded DNS is responding
docker exec api_container nslookup database 127.0.0.11
# If this fails but external DNS works, Docker DNS has issues

# Check DNS NAT rules in the container's network namespace
container_pid=$(docker inspect -f '{{.State.Pid}}' api_container)
sudo nsenter -t "$container_pid" -n iptables -t nat -L DOCKER_OUTPUT -n
# Should show UDP/TCP port 53 rules for 127.0.0.11 when Docker uses the iptables backend

# If external DNS is blocked, check host forwarding rules
sudo iptables -L DOCKER-USER -n -v

# Restart Docker and recreate affected containers if DNS rules are corrupted
sudo systemctl restart docker
```

## Step 5: Common Issue - External DNS Failing

```yaml
# Fix: Configure custom upstream DNS servers
services:
  api:
    image: myapp/api:latest
    dns:
      # Bypass ISP DNS if it's unreliable
      - 1.1.1.1       # Cloudflare
      - 8.8.8.8       # Google
    dns_opt:
      - timeout:3     # Reduce timeout for faster failover
      - attempts:3    # Retry 3 times
```

In `/etc/docker/daemon.json`, set global DNS for new containers:

```json
{
  "dns": ["1.1.1.1", "8.8.8.8"],
  "dns-opts": ["timeout:3", "attempts:3"]
}
```

Restart Docker after changing `daemon.json` so newly created containers use the updated daemon configuration.

## Step 6: Common Issue - ndots Causing Slow DNS

```bash
# Problem: Every lookup tries multiple search domains
# With ndots:5 and a search list, 'api' can be tried as:
# api.svc.cluster.local (fail)
# api.cluster.local (fail)
# api.local (fail)
# api (success - after search-domain attempts)

# Check current ndots setting
docker exec api_container cat /etc/resolv.conf
```

```yaml
# Fix in compose file
services:
  api:
    dns_opt:
      - ndots:0   # Try short names directly before walking search domains
      # Use ndots:1 to try names with at least one dot directly first
```

## Step 7: Diagnose with DNS Debug Script

```bash
# Run comprehensive DNS diagnostics from inside a container
docker exec api_container sh -c '
  echo "=== resolv.conf ==="
  cat /etc/resolv.conf

  echo ""
  echo "=== Docker embedded DNS test ==="
  nslookup database 127.0.0.11 2>&1 || echo "FAILED: embedded DNS"

  echo ""
  echo "=== Service name resolution ==="
  for svc in database redis cache; do
    result=$(getent hosts $svc 2>&1)
    if [ $? -eq 0 ]; then
      echo "OK: $svc -> $result"
    else
      echo "FAIL: $svc not found"
    fi
  done

  echo ""
  echo "=== External DNS ==="
  nslookup google.com 2>&1 | grep -E "Address|error"

  echo ""
  echo "=== Network interfaces ==="
  ip addr show eth0

  echo ""
  echo "=== Default route ==="
  ip route show default
'
```

## Conclusion

DNS failures in Docker containers have a small set of root causes: containers on different networks, broken iptables rules after Docker restart, unreliable upstream DNS servers, or misconfigured ndots settings. The systematic approach - check resolv.conf, test Docker's embedded DNS directly, verify shared network membership, then test external DNS - will identify the issue quickly. Portainer's Exec feature lets you run these diagnostics from the UI without SSH access to the host.
