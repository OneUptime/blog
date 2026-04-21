# How to Troubleshoot Docker Container IPv4 Connectivity Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, Troubleshooting, Connectivity, Container

Description: Systematically diagnose Docker container IPv4 connectivity failures by checking network attachment, IP assignment, DNS, iptables rules, and routing from within the container.

## Introduction

Container networking failures have a predictable set of causes: missing network attachment, IP not assigned, DNS resolution failures, iptables blocking traffic, or a missing default route. This guide provides a step-by-step diagnostic procedure.

## Step 1: Verify the Container Has an IP

```bash
# Check the container's IP addresses

docker inspect my-container \
  --format '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}}: {{$cfg.IPAddress}}{{"\n"}}{{end}}'

# Or exec into the container
docker exec my-container ip -4 addr show
```

If no IP is shown, the container may not be attached to a network.

## Step 2: Check Which Networks Are Attached

```bash
# List networks the container is connected to
docker inspect my-container --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool | grep -E '"IPAddress|"NetworkID'
```

If no networks show, attach one:

```bash
docker network connect my-app-network my-container
```

## Step 3: Test the Default Route

```bash
# Check if there is a default route inside the container
docker exec my-container ip route show

# Ping the gateway
docker exec my-container ping -c 3 $(docker exec my-container ip route | awk '/default/{print $3}')
```

## Step 4: Test External Connectivity

```bash
# Ping an external IP (bypass DNS)
docker exec my-container ping -c 3 8.8.8.8

# If this fails but gateway ping works - check iptables NAT rules on host
sudo iptables -t nat -L POSTROUTING -n -v | grep MASQUERADE
```

## Step 5: Test DNS Resolution

```bash
# From inside the container
docker exec my-container cat /etc/resolv.conf

docker exec my-container nslookup google.com

# If DNS fails on a custom network, check Docker's embedded resolver
docker exec my-container nslookup google.com 127.0.0.11
```

## Step 6: Check iptables on the Host

```bash
# Are Docker's rules present in the FORWARD chain?
sudo iptables -L FORWARD -n -v | grep DOCKER

# Check if ip_forward is enabled
cat /proc/sys/net/ipv4/ip_forward
# Should be 1

# Re-enable if disabled
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
```

## Step 7: Check Container-to-Container Connectivity

```bash
# From container A, ping container B by name
docker exec container-a ping -c 3 container-b

# If name fails but IP works, check they are on the same user-defined network
docker inspect container-b --format '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}}{{"\n"}}{{end}}'
docker inspect container-a --format '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}}{{"\n"}}{{end}}'
```

Name-based DNS only works on user-defined networks, not the default bridge.

## Step 8: Restart Docker Networking

As a last resort, restart Docker (this can interrupt container networking and, without live restore or suitable restart policies, can stop running containers):

```bash
sudo systemctl restart docker
```

## Common Issues and Fixes

| Symptom | Fix |
|---|---|
| No IP assigned | Attach container to a network |
| Cannot ping gateway | Check bridge/veth interface is up |
| Cannot reach internet | Ensure ip_forward=1 and NAT rule present |
| DNS fails for external names | Check /etc/resolv.conf or set --dns |
| Container names don't resolve | Use user-defined network, not default bridge |

## Conclusion

Work through network attachment, IP assignment, gateway reachability, internet access, and DNS in order. Most issues trace back to missing network attachment, a disabled ip_forward, or a missing iptables MASQUERADE rule.
