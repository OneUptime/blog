# How to Debug Docker IPv6 Networking Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Debugging, Troubleshooting, Network Diagnostics

Description: Diagnose and fix common Docker IPv6 networking problems including containers not receiving IPv6 addresses, routing failures, ip6tables misconfigurations, and connectivity issues between containers.

## Introduction

Docker IPv6 issues commonly fall into four categories: default bridge configuration not enabling IPv6, containers not receiving addresses on IPv6-enabled networks, routing failures preventing internet access, and Docker-managed IPv6 firewall rules not being applied. Systematic diagnosis starting from daemon config through network inspection to container-level testing quickly identifies the root cause.

## Diagnostic Checklist

```bash
#!/bin/bash
echo "=== 1. Check Docker daemon IPv6 status ==="
docker info 2>/dev/null | grep -i "IPv6"

echo ""
echo "=== 2. Check daemon.json ==="
cat /etc/docker/daemon.json 2>/dev/null || echo "daemon.json not found"

echo ""
echo "=== 3. Check docker0 bridge IPv6 ==="
ip -6 addr show docker0 2>/dev/null || echo "docker0 not found"

echo ""
echo "=== 4. List networks with IPv6 ==="
docker network ls -q | while read net; do
    NAME=$(docker network inspect "$net" --format "{{.Name}}")
    IPV6=$(docker network inspect "$net" --format "{{.EnableIPv6}}")
    echo "  $NAME: IPv6=$IPV6"
done

echo ""
echo "=== 5. Check ip6tables rules ==="
sudo ip6tables -L DOCKER -n 2>/dev/null | head -20

echo ""
echo "=== 6. Check IPv6 forwarding ==="
cat /proc/sys/net/ipv6/conf/all/forwarding
```

## Fix: Container Has No IPv6 Address

```bash
# Symptom: docker exec container ip -6 addr shows only fe80:: (link-local only)

# Diagnosis 1: Is IPv6 enabled on the network?

docker network inspect mynet | grep EnableIPv6
# If false, recreate network with --ipv6

# Diagnosis 2: Does the network have IPv6 subnet configured?
docker network inspect mynet | grep -A5 "IPAM"
# If no IPv6 subnet in Config, add one

# Fix: Recreate network with IPv6
docker network disconnect -f mynet mycontainer
docker network rm mynet
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 172.20.0.0/24 \
    --subnet fd00:20::/64 \
    mynet

# Reconnect container
docker network connect mynet mycontainer

# Verify
docker exec mycontainer ip -6 addr show eth0
```

## Fix: Container Cannot Reach IPv6 Internet

```bash
# Symptom: ping6 2001:4860:4860::8888 fails from container

# Diagnosis 1: Check default IPv6 route inside container
docker exec mycontainer ip -6 route show default
# Should show: default via <gateway> dev eth0

# Diagnosis 2: Check host IPv6 forwarding
cat /proc/sys/net/ipv6/conf/all/forwarding
# Must be 1 for container IPv6 routing; Docker normally enables this on Linux when it starts

# Fix: Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding=1" | sudo tee -a /etc/sysctl.d/99-docker-ipv6.conf

# Diagnosis 3: Check Docker-managed IPv6 NAT rules
sudo ip6tables -t nat -L POSTROUTING -n
# Bridge networks rely on Docker-managed masquerading rules for outbound access

# Fix: Ensure Docker is managing IPv6 firewall rules
cat /etc/docker/daemon.json
# Ensure: "ip6tables": true
sudo systemctl restart docker
```

## Fix: IPv6 Not Working After Daemon Restart

```bash
# If IPv6 breaks after a daemon restart, check whether Docker recreated its ip6tables rules

# Bad: Docker-managed ip6tables rules missing
sudo ip6tables -L DOCKER -n
# If the chain is missing or empty on an iptables-backed setup, ip6tables=true may not be set

# Fix: Confirm daemon.json
cat /etc/docker/daemon.json
# Must have: "ip6tables": true

# Apply fix and restart
sudo systemctl restart docker

# Wait for containers to restart and check rules
sudo ip6tables -L DOCKER -n
```

## Debug Container-to-Container IPv6

```bash
# Container 1 cannot reach Container 2 over IPv6

# Step 1: Get Container 2 IPv6 address
C2_IPV6=$(docker inspect container2 \
    --format "{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}")
echo "Container 2 IPv6: $C2_IPV6"

# Step 2: Are they on the same network?
docker inspect container1 --format "{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}} {{end}}"
docker inspect container2 --format "{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}} {{end}}"

# Step 3: Test ping
docker exec container1 ping6 -c 3 "$C2_IPV6"

# Step 4: Check whether ICC (inter-container communication) is disabled on the network
docker network inspect shared-net \
    --format '{{ index .Options "com.docker.network.bridge.enable_icc" }}'

# Fix: Enable ICC on the network
docker network disconnect -f shared-net container1
docker network disconnect -f shared-net container2
docker network rm shared-net
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet fd00:30::/64 \
    --opt com.docker.network.bridge.enable_icc=true \
    shared-net
docker network connect shared-net container1
docker network connect shared-net container2
```

## Conclusion

Debug Docker IPv6 by checking in order: for the default bridge, daemon.json has `"ipv6": true`; Docker is managing IPv6 firewall rules with `"ip6tables": true`; the network has `EnableIPv6: true` with an IPv6 subnet; the host has `net.ipv6.conf.all.forwarding=1`; and containers that need to communicate are on the same network. A common issue on the default bridge is missing `"ipv6": true` in daemon.json, while user-defined bridge networks need `--ipv6` when the network is created.
