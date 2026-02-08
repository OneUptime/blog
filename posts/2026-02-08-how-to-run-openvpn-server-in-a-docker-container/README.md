# How to Run OpenVPN Server in a Docker Container

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, OpenVPN, VPN, Networking, Security, DevOps

Description: Step-by-step guide to running a fully functional OpenVPN server inside a Docker container with certificate management and client configuration.

---

Running an OpenVPN server in Docker simplifies deployment, makes it portable across hosts, and keeps the VPN isolated from the rest of your system. You get a fully functional VPN server with certificate management, client configs, and automatic restarts, all wrapped in a single container. This guide walks through the entire setup from scratch.

## Prerequisites

You need a server with a public IP address, Docker installed, and UDP port 1194 open in your firewall. Any Linux distribution with Docker support works. The server needs at least 512MB of RAM and minimal CPU.

Open the required port in your firewall:

```bash
# Allow UDP traffic on port 1194 for OpenVPN
sudo ufw allow 1194/udp
```

## Quick Setup with kylemanna/openvpn

The `kylemanna/openvpn` image is the most popular and well-maintained OpenVPN Docker image. It handles certificate generation, server configuration, and client management.

### Step 1: Create a Volume for Persistent Data

OpenVPN needs to store certificates, keys, and configuration files. Use a Docker volume so this data survives container restarts:

```bash
# Create a named volume for OpenVPN data
docker volume create ovpn-data
```

### Step 2: Generate Server Configuration

Initialize the OpenVPN configuration with your server's public IP or hostname:

```bash
# Generate the OpenVPN server config (replace with your server's IP or domain)
docker run -v ovpn-data:/etc/openvpn --rm kylemanna/openvpn \
  ovpn_genconfig -u udp://vpn.example.com
```

This creates the server configuration, iptables rules, and sets up the routing.

### Step 3: Initialize the PKI (Certificate Authority)

Generate the Certificate Authority (CA) that will sign all client and server certificates:

```bash
# Initialize the PKI - you'll be prompted to set a CA passphrase
docker run -v ovpn-data:/etc/openvpn --rm -it kylemanna/openvpn \
  ovpn_initpki
```

This process asks you to:
1. Set a CA passphrase (remember this, you will need it for every client certificate you generate)
2. Confirm the Common Name (press Enter to accept the default)

The process takes a minute or two to generate the Diffie-Hellman parameters.

### Step 4: Start the OpenVPN Server

Launch the server container:

```bash
# Start the OpenVPN server container
docker run -d \
  --name openvpn-server \
  -v ovpn-data:/etc/openvpn \
  -p 1194:1194/udp \
  --cap-add NET_ADMIN \
  --restart unless-stopped \
  kylemanna/openvpn
```

Flags explained:
- `-p 1194:1194/udp` publishes the OpenVPN port
- `--cap-add NET_ADMIN` allows the container to modify network settings (needed for the VPN)
- `--restart unless-stopped` ensures the VPN comes back after reboots

Check that it is running:

```bash
# Verify the OpenVPN server is running
docker logs openvpn-server
```

You should see `Initialization Sequence Completed` in the logs.

### Step 5: Generate Client Certificates

Create a certificate for each VPN client:

```bash
# Generate a client certificate (you'll enter the CA passphrase)
docker run -v ovpn-data:/etc/openvpn --rm -it kylemanna/openvpn \
  easyrsa build-client-full client1 nopass
```

The `nopass` option creates a certificate without a password. Remove it if you want password-protected client certificates.

### Step 6: Export the Client Configuration

Generate a self-contained .ovpn file that the client can use to connect:

```bash
# Export the client configuration file
docker run -v ovpn-data:/etc/openvpn --rm kylemanna/openvpn \
  ovpn_getclient client1 > client1.ovpn
```

This file contains everything the client needs: the CA certificate, client certificate, client key, and connection settings. Send it securely to the client.

## Managing Multiple Clients

Create certificates for additional users:

```bash
# Generate certificates for more clients
docker run -v ovpn-data:/etc/openvpn --rm -it kylemanna/openvpn \
  easyrsa build-client-full alice nopass

docker run -v ovpn-data:/etc/openvpn --rm -it kylemanna/openvpn \
  easyrsa build-client-full bob nopass

# Export their configs
docker run -v ovpn-data:/etc/openvpn --rm kylemanna/openvpn \
  ovpn_getclient alice > alice.ovpn

docker run -v ovpn-data:/etc/openvpn --rm kylemanna/openvpn \
  ovpn_getclient bob > bob.ovpn
```

## Revoking Client Access

When someone leaves the team or a device is compromised, revoke their certificate:

```bash
# Revoke a client certificate
docker run -v ovpn-data:/etc/openvpn --rm -it kylemanna/openvpn \
  ovpn_revokeclient client1

# Restart the server to pick up the revocation
docker restart openvpn-server
```

## Docker Compose Setup

For a more maintainable setup, use Docker Compose:

```yaml
# docker-compose.yml - OpenVPN server
services:
  openvpn:
    image: kylemanna/openvpn
    container_name: openvpn-server
    cap_add:
      - NET_ADMIN
    ports:
      - "1194:1194/udp"
    volumes:
      - ovpn-data:/etc/openvpn
    restart: unless-stopped

volumes:
  ovpn-data:
    external: true
```

Start the server with:

```bash
# Start the OpenVPN server via Docker Compose
docker compose up -d
```

## Customizing the Server Configuration

You can customize the OpenVPN server by passing additional options during the configuration generation step.

Use TCP instead of UDP (useful when UDP is blocked):

```bash
# Generate config for TCP mode on port 443
docker run -v ovpn-data:/etc/openvpn --rm kylemanna/openvpn \
  ovpn_genconfig -u tcp://vpn.example.com:443
```

Push custom DNS servers to clients:

```bash
# Generate config with custom DNS (Cloudflare DNS)
docker run -v ovpn-data:/etc/openvpn --rm kylemanna/openvpn \
  ovpn_genconfig -u udp://vpn.example.com \
  -n 1.1.1.1 \
  -n 1.0.0.1
```

Enable client-to-client communication:

```bash
# Allow VPN clients to see each other
docker run -v ovpn-data:/etc/openvpn --rm kylemanna/openvpn \
  ovpn_genconfig -u udp://vpn.example.com -C
```

## Connecting Clients

### Linux

```bash
# Connect to the VPN from a Linux client
sudo openvpn --config client1.ovpn
```

### macOS

Install Tunnelblick or the OpenVPN client, then double-click the .ovpn file to import it.

### Windows

Install OpenVPN Connect, import the .ovpn file, and click Connect.

### Docker Client

You can even connect from another Docker container:

```bash
# Run an OpenVPN client in a container
docker run -d \
  --name vpn-client \
  --cap-add NET_ADMIN \
  --device /dev/net/tun \
  -v $(pwd)/client1.ovpn:/vpn/config.ovpn \
  dperson/openvpn-client
```

## Monitoring the Server

Check connected clients:

```bash
# View the OpenVPN status log showing connected clients
docker exec openvpn-server cat /tmp/openvpn-status.log
```

Watch connection events in real time:

```bash
# Follow the OpenVPN server logs
docker logs -f openvpn-server
```

## Security Hardening

A few steps to tighten security:

```bash
# Restrict Docker socket access (the VPN container doesn't need it)
# Never mount /var/run/docker.sock into the VPN container

# Run the container with read-only filesystem where possible
docker run -d \
  --name openvpn-server \
  -v ovpn-data:/etc/openvpn \
  -p 1194:1194/udp \
  --cap-add NET_ADMIN \
  --read-only \
  --tmpfs /tmp \
  --restart unless-stopped \
  kylemanna/openvpn
```

Also consider:
- Use strong CA passphrases
- Rotate client certificates periodically
- Enable logging to an external system for audit trails
- Restrict the container's capabilities to only NET_ADMIN

## Backup and Migration

Back up the VPN data volume to preserve certificates and configuration:

```bash
# Backup the OpenVPN data volume to a tar file
docker run --rm -v ovpn-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/ovpn-backup.tar.gz -C /data .
```

Restore on a new host:

```bash
# Create the volume on the new host
docker volume create ovpn-data

# Restore the backup
docker run --rm -v ovpn-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/ovpn-backup.tar.gz -C /data
```

Then start the OpenVPN container on the new host and everything works with the same certificates and configuration.

## Troubleshooting

**Connection times out:** Check that UDP port 1194 is open in your cloud provider's security group and the host firewall.

**TLS handshake fails:** Verify the client .ovpn file matches the server configuration. Regenerate the client config if needed.

**No internet access after connecting:** The server's iptables rules might not be set up correctly. Check with `docker exec openvpn-server iptables -t nat -L`.

**DNS not resolving:** Push DNS settings to the client by regenerating the server config with the `-n` flag.

## Summary

Running OpenVPN in Docker gives you a portable, reproducible VPN server. The `kylemanna/openvpn` image handles the heavy lifting of PKI management and server configuration. With a Docker volume for persistence and `--restart unless-stopped` for reliability, you get a production-ready VPN server in about five minutes. Manage clients with simple commands, back up with volume exports, and migrate by restoring the volume on a new host.
