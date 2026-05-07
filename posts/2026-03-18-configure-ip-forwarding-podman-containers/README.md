# How to Configure IP Forwarding for Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, IP Forwarding, Networking, Container, Linux, Routing

Description: Learn how to configure IP forwarding for Podman containers to enable inter-container routing, external network access, and custom routing topologies.

---

> IP forwarding allows a Linux system to route network packets between different network interfaces, acting as a router. For Podman containers, proper IP forwarding configuration is essential for inter-container communication across networks, NAT-based internet access, and custom routing setups.

By default, Linux does not forward packets between network interfaces. This means that without explicit configuration, containers on different Podman networks cannot communicate with each other, and containers may not be able to reach external networks. IP forwarding bridges this gap by telling the kernel to pass packets from one interface to another.

This guide explains how to enable and configure IP forwarding for Podman containers, covering host-level settings, per-container configuration, custom routing rules, and NAT setup.

---

## Prerequisites

- Podman 4.0 or later
- A Linux system with root access for kernel parameter changes
- Basic understanding of IP networking and routing

```bash
podman --version
```

## Understanding IP Forwarding in Container Context

When you create a Podman network, it creates a bridge interface on the host. Each container gets a virtual ethernet (veth) pair connecting it to the bridge. IP forwarding controls whether the kernel routes packets between these bridges and other interfaces.

```text
Container A (10.89.0.2) <--veth--> Bridge A (10.89.0.1)
                                        |
                                  Host (IP Forward)
                                        |
Container B (10.90.0.2) <--veth--> Bridge B (10.90.0.1)
```

Without IP forwarding, packets from Container A cannot reach Container B even though both bridges exist on the same host.

## Checking Current IP Forwarding Status

Check if IP forwarding is enabled:

```bash
# IPv4

sysctl net.ipv4.ip_forward

# IPv6
sysctl net.ipv6.conf.all.forwarding
```

A value of `1` means forwarding is enabled; `0` means it is disabled.

You can also check per-interface forwarding:

```bash
sysctl net.ipv4.conf.all.forwarding
sysctl net.ipv4.conf.eth0.forwarding
```

## Enabling IP Forwarding

### Temporary (Until Reboot)

```bash
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1
```

### Permanent

Create a sysctl configuration file:

```bash
sudo tee /etc/sysctl.d/99-podman-forwarding.conf > /dev/null << 'EOF'
# Enable IPv4 forwarding for Podman containers
net.ipv4.ip_forward = 1

# Enable IPv6 forwarding for Podman containers
net.ipv6.conf.all.forwarding = 1

# Optional: enable for specific interfaces only
# net.ipv4.conf.eth0.forwarding = 1
EOF

sudo sysctl --system
```

Verify the change:

```bash
sysctl net.ipv4.ip_forward
```

## Podman and IP Forwarding

Podman typically manages IP forwarding automatically when it creates networks. However, there are situations where manual configuration is necessary:

### Rootless Podman

Rootless Podman uses `slirp4netns` or `pasta` for networking, which handles forwarding differently than rootful mode. You can check a running container's network mode with:

```bash
podman inspect test-app --format '{{.HostConfig.NetworkMode}}'
```

For rootless mode with `pasta` (the default in recent Podman versions):

```bash
podman run -d \
  --name test-app \
  --network pasta:--map-gw \
  docker.io/library/nginx:alpine
```

### Rootful Podman

Rootful Podman uses bridge networking with iptables/nftables and requires IP forwarding at the host level:

```bash
sudo podman run -d \
  --name test-app \
  --network bridge \
  -p 8080:80 \
  docker.io/library/nginx:alpine
```

## Inter-Network Container Communication

### Setting Up Cross-Network Routing

Create two networks and enable routing between them:

```bash
podman network create net-a --subnet 10.89.0.0/24
podman network create net-b --subnet 10.90.0.0/24
```

Start containers on each network:

```bash
podman run -d --name app-a --network net-a --cap-add NET_ADMIN docker.io/library/alpine sleep 3600
podman run -d --name app-b --network net-b --cap-add NET_ADMIN docker.io/library/alpine sleep 3600
```

If your firewall policy blocks forwarding between these bridges, allow the routed traffic:

```bash
# Get bridge interface names
BRIDGE_A=$(podman network inspect net-a | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['network_interface'])")
BRIDGE_B=$(podman network inspect net-b | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['network_interface'])")

# Allow forwarding between the two bridges
sudo iptables -A FORWARD -i "$BRIDGE_A" -o "$BRIDGE_B" -j ACCEPT
sudo iptables -A FORWARD -i "$BRIDGE_B" -o "$BRIDGE_A" -j ACCEPT
```

Now get the container IPs:

```bash
# Get container IPs
IP_A=$(podman inspect app-a --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
IP_B=$(podman inspect app-b --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

echo "App A IP: $IP_A"
echo "App B IP: $IP_B"
```

Test connectivity:

```bash
podman exec app-a ping -c 3 "$IP_B"
```

### Using a Router Container

A more structured approach is to use a container as a router between networks:

```bash
podman run -d \
  --name router \
  --network net-a \
  --network net-b \
  --cap-add NET_ADMIN \
  --sysctl net.ipv4.ip_forward=1 \
  docker.io/library/alpine sleep 3600
```

The `--sysctl` flag enables IP forwarding inside the container. Since the router is connected to both networks, it can forward packets between them.

Configure the other containers to use the router:

```bash
ROUTER_IP_A=$(podman inspect router --format '{{index .NetworkSettings.Networks "net-a" "IPAddress"}}')
ROUTER_IP_B=$(podman inspect router --format '{{index .NetworkSettings.Networks "net-b" "IPAddress"}}')

podman exec app-a ip route add 10.90.0.0/24 via "$ROUTER_IP_A"
podman exec app-b ip route add 10.89.0.0/24 via "$ROUTER_IP_B"
```

## Configuring NAT for Container Internet Access

When containers need to access external networks, configure NAT (Network Address Translation):

```bash
# Get the external interface name
EXT_IF=$(ip route | grep default | awk '{print $5}')

# Enable NAT for container traffic
sudo iptables -t nat -A POSTROUTING -s 10.89.0.0/24 -o "$EXT_IF" -j MASQUERADE
sudo iptables -t nat -A POSTROUTING -s 10.90.0.0/24 -o "$EXT_IF" -j MASQUERADE

# Allow forwarded traffic
sudo iptables -A FORWARD -i "$BRIDGE_A" -o "$EXT_IF" -j ACCEPT
sudo iptables -A FORWARD -i "$EXT_IF" -o "$BRIDGE_A" -m state --state RELATED,ESTABLISHED -j ACCEPT
```

## Port Forwarding to Containers

Forward specific ports from the host to containers using iptables DNAT rules:

```bash
# Forward traffic arriving at host port 8080 to container 10.89.0.2:80
sudo iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 10.89.0.2:80
sudo iptables -A FORWARD -p tcp -d 10.89.0.2 --dport 80 -j ACCEPT
```

While Podman handles this automatically with `-p` flags, manual DNAT rules are useful for advanced scenarios.

## Firewall Integration with firewalld

If your system uses firewalld, configure zones for container networks:

```bash
# Create a zone for container traffic
sudo firewall-cmd --permanent --new-zone=podman-containers
sudo firewall-cmd --permanent --zone=podman-containers --add-interface="$BRIDGE_A"
sudo firewall-cmd --permanent --zone=podman-containers --add-masquerade
sudo firewall-cmd --permanent --zone=podman-containers --add-forward

# Allow specific traffic
sudo firewall-cmd --permanent --zone=podman-containers --add-service=http
sudo firewall-cmd --permanent --zone=podman-containers --add-service=https

sudo firewall-cmd --reload
```

## Persisting iptables Rules

Make your iptables rules survive reboots:

```bash
# Using iptables-persistent (Debian/Ubuntu)
sudo apt install iptables-persistent
sudo netfilter-persistent save

# Using iptables-services (Fedora/RHEL)
sudo dnf install iptables-services
sudo sh -c 'iptables-save > /etc/sysconfig/iptables'
sudo systemctl enable iptables
```

Or create a systemd service for custom rules:

```bash
cat > ~/podman-routes.sh << 'SCRIPT'
#!/bin/bash
# Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1

# NAT for container subnets
EXT_IF=$(ip route | grep default | awk '{print $5}')
iptables -t nat -A POSTROUTING -s 10.89.0.0/24 -o "$EXT_IF" -j MASQUERADE
iptables -t nat -A POSTROUTING -s 10.90.0.0/24 -o "$EXT_IF" -j MASQUERADE
SCRIPT
chmod +x ~/podman-routes.sh
```

## Debugging IP Forwarding Issues

### Check Routing Tables

```bash
ip route show
podman exec app-a ip route show
```

### Trace Packet Flow

```bash
# Watch packets on a bridge interface
sudo tcpdump -i "$BRIDGE_A" -n

# Check iptables counters
sudo iptables -L FORWARD -v -n
sudo iptables -t nat -L -v -n
```

### Verify Connectivity Step by Step

```bash
# 1. Container to its gateway
podman exec app-a ping -c 1 10.89.0.1

# 2. Container to host external IP
podman exec app-a ping -c 1 $(hostname -I | awk '{print $1}')

# 3. Container to external network
podman exec app-a ping -c 1 8.8.8.8
```

If step 1 works but step 2 fails, IP forwarding is likely disabled. If step 2 works but step 3 fails, NAT is not configured correctly.

## Conclusion

IP forwarding is a fundamental networking capability that underpins most advanced Podman networking configurations. Whether you need containers on different networks to communicate, require external internet access through NAT, or want to build custom routing topologies with router containers, IP forwarding makes it possible. The key is to enable forwarding at the kernel level, configure appropriate iptables rules for the traffic flows you need, and persist those settings across reboots. With proper IP forwarding configuration, your Podman containers can participate in any network topology your application requires.
