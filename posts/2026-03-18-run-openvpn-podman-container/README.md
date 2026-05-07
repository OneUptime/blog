# How to Run OpenVPN in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenVPN, Podman, VPN, Container, Networking, Linux, Security

Description: A complete guide to deploying an OpenVPN server inside a Podman container, including certificate generation, client configuration, and systemd integration.

---

> OpenVPN remains one of the most widely supported VPN protocols. Containerizing it with Podman simplifies deployment, isolates the VPN from your host, and makes the entire setup reproducible.

OpenVPN has been the standard open-source VPN solution for over two decades. It supports a wide range of platforms, handles complex network topologies, and uses a proven TLS-based security model. Running OpenVPN inside a Podman container lets you avoid installing packages on the host, keep your PKI files organized in a single directory, and spin up or tear down the VPN with a single command. This guide covers the full setup process using the well-maintained `kylemanna/openvpn` image.

---

## Prerequisites

- A Linux host with Podman installed (version 4.0 or later).
- Root or sudo access (OpenVPN needs `NET_ADMIN` capability).
- A public IP address or domain name for client connections.
- Familiarity with basic networking concepts (ports, routing, NAT).

---

## Step 1: Create a Persistent Data Volume

OpenVPN needs a place to store its configuration, certificates, and keys. Create a named Podman volume for this:

```bash
# Create a named volume to persist OpenVPN configuration and PKI data

podman volume create openvpn-data

# Verify the volume was created
podman volume inspect openvpn-data
```

Using a named volume keeps the data separate from any single container lifecycle. You can remove and recreate the container without losing your certificates.

---

## Step 2: Generate the Server Configuration

Use the OpenVPN image to generate a default server configuration. Replace `vpn.example.com` with your actual server hostname or IP:

```bash
# Generate the OpenVPN server configuration
# The -u flag sets the server URL that clients will connect to
podman run --rm \
  -v openvpn-data:/etc/openvpn:Z \
  docker.io/kylemanna/openvpn:latest \
  ovpn_genconfig -u udp://vpn.example.com
```

This creates the necessary configuration files inside the volume, including the server.conf and supporting scripts.

---

## Step 3: Initialize the PKI (Public Key Infrastructure)

Generate the Certificate Authority (CA) and server certificates:

```bash
# Initialize the PKI - you will be prompted for a CA passphrase
# This passphrase protects your CA private key
podman run --rm -it \
  -v openvpn-data:/etc/openvpn:Z \
  docker.io/kylemanna/openvpn:latest \
  ovpn_initpki
```

During this step you will:

1. Set a passphrase for the CA private key (remember this - you need it to sign client certificates).
2. Confirm the Common Name for the CA (the default is usually fine).
3. Wait while Diffie-Hellman parameters are generated (this can take a minute or two).

---

## Step 4: Start the OpenVPN Server

Run the OpenVPN container in detached mode with the required capabilities:

```bash
# Start the OpenVPN server container
podman run -d \
  --name openvpn \
  --cap-add NET_ADMIN \
  --sysctl net.ipv6.conf.all.disable_ipv6=0 \
  --sysctl net.ipv6.conf.default.forwarding=1 \
  --sysctl net.ipv6.conf.all.forwarding=1 \
  -v openvpn-data:/etc/openvpn:Z \
  -p 1194:1194/udp \
  --restart unless-stopped \
  docker.io/kylemanna/openvpn:latest
```

Key flags explained:

| Flag | Purpose |
|------|---------|
| `--cap-add NET_ADMIN` | Allows the container to manage network interfaces and routing |
| `-v openvpn-data:/etc/openvpn:Z` | Mounts the PKI and config volume with SELinux relabeling |
| `-p 1194:1194/udp` | Publishes the standard OpenVPN UDP port |
| `--restart unless-stopped` | Restarts the container if it exits; use the systemd setup below for reliable boot startup |

---

## Step 5: Generate Client Certificates

Create a certificate for each client that will connect to the VPN:

```bash
# Generate a client certificate without a passphrase (nopass)
# Replace "client1" with a descriptive name for this client
podman run --rm -it \
  -v openvpn-data:/etc/openvpn:Z \
  docker.io/kylemanna/openvpn:latest \
  easyrsa build-client-full client1 nopass

# You will be prompted for the CA passphrase you set in Step 3
```

If you want the client key to be passphrase-protected (recommended for shared devices), omit the `nopass` argument.

---

## Step 6: Export the Client Configuration

Generate a single `.ovpn` file that bundles everything the client needs:

```bash
# Export the client configuration to a .ovpn file
# This file contains the CA cert, client cert, client key, and connection settings
podman run --rm \
  -v openvpn-data:/etc/openvpn:Z \
  docker.io/kylemanna/openvpn:latest \
  ovpn_getclient client1 > client1.ovpn

# Verify the file was created
ls -la client1.ovpn
```

Transfer this `.ovpn` file to the client device securely (for example, using `scp` or an encrypted file transfer tool). Never send it over unencrypted channels.

---

## Step 7: Connect from a Client

On the client machine, use the OpenVPN client to connect:

```bash
# Install OpenVPN client (Debian/Ubuntu)
sudo apt install openvpn

# Connect using the exported configuration file
sudo openvpn --config client1.ovpn

# You should see "Initialization Sequence Completed" when connected
```

---

## Verify the Connection

Check the server-side status from inside the container:

```bash
# View the OpenVPN status log showing connected clients
podman exec openvpn cat /tmp/openvpn-status.log

# Check the container logs for connection events
podman logs --tail 50 openvpn

# Test connectivity by pinging the VPN server from the client
ping 192.168.255.1
```

---

## Managing Clients

Over time you will need to add and revoke clients:

```bash
# Add another client
podman run --rm -it \
  -v openvpn-data:/etc/openvpn:Z \
  docker.io/kylemanna/openvpn:latest \
  easyrsa build-client-full client2 nopass

# Export the new client configuration
podman run --rm \
  -v openvpn-data:/etc/openvpn:Z \
  docker.io/kylemanna/openvpn:latest \
  ovpn_getclient client2 > client2.ovpn

# Revoke a client certificate (when a device is lost or an employee leaves)
podman run --rm -it \
  -v openvpn-data:/etc/openvpn:Z \
  docker.io/kylemanna/openvpn:latest \
  ovpn_revokeclient client1
```

After revoking a client, restart the OpenVPN container to apply the updated CRL:

```bash
podman restart openvpn
```

---

## Running as a Systemd Service

Make OpenVPN start automatically on boot using Quadlet, the recommended way to run Podman containers under systemd (note that `podman generate systemd` is deprecated):

```bash
# Create the Quadlet directory
sudo mkdir -p /etc/containers/systemd

# Stop and remove the manually started container if you created it in Step 4.
# The named volume keeps the OpenVPN configuration and PKI data.
podman rm -f openvpn

# Create a Quadlet container file
sudo tee /etc/containers/systemd/openvpn.container > /dev/null <<'EOF'
[Unit]
Description=OpenVPN Server Container

[Container]
ContainerName=openvpn
Image=docker.io/kylemanna/openvpn:latest
AddCapability=NET_ADMIN
Sysctl=net.ipv6.conf.all.disable_ipv6=0
Sysctl=net.ipv6.conf.default.forwarding=1
Sysctl=net.ipv6.conf.all.forwarding=1
Volume=openvpn-data:/etc/openvpn:Z
PublishPort=1194:1194/udp

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

# Reload systemd to pick up the new Quadlet file
sudo systemctl daemon-reload

# Start and enable the service
sudo systemctl enable --now openvpn.service

# Verify the service is running
sudo systemctl status openvpn.service
```

---

## Switching to TCP (for Restrictive Networks)

Some networks block UDP traffic. You can configure OpenVPN to use TCP instead:

```bash
# Regenerate the server config with TCP
podman run --rm \
  -v openvpn-data:/etc/openvpn:Z \
  docker.io/kylemanna/openvpn:latest \
  ovpn_genconfig -u tcp://vpn.example.com:443

# Recreate the container with the TCP port
podman rm -f openvpn

podman run -d \
  --name openvpn \
  --cap-add NET_ADMIN \
  -v openvpn-data:/etc/openvpn:Z \
  -p 443:1194/tcp \
  --restart unless-stopped \
  docker.io/kylemanna/openvpn:latest

# Re-export client profiles so they use the updated TCP connection settings
podman run --rm \
  -v openvpn-data:/etc/openvpn:Z \
  docker.io/kylemanna/openvpn:latest \
  ovpn_getclient client1 > client1.ovpn
```

---

## Conclusion

Running OpenVPN inside a Podman container gives you a fully functional VPN server without installing OpenVPN packages on the host. All certificates and configuration live in a single named volume that you can back up and restore easily. The combination of Podman's rootless capabilities (where possible), systemd integration, and the battle-tested OpenVPN protocol creates a reliable and maintainable VPN deployment for personal or organizational use.
