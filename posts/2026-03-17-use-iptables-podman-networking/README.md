# How to Use iptables with Podman Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, iptables, Security

Description: Learn how to use iptables rules to control and inspect network traffic for Podman containers.

---

> iptables gives you low-level control over packet filtering for Podman container traffic on Linux hosts.

Podman relies on the host networking stack for container connectivity. On rootful bridge networks where Podman uses iptables for firewall rules, you can write rules that apply to container traffic. This is useful for logging, rate limiting, restricting access, and debugging network issues.

---

## How Podman Uses iptables

When you publish a port on a managed bridge network, Podman sets up NAT rules so that host traffic is forwarded to the container. On an iptables-based setup, these rules appear in the `nat` and `filter` tables.

```bash
# View NAT rules related to container port forwarding

sudo iptables -t nat -L -n --line-numbers

# View filter rules for container traffic
sudo iptables -L FORWARD -n --line-numbers
```

## Inspecting Container Network Rules

```bash
# Run a container with a published port
podman run -d --name myapp -p 9090:80 docker.io/library/nginx:alpine

# List the NAT PREROUTING chain for DNAT rules
sudo iptables -t nat -L PREROUTING -n -v

# List the FORWARD chain to see traffic allowed to the container
sudo iptables -L FORWARD -n -v
```

## Restricting Access to a Published Port

```bash
CONTAINER_IP=$(podman inspect myapp --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

# Allow only a specific source IP to reach port 9090
sudo iptables -I FORWARD 1 -p tcp --dport 80 -d "$CONTAINER_IP" \
  -s 192.168.1.50 -j ACCEPT

# Drop all other traffic to the container port
sudo iptables -I FORWARD 2 -p tcp --dport 80 -d "$CONTAINER_IP" \
  -j DROP
```

## Logging Container Traffic

```bash
# Add a logging rule for traffic to the container
CONTAINER_IP=$(podman inspect myapp --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

sudo iptables -I FORWARD -d "$CONTAINER_IP" -j LOG \
  --log-prefix "PODMAN-TRAFFIC: " --log-level 4

# View logged traffic in the system journal
sudo journalctl -k --grep "PODMAN-TRAFFIC" --no-pager -n 20
```

## Rate Limiting Connections

```bash
# Limit incoming new connections to 10 per minute per source IP
sudo iptables -I FORWARD 1 -p tcp --dport 80 \
  -d "$CONTAINER_IP" \
  -m conntrack --ctstate NEW \
  -m hashlimit --hashlimit-upto 10/min --hashlimit-burst 20 \
  --hashlimit-mode srcip --hashlimit-name myapp-http -j ACCEPT

sudo iptables -I FORWARD 2 -p tcp --dport 80 \
  -d "$CONTAINER_IP" \
  -m conntrack --ctstate NEW -j DROP
```

## Blocking Outbound Traffic

```bash
# Prevent a container from reaching external networks
sudo iptables -I FORWARD -s "$CONTAINER_IP" \
  ! -d 10.88.0.0/16 -j DROP
```

## Cleaning Up Rules

```bash
# Remove rules by line number after listing them
sudo iptables -L FORWARD -n --line-numbers
sudo iptables -D FORWARD <line-number>

# Or flush all custom rules (use with caution)
# sudo iptables -F FORWARD
```

## Summary

iptables provides granular control over Podman container traffic at the kernel level. Use it to restrict access to published ports, log traffic for debugging, rate limit connections, and block unwanted outbound communication. Always review existing rules before adding new ones to avoid conflicts.
