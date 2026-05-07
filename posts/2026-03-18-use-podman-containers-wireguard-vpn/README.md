# How to Use Podman Containers with WireGuard VPN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, WireGuard, VPN, Container, Security, Networking

Description: Learn how to route Podman container traffic through a WireGuard VPN tunnel, run WireGuard inside a container, and create secure inter-host container communication.

---

> WireGuard is a modern, high-performance VPN protocol that integrates cleanly with Linux networking. When combined with Podman, it enables secure tunnels for container traffic, encrypted inter-host communication, and privacy-preserving container deployments.

There are many reasons to route container traffic through a VPN: securing communication between hosts, accessing private networks, protecting container traffic on untrusted networks, or ensuring all outbound traffic exits through a specific endpoint. WireGuard's simplicity and performance make it an ideal VPN protocol for containerized environments.

This guide covers three approaches: running WireGuard on the host and routing containers through it, running WireGuard inside a Podman container, and creating encrypted tunnels between Podman hosts.

---

## Prerequisites

- Podman 4.0 or later
- WireGuard tools installed (`wg` and `wg-quick`)
- Linux kernel 5.6 or later (WireGuard is built into the kernel)
- Root access for network configuration

Install WireGuard tools:

```bash
# Fedora/RHEL

sudo dnf install wireguard-tools

# Ubuntu/Debian
sudo apt install wireguard-tools
```

On systems where WireGuard is packaged as a loadable kernel module, verify it is available:

```bash
sudo modprobe wireguard
lsmod | grep wireguard
```

## Generating WireGuard Keys

Generate a key pair for each peer:

```bash
# Generate private key
wg genkey | tee privatekey | wg pubkey > publickey

# View the keys
cat privatekey
cat publickey
```

For each additional peer, generate a separate key pair.

## Approach 1: Host-Level WireGuard with Container Routing

This approach sets up WireGuard on the host and routes all container traffic through the tunnel.

### Configure the WireGuard Interface

```bash
sudo tee /etc/wireguard/wg0.conf > /dev/null << 'EOF'
[Interface]
PrivateKey = YOUR_PRIVATE_KEY_HERE
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o wg0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o wg0 -j MASQUERADE

[Peer]
PublicKey = PEER_PUBLIC_KEY_HERE
AllowedIPs = 0.0.0.0/0
Endpoint = vpn-server.example.com:51820
PersistentKeepalive = 25
EOF
```

Start the WireGuard interface:

```bash
sudo wg-quick up wg0
```

Verify the connection:

```bash
sudo wg show
```

### Route Container Traffic Through WireGuard

Create a Podman network that routes through the WireGuard interface:

```bash
podman network create vpn-net --subnet 10.89.0.0/24
```

Configure routing rules to send container traffic through WireGuard:

```bash
# Get the Podman network bridge interface
BRIDGE=$(podman network inspect vpn-net | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['network_interface'])")

# Route traffic from the container bridge through WireGuard
sudo iptables -t nat -A POSTROUTING -s 10.89.0.0/24 -o wg0 -j MASQUERADE
sudo iptables -A FORWARD -i "$BRIDGE" -o wg0 -j ACCEPT
sudo iptables -A FORWARD -i wg0 -o "$BRIDGE" -m state --state RELATED,ESTABLISHED -j ACCEPT
```

Run a container on the VPN-routed network:

```bash
podman run -d \
  --name vpn-app \
  --network vpn-net \
  docker.io/library/nginx:alpine
```

Verify traffic is going through the VPN:

```bash
podman run --rm --network container:vpn-app docker.io/curlimages/curl -s https://ifconfig.me
```

The returned IP should match the VPN server's public egress IP, not your host's usual public IP.

## Approach 2: WireGuard Inside a Podman Container

Running WireGuard in a container keeps the VPN configuration isolated and does not affect the host network.

### Create the WireGuard Configuration

```bash
mkdir -p ~/wireguard-container/config/wg_confs

cat > ~/wireguard-container/config/wg_confs/wg0.conf << 'EOF'
[Interface]
PrivateKey = YOUR_PRIVATE_KEY_HERE
Address = 10.0.0.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = PEER_PUBLIC_KEY_HERE
AllowedIPs = 0.0.0.0/0
Endpoint = vpn-server.example.com:51820
PersistentKeepalive = 25
EOF
chmod 600 ~/wireguard-container/config/wg_confs/wg0.conf
```

### Run the WireGuard Container

```bash
podman run -d \
  --name wireguard \
  --cap-add NET_ADMIN \
  --cap-add SYS_MODULE \
  --sysctl net.ipv4.conf.all.src_valid_mark=1 \
  --sysctl net.ipv4.ip_forward=1 \
  -v /lib/modules:/lib/modules:ro \
  -v ~/wireguard-container/config:/config:Z \
  -p 51820:51820/udp \
  lscr.io/linuxserver/wireguard:latest
```

The `NET_ADMIN` capability is required for WireGuard to create and manage network interfaces. If the `wireguard` kernel module is not already loaded on the host, `SYS_MODULE` and a read-only `/lib/modules` bind mount may also be needed.

### Share the VPN Connection with Other Containers

Use Podman's network namespace sharing to let other containers use the WireGuard container's network:

```bash
podman run -d \
  --name vpn-client \
  --network container:wireguard \
  docker.io/library/nginx:alpine
```

The `--network container:wireguard` flag shares the WireGuard container's network namespace, so `vpn-client` uses the VPN tunnel for all its traffic.

Verify:

```bash
podman run --rm --network container:vpn-client docker.io/curlimages/curl -s https://ifconfig.me
```

## Approach 3: Inter-Host Container Communication

Connect Podman containers running on different hosts through a WireGuard tunnel.

### Host A Configuration

```bash
sudo tee /etc/wireguard/wg0.conf > /dev/null << 'EOF'
[Interface]
PrivateKey = HOST_A_PRIVATE_KEY
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = HOST_B_PUBLIC_KEY
AllowedIPs = 10.0.0.2/32, 10.90.0.0/24
Endpoint = host-b.example.com:51820
PersistentKeepalive = 25
EOF

sudo wg-quick up wg0
```

Create a container network:

```bash
podman network create cross-host-net --subnet 10.89.0.0/24

# wg-quick installs a route for 10.90.0.0/24 from the AllowedIPs entry above
```

### Host B Configuration

```bash
sudo tee /etc/wireguard/wg0.conf > /dev/null << 'EOF'
[Interface]
PrivateKey = HOST_B_PRIVATE_KEY
Address = 10.0.0.2/24
ListenPort = 51820

[Peer]
PublicKey = HOST_A_PUBLIC_KEY
AllowedIPs = 10.0.0.1/32, 10.89.0.0/24
Endpoint = host-a.example.com:51820
PersistentKeepalive = 25
EOF

sudo wg-quick up wg0
```

```bash
podman network create cross-host-net --subnet 10.90.0.0/24

# wg-quick installs a route for 10.89.0.0/24 from the AllowedIPs entry above
```

### Test Cross-Host Communication

On Host A:

```bash
podman run -d --name service-a --network cross-host-net --ip 10.89.0.10 docker.io/library/nginx:alpine
```

On Host B:

```bash
podman run --rm --network cross-host-net docker.io/library/alpine \
  wget -qO- http://10.89.0.10:80
```

## DNS Resolution Through the VPN

Configure containers to use DNS servers accessible through the VPN:

```bash
podman run -d \
  --name vpn-dns-app \
  --network vpn-net \
  --dns 10.0.0.1 \
  docker.io/library/nginx:alpine
```

Or configure DNS at the network level:

```bash
podman network create vpn-dns-net \
  --subnet 10.91.0.0/24 \
  --dns 10.0.0.1
```

## Kill Switch Configuration

A kill switch ensures that if the VPN connection drops, container traffic is blocked rather than leaking over the regular network:

```bash
# Block all traffic from the container subnet except through WireGuard
sudo iptables -I FORWARD -s 10.89.0.0/24 ! -o wg0 -j DROP
sudo iptables -I FORWARD -s 10.89.0.0/24 -o wg0 -j ACCEPT
```

On Debian/Ubuntu systems with `iptables-persistent` installed, make these rules persistent:

```bash
sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
```

## Monitoring the VPN Connection

Create a monitoring script:

```bash
cat > ~/vpn-monitor.sh << 'SCRIPT'
#!/bin/bash
echo "=== WireGuard Status ==="
sudo wg show wg0

echo ""
echo "=== Container VPN Status ==="
for container in $(podman ps --format "{{.Names}}"); do
  IP=$(podman run --rm --network "container:$container" docker.io/curlimages/curl -s --max-time 5 https://ifconfig.me 2>/dev/null)
  if [ -n "$IP" ]; then
    echo "$container: Exit IP = $IP"
  else
    echo "$container: No external connectivity"
  fi
done
SCRIPT
chmod +x ~/vpn-monitor.sh
```

## Running WireGuard as a Systemd Service

Ensure WireGuard starts on boot:

```bash
sudo systemctl enable wg-quick@wg0
```

For the containerized WireGuard approach, create a Quadlet unit file:

```ini
# /etc/containers/systemd/wireguard.container
[Container]
ContainerName=wireguard
Image=lscr.io/linuxserver/wireguard:latest
AddCapability=NET_ADMIN
AddCapability=SYS_MODULE
Sysctl=net.ipv4.conf.all.src_valid_mark=1
Sysctl=net.ipv4.ip_forward=1
Volume=/lib/modules:/lib/modules:ro
Volume=/home/YOUR_USER/wireguard-container/config:/config:Z
PublishPort=51820:51820/udp

[Service]
Restart=always

[Install]
WantedBy=multi-user.target default.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start wireguard.service
```

## Conclusion

WireGuard and Podman together provide a flexible foundation for securing container network traffic. Whether you run WireGuard on the host for simplicity, inside a container for isolation, or between hosts for cross-site communication, the configuration remains straightforward. WireGuard is designed to have low overhead, so the performance impact on container traffic is usually low, and its integration with the Linux networking stack makes it a good fit for Podman's standard Linux networking workflows. For production deployments, combine the VPN setup with a kill switch and monitoring to ensure traffic always flows through the encrypted tunnel.
