# How to Run WireGuard in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WireGuard, Podman, VPN, Container, Networking, Linux, Security

Description: Learn how to deploy WireGuard VPN inside a Podman container for a secure, lightweight, and easily reproducible VPN setup on any Linux host.

---

> WireGuard is one of the fastest and simplest VPN protocols available. Running it inside a Podman container keeps your host clean and makes the entire setup portable and reproducible.

WireGuard has rapidly become the go-to VPN solution for Linux users thanks to its small codebase, modern cryptography, and kernel-level performance. By running WireGuard inside a Podman container, you gain the ability to version your configuration, tear down and rebuild the VPN in seconds, and isolate VPN traffic from the rest of your system. This guide walks through every step from initial setup to verifying your tunnel.

---

## Prerequisites

Before you begin, make sure you have the following in place:

- A Linux host with Podman installed (version 4.0 or later recommended).
- Root or sudo access (WireGuard requires `NET_ADMIN`; `SYS_MODULE` is only needed if the container must load kernel modules).
- The WireGuard kernel module available on the host (`modprobe wireguard`).
- A basic understanding of public/private key cryptography.

---

## Step 1: Load the WireGuard Kernel Module

WireGuard runs as a kernel module on the host even when the userspace tools are inside the container. Load it before starting anything:

```bash
# Load the WireGuard kernel module on the host

sudo modprobe wireguard

# Verify the module is loaded
lsmod | grep wireguard
```

If you see output showing `wireguard` in the list, you are ready to proceed. On modern kernels (5.6 and later), WireGuard is included in the mainline kernel and this step may already be satisfied.

---

## Step 2: Generate WireGuard Keys

You need a key pair for the server (the container) and one for each client that will connect. You can generate these on your host or inside a temporary container:

```bash
# Generate the server private key and derive the public key
umask 077
wg genkey | tee server_private.key | wg pubkey > server_public.key

# Generate a client key pair
wg genkey | tee client_private.key | wg pubkey > client_public.key

# Display the keys so you can use them in configuration files
echo "Server Private Key: $(cat server_private.key)"
echo "Server Public Key:  $(cat server_public.key)"
echo "Client Private Key: $(cat client_private.key)"
echo "Client Public Key:  $(cat client_public.key)"
```

Keep the private keys secret. You will embed them in configuration files next.

---

## Step 3: Create the Server Configuration

Create a directory to hold your WireGuard configuration, then write the server config file:

```bash
# Create a directory for WireGuard config on the host
mkdir -p ~/wireguard-config/wg_confs

# Create the server configuration file
cat > ~/wireguard-config/wg_confs/wg0.conf << 'EOF'
[Interface]
# The server private key generated in Step 2
PrivateKey = <SERVER_PRIVATE_KEY>

# The VPN subnet address for this server
Address = 10.10.0.1/24

# The port WireGuard listens on
ListenPort = 51820

# NAT rules so VPN clients can reach the internet through this server
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# The client public key generated in Step 2
PublicKey = <CLIENT_PUBLIC_KEY>

# The IP address this client is allowed to use inside the VPN
AllowedIPs = 10.10.0.2/32
EOF
```

Replace `<SERVER_PRIVATE_KEY>` and `<CLIENT_PUBLIC_KEY>` with the actual keys from Step 2.

---

## Step 4: Run the WireGuard Container

Use the popular `linuxserver/wireguard` image, which bundles the WireGuard userspace tools and a lightweight init system:

```bash
# Run the WireGuard container with required capabilities and volumes
podman run -d \
  --name wireguard \
  --cap-add NET_ADMIN \
  --cap-add SYS_MODULE \
  --sysctl net.ipv4.ip_forward=1 \
  --sysctl net.ipv4.conf.all.src_valid_mark=1 \
  -v ~/wireguard-config:/config:Z \
  -v /lib/modules:/lib/modules:ro \
  -p 51820:51820/udp \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=UTC \
  --restart unless-stopped \
  lscr.io/linuxserver/wireguard:latest
```

Key flags explained:

| Flag | Purpose |
|------|---------|
| `--cap-add NET_ADMIN` | Allows the container to create and manage network interfaces |
| `--cap-add SYS_MODULE` | Allows loading kernel modules if needed |
| `--sysctl net.ipv4.ip_forward=1` | Enables IP forwarding so traffic can pass through the VPN |
| `-v ~/wireguard-config:/config:Z` | Mounts your config directory; `:Z` handles SELinux labels |
| `-v /lib/modules:/lib/modules:ro` | Gives read-only access to host kernel modules |
| `-p 51820:51820/udp` | Exposes the WireGuard UDP port |

---

## Step 5: Create the Client Configuration

On the device that will connect to the VPN, create a client configuration file:

```ini
[Interface]
# The client private key
PrivateKey = <CLIENT_PRIVATE_KEY>

# The client IP inside the VPN subnet
Address = 10.10.0.2/24

# Use the VPN server for DNS resolution
DNS = 1.1.1.1

[Peer]
# The server public key
PublicKey = <SERVER_PUBLIC_KEY>

# Route all traffic through the VPN (full tunnel)
AllowedIPs = 0.0.0.0/0

# The public IP or hostname of your server and the WireGuard port
Endpoint = your.server.ip:51820

# Send a keepalive packet every 25 seconds to maintain NAT mappings
PersistentKeepalive = 25
```

Replace the placeholder values with your actual keys and server IP.

---

## Step 6: Verify the Tunnel

After the client connects, check the tunnel status from inside the container:

```bash
# Execute the wg show command inside the running container
podman exec wireguard wg show

# You should see output showing the interface, peer, and handshake information
# Example output:
# interface: wg0
#   public key: <SERVER_PUBLIC_KEY>
#   listening port: 51820
#
# peer: <CLIENT_PUBLIC_KEY>
#   endpoint: <client_ip>:<client_port>
#   allowed ips: 10.10.0.2/32
#   latest handshake: 5 seconds ago
#   transfer: 1.24 MiB received, 3.50 MiB sent
```

---

## Managing the Container

Common management commands:

```bash
# View container logs for troubleshooting
podman logs wireguard

# Stop the WireGuard container
podman stop wireguard

# Start it again
podman start wireguard

# Remove the container entirely (config files on disk are preserved)
podman rm -f wireguard

# Restart after changing configuration
podman restart wireguard
```

---

## Running as a Systemd Service

To ensure WireGuard starts automatically on boot, generate a systemd unit file. Note that `podman generate systemd` is deprecated in favor of Quadlet. The command still works but will not receive new features. For new deployments, consider using Quadlet `.container` files instead (see the [Podman Quadlet documentation](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)):

```bash
# Generate a systemd service file for the container (deprecated, use Quadlet for new setups)
podman generate systemd --name wireguard --new --files

# Move the generated file to the systemd directory
sudo mv -Z container-wireguard.service /etc/systemd/system/

# Reload systemd and enable the service
sudo systemctl daemon-reload
sudo systemctl enable container-wireguard.service

# Start the service
sudo systemctl start container-wireguard.service

# Check service status
sudo systemctl status container-wireguard.service
```

---

## Security Considerations

Running WireGuard in a container does not weaken its encryption. However, keep these points in mind:

- Store private keys with restrictive file permissions (`chmod 600`).
- Use the `:Z` volume flag on SELinux-enabled hosts to apply correct labels.
- Limit published ports to only what is necessary (UDP 51820).
- Regularly update the container image to pick up security patches.
- Consider running the container in a dedicated Podman pod if you need to pair it with other services.

---

## Conclusion

Running WireGuard inside a Podman container gives you a portable, reproducible VPN server that can be deployed or torn down in seconds. The configuration lives on the host filesystem, so you can version-control it, back it up, or migrate it to another machine with minimal effort. Combined with systemd integration, this setup is production-ready and requires very little ongoing maintenance.
