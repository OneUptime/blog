# How to Configure Nebula Mesh VPN on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, Networking, Security, Linux

Description: Set up Nebula, a scalable open-source mesh VPN from Slack, on Ubuntu to create a self-hosted overlay network with certificate-based authentication and peer-to-peer connectivity.

---

Nebula is an open-source overlay networking tool originally developed by Slack. It creates a mesh network where every node can communicate directly with every other node using UDP hole-punching, falling back through lighthouse nodes when direct paths fail. Unlike traditional hub-and-spoke VPNs, there's no single bottleneck - nodes communicate peer-to-peer whenever possible.

The key differentiator is that Nebula uses its own certificate authority (CA) for authentication. Every node gets a certificate signed by your CA, and nodes only trust each other if they share the same CA. This makes it more self-contained than solutions that depend on external controllers.

## Architecture Overview

Nebula has three types of nodes:

- **Lighthouse nodes** - have public IP addresses and help other nodes discover each other. They're like STUN servers for the mesh. You need at least one.
- **Regular nodes** - devices in your network. They register with lighthouses to find peers.
- **CA** - not a node in the network, but the certificate authority you use to issue certificates to all nodes.

A typical small setup has one or two lighthouses with public IPs, and many regular nodes anywhere (behind NAT, in cloud, on-premises).

## Installing Nebula

```bash
# Download the latest Nebula release for Linux amd64
# Check https://github.com/slackhq/nebula/releases for the latest version
curl -LO https://github.com/slackhq/nebula/releases/download/v1.9.0/nebula-linux-amd64.tar.gz

# Extract the binaries
tar xzf nebula-linux-amd64.tar.gz

# Install the binaries
sudo mv nebula nebula-cert /usr/local/bin/

# Verify installation
nebula --version
nebula-cert --version
```

## Setting Up the Certificate Authority

The CA should be created on a secure machine - not the lighthouse or any node. You only need the CA key to issue certificates; it doesn't need to be on any production system.

```bash
# Create a directory for CA files
mkdir -p ~/nebula-ca && cd ~/nebula-ca

# Create the CA certificate and key
# The name is just a label - use something descriptive for your organization
nebula-cert ca -name "MyOrg Nebula CA"

# This creates:
# ca.crt - the CA certificate (share this with all nodes)
# ca.key - the private key (keep this secure, never distribute it)

ls -la
```

Protect the CA key carefully. If it's compromised, an attacker can issue valid certificates and join your network.

## Generating Node Certificates

For each node, generate a signed certificate using the CA:

```bash
# Generate a certificate for the lighthouse
# -name: hostname of the node
# -ip: the nebula IP this node will have (pick your own /24 or larger range)
nebula-cert sign -name "lighthouse1" -ip "10.20.0.1/24"

# Generate certificates for regular nodes
nebula-cert sign -name "webserver1" -ip "10.20.0.10/24"
nebula-cert sign -name "dbserver1" -ip "10.20.0.20/24"
nebula-cert sign -name "devlaptop" -ip "10.20.0.100/24"

# Each command creates .crt and .key files for that node
ls -la *.crt *.key
```

Each node needs three files:
1. `ca.crt` - the CA certificate (same for all nodes)
2. `<nodename>.crt` - this node's certificate
3. `<nodename>.key` - this node's private key

## Configuring the Lighthouse

Copy the lighthouse's files to the server, then create the configuration:

```bash
# On the lighthouse server, create the config directory
sudo mkdir -p /etc/nebula

# Copy files to the lighthouse (from your CA machine)
scp ca.crt lighthouse1.crt lighthouse1.key user@lighthouse-ip:/etc/nebula/
```

Create the lighthouse configuration:

```bash
# On the lighthouse server
sudo tee /etc/nebula/config.yaml << 'EOF'
# PKI configuration - paths to certificates
pki:
  ca: /etc/nebula/ca.crt
  cert: /etc/nebula/lighthouse1.crt
  key: /etc/nebula/lighthouse1.key

# Lighthouse configuration
# am_lighthouse: true means this node is a lighthouse
lighthouse:
  am_lighthouse: true
  # Lighthouses don't need to know about other lighthouses
  hosts: []

# Listen configuration
listen:
  host: 0.0.0.0
  port: 4242

# Punch through NAT for peers
punchy:
  punch: true
  respond: true

# Tun interface settings
tun:
  disabled: false
  dev: nebula1
  drop_local_broadcast: false
  drop_multicast: false
  tx_queue: 500
  mtu: 1300

# Logging
logging:
  level: info
  format: text

# Firewall rules
firewall:
  outbound:
    - port: any
      proto: any
      host: any
  inbound:
    - port: any
      proto: icmp
      host: any
    # Allow all traffic from nodes in the same Nebula network
    - port: any
      proto: any
      host: any
EOF
```

Set up the systemd service for the lighthouse:

```bash
sudo tee /etc/systemd/system/nebula.service << 'EOF'
[Unit]
Description=Nebula VPN
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/nebula -config /etc/nebula/config.yaml
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now nebula

# Check status
systemctl status nebula
journalctl -u nebula -f
```

The lighthouse needs UDP port 4242 open in any firewall or security group:

```bash
sudo ufw allow 4242/udp
```

## Configuring Regular Nodes

For each regular node, copy the three certificate files and create a configuration:

```bash
# On each regular node
sudo mkdir -p /etc/nebula

# Copy files (from CA machine)
scp ca.crt webserver1.crt webserver1.key user@webserver1:/etc/nebula/
```

Regular node configuration:

```bash
sudo tee /etc/nebula/config.yaml << 'EOF'
pki:
  ca: /etc/nebula/ca.crt
  cert: /etc/nebula/webserver1.crt
  key: /etc/nebula/webserver1.key

# Specify lighthouse IP addresses (public IP:port pairs)
# Replace with your actual lighthouse's public IP
static_host_map:
  "10.20.0.1": ["203.0.113.10:4242"]

lighthouse:
  am_lighthouse: false
  # How often to check in with lighthouse (seconds)
  interval: 60
  hosts:
    - "10.20.0.1"

listen:
  host: 0.0.0.0
  port: 0  # 0 = random port (fine for non-lighthouse nodes)

punchy:
  punch: true
  respond: true

tun:
  disabled: false
  dev: nebula1
  mtu: 1300

logging:
  level: info
  format: text

# Firewall - restrict what traffic is allowed
firewall:
  outbound:
    - port: any
      proto: any
      host: any
  inbound:
    # Allow ICMP from any Nebula node
    - port: any
      proto: icmp
      host: any
    # Allow SSH from any Nebula node (useful for management)
    - port: 22
      proto: tcp
      host: any
    # Allow application-specific ports
    - port: 80
      proto: tcp
      host: any
    - port: 443
      proto: tcp
      host: any
EOF
```

Install and start Nebula using the same systemd service unit shown above.

## Testing Connectivity

After starting Nebula on multiple nodes:

```bash
# Check the Nebula interface came up
ip addr show nebula1

# Ping another node using its Nebula IP
ping 10.20.0.1  # lighthouse
ping 10.20.0.20  # dbserver1

# Check which peers are connected
# Nebula doesn't have a built-in status command, but you can check the interface
ip route show | grep nebula1

# Watch nebula logs for connection events
journalctl -u nebula -f
```

## Using Groups for Firewall Policy

Nebula certificates can include group memberships, which lets you write firewall rules based on groups rather than individual IPs:

```bash
# Issue a certificate with group membership
nebula-cert sign -name "dbserver1" -ip "10.20.0.20/24" -groups "servers,database"
nebula-cert sign -name "webserver1" -ip "10.20.0.10/24" -groups "servers,web"
nebula-cert sign -name "devlaptop" -ip "10.20.0.100/24" -groups "developers"
```

Then in firewall rules, reference groups:

```yaml
# In config.yaml firewall section on dbserver1
firewall:
  inbound:
    # Only allow port 5432 from nodes in the "web" group
    - port: 5432
      proto: tcp
      group: web
    # Allow SSH only from developers
    - port: 22
      proto: tcp
      group: developers
```

## Certificate Rotation

Certificates have expiration dates. Plan for rotation:

```bash
# Check certificate expiry
nebula-cert print -path /etc/nebula/webserver1.crt

# Issue a new certificate (before the old one expires)
nebula-cert sign -name "webserver1" -ip "10.20.0.10/24" -groups "servers,web" \
    -duration 8760h  # 1 year in hours

# Copy the new cert to the node and restart nebula
sudo systemctl restart nebula
```

Nebula is a solid choice when you want a fully self-hosted mesh VPN without external dependencies. The certificate-based auth model is clean, the peer-to-peer design scales well, and the configuration is explicit enough that you understand exactly what's happening at each layer.
