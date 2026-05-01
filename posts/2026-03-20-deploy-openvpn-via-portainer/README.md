# How to Deploy OpenVPN via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OpenVPN, VPN, Docker, Networking, Self-Hosting, Security

Description: Learn how to deploy an OpenVPN server via Portainer using the kylemanna/openvpn image, with step-by-step PKI initialization and client certificate generation.

---

OpenVPN is battle-tested and widely supported across all platforms. The `kylemanna/openvpn` image handles PKI management and configuration generation, making it practical to self-host without deep OpenVPN expertise.

## Prerequisites

- Portainer running on a Linux host
- Port `1194/udp` open on your firewall
- A public IP or DDNS hostname

## Compose Stack

OpenVPN needs the `NET_ADMIN` capability and a TUN device. Initialize the PKI before first start:

```yaml
services:
  openvpn:
    image: kylemanna/openvpn:latest
    restart: unless-stopped
    cap_add:
      - NET_ADMIN    # Required for VPN tunnel management
    devices:
      - /dev/net/tun # TUN device for creating virtual network interfaces
    ports:
      - "1194:1194/udp"
    volumes:
      - openvpn_data:/etc/openvpn

volumes:
  openvpn_data:
    name: openvpn_data
```

## Initializing the PKI

Before deploying via Portainer, run these one-time init commands against the same Docker volume the stack uses. Replace `vpn.example.com` with your server's public hostname:

```bash
# Step 1: Generate the server configuration

docker run --rm -v openvpn_data:/etc/openvpn kylemanna/openvpn \
  ovpn_genconfig -u udp://vpn.example.com

# Step 2: Initialize the certificate authority (CA)
# You will be prompted to set a CA passphrase
docker run --rm -it -v openvpn_data:/etc/openvpn kylemanna/openvpn \
  ovpn_initpki
```

After init, deploy the stack in Portainer. The container will start the OpenVPN server using the generated PKI.

## Generating Client Certificates

For each client device, generate a certificate and export an `.ovpn` profile:

```bash
# Create a client certificate (no password)
docker run --rm -it -v openvpn_data:/etc/openvpn kylemanna/openvpn \
  easyrsa build-client-full clientname nopass

# Export the .ovpn profile (includes embedded certs)
docker run --rm -v openvpn_data:/etc/openvpn kylemanna/openvpn \
  ovpn_getclient clientname > clientname.ovpn
```

Import `clientname.ovpn` into the OpenVPN client app on any device.

## Monitoring

Use OneUptime to monitor the host's public IP on port `1194` UDP. Because UDP monitoring can be tricky, also set up a secondary HTTP monitor to an internal resource using a OneUptime custom probe inside the private network. If that secondary monitor fails, investigate the VPN tunnel or the internal target.
