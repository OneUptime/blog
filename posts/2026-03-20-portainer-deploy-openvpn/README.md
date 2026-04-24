# How to Deploy OpenVPN via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, OpenVPN, VPN, Self-Hosted, Network, Privacy

Description: Deploy OpenVPN via Portainer using the kylemanna/openvpn image for a flexible, widely-compatible VPN server with easy client certificate management.

## Introduction

OpenVPN is a battle-tested VPN solution with wide client compatibility and flexible network configuration options. While WireGuard is faster, OpenVPN is supported by more devices, corporate firewalls, and legacy clients. This guide deploys OpenVPN via Portainer with the popular kylemanna/openvpn image.

## Prerequisites

- Public IP or dynamic DNS hostname
- Port 1194 (UDP) forwarded to your server
- Portainer installed

## Step 1: Initialize OpenVPN Configuration

Before deploying the container stack, initialize the configuration:

```bash
# Create a volume for OpenVPN data

docker volume create openvpn-data

# Initialize the configuration (replace vpn.example.com with your hostname)
docker run -v openvpn-data:/etc/openvpn --rm kylemanna/openvpn \
  ovpn_genconfig -u udp://vpn.example.com

# Initialize the PKI (certificate authority)
docker run -v openvpn-data:/etc/openvpn --rm -it kylemanna/openvpn \
  ovpn_initpki
```

## Step 2: Deploy as a Stack

```yaml
services:
  openvpn:
    image: kylemanna/openvpn
    container_name: openvpn
    cap_add:
      - NET_ADMIN
    volumes:
      - openvpn_data:/etc/openvpn
    ports:
      - "1194:1194/udp"
    restart: unless-stopped

volumes:
  openvpn_data:
    external: true   # Use the pre-initialized volume
    name: openvpn-data
```

## Step 3: Create Client Certificates

```bash
# Create a client certificate (no passphrase)
docker run -v openvpn-data:/etc/openvpn --rm -it kylemanna/openvpn \
  easyrsa build-client-full CLIENTNAME nopass

# Export client configuration to file
docker run -v openvpn-data:/etc/openvpn --rm kylemanna/openvpn \
  ovpn_getclient CLIENTNAME > CLIENTNAME.ovpn
```

The `.ovpn` file contains everything the client needs to connect.

## Step 4: Revoke a Client

```bash
# Revoke a client certificate
docker run -v openvpn-data:/etc/openvpn --rm -it kylemanna/openvpn \
  ovpn_revokeclient CLIENTNAME
```

## Step 5: Managing Clients via Portainer

Create a helper script for client management:

```bash
#!/bin/bash
# OpenVPN client management script

VOLUME="openvpn-data"
IMAGE="kylemanna/openvpn"

case "$1" in
  add)
    docker run -v ${VOLUME}:/etc/openvpn --rm -it ${IMAGE} \
      easyrsa build-client-full "$2" nopass
    echo "Client '$2' created"
    ;;
  export)
    docker run -v ${VOLUME}:/etc/openvpn --rm ${IMAGE} \
      ovpn_getclient "$2" > "$2.ovpn"
    echo "Exported to $2.ovpn"
    ;;
  revoke)
    docker run -v ${VOLUME}:/etc/openvpn --rm -it ${IMAGE} \
      ovpn_revokeclient "$2"
    echo "Client '$2' revoked"
    ;;
  list)
    docker run -v ${VOLUME}:/etc/openvpn --rm ${IMAGE} \
      ovpn_listclients
    ;;
  *)
    echo "Usage: $0 {add|export|revoke|list} [clientname]"
    ;;
esac
```

## Client Configuration Examples

The generated `.ovpn` file includes everything needed:

```ovpn
client
nobind
dev tun
remote-cert-tls server
remote vpn.example.com 1194 udp

<ca>
-----BEGIN CERTIFICATE-----
...
</ca>

<cert>
-----BEGIN CERTIFICATE-----
...
</cert>

<key>
-----BEGIN PRIVATE KEY-----
...
</key>

<tls-auth>
...
</tls-auth>
key-direction 1
```

## Monitoring Connected Clients

```bash
# View connected clients
docker exec openvpn cat /tmp/openvpn-status.log

# Or view in real-time
docker exec openvpn tail -f /tmp/openvpn-status.log
```

## Conclusion

OpenVPN deployed via Portainer provides a flexible, widely-compatible VPN solution. While the setup requires a pre-initialization step, the resulting deployment is stable and supports a broad range of client devices. The volume-based approach preserves PKI and client configurations across container updates, making client management straightforward.
