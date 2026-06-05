# How to Disable Docker's iptables Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, iptables, Firewall, Networking, Linux, Security, Configuration

Description: Learn when and how to disable Docker's automatic iptables management and handle container networking rules manually.

---

Docker automatically creates and manages iptables rules for container networking. Port publishing, NAT, inter-container communication, and network isolation all depend on these rules. For most deployments, this automatic management works well. But some situations demand manual control: corporate firewall policies, custom networking setups, integration with external firewall managers like firewalld or UFW, or security requirements that forbid automatic firewall modifications.

This guide explains how to disable Docker's iptables management, what breaks when you do, and how to restore the necessary rules manually.

## When to Disable Docker iptables

You should consider disabling Docker's iptables management when:

- Your organization requires all firewall rules to go through a change management process
- You use firewalld, UFW, or another firewall manager that conflicts with Docker's rules
- You need complete control over NAT and forwarding rules
- Docker's automatic rules conflict with your existing network security policies
- You are running Docker in a network namespace with its own routing

Do not disable Docker iptables unless you have a clear reason. The manual setup is more work and more error-prone.

## Disabling iptables in Docker

Add the `iptables` option to the Docker daemon configuration:

```json
{
  "iptables": false
}
```

Restart Docker to apply:

```bash
# Restart Docker daemon with iptables disabled

sudo systemctl restart docker
```

Verify the setting took effect:

```bash
# Validate the daemon configuration file
sudo dockerd --validate --config-file=/etc/docker/daemon.json

# Confirm Docker did not create its usual host-level bridge chains
sudo iptables -L -n | grep -c DOCKER
# This should not show Docker's normal bridge networking chains
```

## What Breaks When iptables Is Disabled

With `iptables: false`, Docker stops creating most host-level firewall rules for bridge networks. The following features are affected unless you add replacement rules:

1. **Port publishing** (`-p` flag) - No host DNAT rules mean published host ports do not work as normal
2. **Container internet access** - No MASQUERADE rules mean containers on bridge networks cannot reach external networks by using the host's address
3. **Network filtering** - No filter rules mean Docker no longer blocks unpublished container ports from hosts that can route to the bridge network
4. **Network isolation** - No isolation rules mean bridge networks may not be isolated the way Docker normally configures them

Start a container and observe the failures:

```bash
# Start a container with a published port
docker run -d --name test-web -p 8080:80 nginx:alpine

# This typically fails because no host DNAT rule exists
curl http://localhost:8080
# curl: (7) Failed to connect to localhost port 8080

# The container cannot reach the internet by masquerading through the host either
docker exec test-web ping -c 1 8.8.8.8
```

## Manually Creating Required iptables Rules

You need to recreate what Docker normally does automatically. Start with the basic chains:

```bash
# Create the Docker chains manually
sudo iptables -N DOCKER
sudo iptables -N DOCKER-FORWARD
sudo iptables -N DOCKER-USER
sudo iptables -t nat -N DOCKER

# Add jumps from the FORWARD chain
sudo iptables -A FORWARD -j DOCKER-USER
sudo iptables -A FORWARD -j DOCKER-FORWARD
sudo iptables -A DOCKER-FORWARD -o docker0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A DOCKER-FORWARD -o docker0 -j DOCKER
sudo iptables -A DOCKER-FORWARD -i docker0 ! -o docker0 -j ACCEPT
sudo iptables -A DOCKER-FORWARD -i docker0 -o docker0 -j ACCEPT
```

## Enabling IP Forwarding

Docker normally enables IP forwarding. With iptables disabled, verify it manually:

```bash
# Check current IP forwarding status
cat /proc/sys/net/ipv4/ip_forward

# Enable IP forwarding if it is not already enabled
sudo sysctl -w net.ipv4.ip_forward=1

# Make it persistent across reboots
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-docker-forward.conf
sudo sysctl -p /etc/sysctl.d/99-docker-forward.conf
```

## Adding NAT Rules for Internet Access

Containers need source NAT (masquerading) to access external networks:

```bash
# Add masquerade rule for the Docker subnet
sudo iptables -t nat -A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
```

For custom Docker networks, add rules for each subnet:

```bash
# Find all Docker network subnets
docker network ls -q | xargs -I {} docker network inspect {} --format '{{.Name}}: {{range .IPAM.Config}}{{.Subnet}}{{end}}'

# Add masquerade rules for each custom network
sudo iptables -t nat -A POSTROUTING -s 172.18.0.0/16 ! -o br-abc123 -j MASQUERADE
sudo iptables -t nat -A POSTROUTING -s 172.19.0.0/16 ! -o br-def456 -j MASQUERADE
```

## Adding DNAT Rules for Port Publishing

For each published port, create a DNAT rule manually:

```bash
# Find the container's IP address
CONTAINER_IP=$(docker inspect test-web --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
echo "Container IP: $CONTAINER_IP"

# Add the PREROUTING and OUTPUT jumps to the DOCKER chain
sudo iptables -t nat -A PREROUTING -m addrtype --dst-type LOCAL -j DOCKER
sudo iptables -t nat -A OUTPUT ! -d 127.0.0.0/8 -m addrtype --dst-type LOCAL -j DOCKER

# Add DNAT rule for port publishing (host port 8080 to container port 80)
sudo iptables -t nat -A DOCKER ! -i docker0 -p tcp --dport 8080 -j DNAT --to-destination ${CONTAINER_IP}:80

# Add ACCEPT rule in the FORWARD chain for the published port
sudo iptables -A DOCKER -d ${CONTAINER_IP}/32 ! -i docker0 -o docker0 -p tcp --dport 80 -j ACCEPT
```

Test that the port is now accessible:

```bash
# Verify the published port works on the host's non-loopback address
HOST_IP=$(hostname -I | awk '{print $1}')
curl "http://${HOST_IP}:8080"
```

## Automating Rule Management with a Script

Managing rules manually for every container is tedious. Create a script that generates rules from running containers:

```bash
#!/bin/bash
# docker-iptables-sync.sh - Generate iptables rules from running Docker containers

# Flush existing Docker chains
iptables -N DOCKER 2>/dev/null
iptables -t nat -N DOCKER 2>/dev/null
iptables -F DOCKER 2>/dev/null
iptables -t nat -F DOCKER 2>/dev/null

# Ensure host-port packets reach the NAT chain
iptables -t nat -C PREROUTING -m addrtype --dst-type LOCAL -j DOCKER 2>/dev/null || \
    iptables -t nat -A PREROUTING -m addrtype --dst-type LOCAL -j DOCKER
iptables -t nat -C OUTPUT ! -d 127.0.0.0/8 -m addrtype --dst-type LOCAL -j DOCKER 2>/dev/null || \
    iptables -t nat -A OUTPUT ! -d 127.0.0.0/8 -m addrtype --dst-type LOCAL -j DOCKER

# Process each running container
docker ps --format '{{.ID}}' | while read CONTAINER_ID; do
    # Get container details
    NAME=$(docker inspect "$CONTAINER_ID" --format '{{.Name}}' | tr -d '/')
    IP=$(docker inspect "$CONTAINER_ID" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
    BRIDGE=$(docker inspect "$CONTAINER_ID" --format '{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}')

    # Get published ports
    docker inspect "$CONTAINER_ID" --format '{{json .NetworkSettings.Ports}}' | \
        python3 -c "
import json, sys
ports = json.load(sys.stdin)
for container_port, bindings in ports.items():
    if bindings:
        for b in bindings:
            proto = container_port.split('/')[1]
            cport = container_port.split('/')[0]
            hport = b['HostPort']
            print(f'{proto} {hport} {cport}')
" | while read PROTO HOST_PORT CONTAINER_PORT; do
        echo "Adding DNAT: ${NAME} ${HOST_PORT} -> ${IP}:${CONTAINER_PORT} (${PROTO})"

        # Add NAT rule
        iptables -t nat -A DOCKER ! -i docker0 -p "$PROTO" --dport "$HOST_PORT" \
            -j DNAT --to-destination "${IP}:${CONTAINER_PORT}"

        # Add FORWARD allow rule
        iptables -A DOCKER -d "${IP}/32" ! -i docker0 -o docker0 \
            -p "$PROTO" --dport "$CONTAINER_PORT" -j ACCEPT
    done
done

echo "iptables rules synchronized with running containers"
```

## Integrating with UFW

If you use UFW (Uncomplicated Firewall), Docker's automatic iptables management often conflicts with it. Disabling Docker's iptables and managing rules through UFW provides a cleaner setup:

```bash
# /etc/ufw/after.rules - Add Docker NAT rules at the end of the file
*nat
:POSTROUTING ACCEPT [0:0]

# Docker container masquerade
-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE

COMMIT
```

Then add UFW route rules for the forwarded container traffic. Opening the host port with `ufw allow 8080/tcp` is not enough unless a process or proxy is actually listening on the host port:

```bash
# Allow forwarded traffic to the container port through UFW
sudo ufw route allow proto tcp from any to 172.17.0.2 port 80 comment "Docker nginx"

# Allow from specific network only
sudo ufw route allow proto tcp from 192.168.1.0/24 to 172.17.0.2 port 80 comment "Docker nginx internal"
```

## Integrating with firewalld

For systems using firewalld:

```bash
# Add the Docker bridge to a trusted zone
sudo firewall-cmd --permanent --zone=trusted --add-interface=docker0

# Add masquerading for the Docker zone
sudo firewall-cmd --permanent --zone=trusted --add-masquerade

# Forward a host port to a container IP and port
sudo firewall-cmd --permanent --zone=public --add-forward-port=port=8080:proto=tcp:toport=80:toaddr=172.17.0.2

# Reload firewalld
sudo firewall-cmd --reload
```

## Monitoring and Troubleshooting

When managing iptables manually, packet counting becomes your primary debugging tool:

```bash
# Show rules with packet counters to see what is matching
sudo iptables -L FORWARD -n -v --line-numbers
sudo iptables -t nat -L -n -v --line-numbers

# Watch for dropped packets in the kernel log
sudo dmesg | grep -i "dropped\|reject"

# Trace packets through the iptables chains
sudo iptables -t raw -A PREROUTING -p tcp --dport 8080 -j TRACE
sudo journalctl -f -k | grep TRACE
```

## Re-Enabling Docker iptables

If you decide to go back to automatic management:

```json
{
  "iptables": true
}
```

```bash
# Clean up manual rules before re-enabling
sudo iptables -F DOCKER
sudo iptables -F DOCKER-USER
sudo iptables -F DOCKER-FORWARD
sudo iptables -t nat -F DOCKER

# Restart Docker to let it recreate rules
sudo systemctl restart docker

# Verify Docker rules are back
sudo iptables -L -n | grep DOCKER
```

## Conclusion

Disabling Docker's iptables management gives you complete control over firewall rules, but it comes with real responsibility. You must manually handle port publishing DNAT, outbound masquerading, network isolation, and IP forwarding. For most teams, using the DOCKER-USER chain for customization is a better approach. Reserve full iptables disabling for situations where your security policy or external firewall manager demands it. When you do disable it, automate the rule generation and test thoroughly before deploying to production.
