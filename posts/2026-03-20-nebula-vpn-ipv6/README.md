# How to Configure Nebula VPN with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nebula, IPv6, VPN, Mesh Network, Overlay Network, Slack

Description: A guide to configuring Nebula overlay network with IPv6 addressing and IPv6 underlay transport for building secure mesh networks.

Nebula is an open-source overlay networking tool originally developed at Slack. It creates encrypted peer-to-peer tunnels using certificates and supports IPv6 in two ways: using IPv6 as the underlay transport (physical network) and assigning IPv6 addresses within the Nebula overlay network.

## Installing Nebula

```bash
# Download Nebula

curl -L https://github.com/slackhq/nebula/releases/latest/download/nebula-linux-amd64.tar.gz \
  | tar xz

sudo mv nebula nebula-cert /usr/local/bin/
```

## Creating Certificates

```bash
# Create a Certificate Authority
nebula-cert ca -name "My Org CA"

# Create a certificate for the lighthouse (discovery server)
# Note: -ip is deprecated; use -networks (comma-separated CIDRs)
nebula-cert sign -name "lighthouse" -networks "192.168.100.1/24" \
  -groups "lighthouses"

# Create certificates for nodes
# As of Nebula v1.10.0 (Dec 2025), -networks accepts both IPv4 and IPv6
# CIDRs when issuing v2 certs, enabling IPv6 addresses in the overlay too.
nebula-cert sign -name "node1" -networks "192.168.100.2/24" -groups "nodes"
nebula-cert sign -name "node2" -networks "192.168.100.3/24" -groups "nodes"
```

## Lighthouse Configuration

The lighthouse is a publicly accessible node that helps peers discover each other:

```yaml
# /etc/nebula/config-lighthouse.yaml

pki:
  ca: /etc/nebula/ca.crt
  cert: /etc/nebula/lighthouse.crt
  key: /etc/nebula/lighthouse.key

# Listen on both IPv4 and IPv6
listen:
  host: "::"    # :: means all interfaces, both IPv4 and IPv6
  port: 4242

lighthouse:
  am_lighthouse: true

tun:
  dev: nebula0
  drop_local_broadcast: false
  drop_multicast: false
  mtu: 1300

firewall:
  outbound:
    - port: any
      proto: any
      host: any
  inbound:
    - port: any
      proto: icmp
      host: any
```

## Node Configuration with IPv6 Lighthouse Address

```yaml
# /etc/nebula/config-node.yaml

pki:
  ca: /etc/nebula/ca.crt
  cert: /etc/nebula/node1.crt
  key: /etc/nebula/node1.key

# Connect to lighthouse using its IPv6 address
static_host_map:
  "192.168.100.1": ["[2001:db8::1]:4242"]
  # IPv6 address in brackets, same notation as HTTP URLs

lighthouse:
  am_lighthouse: false
  interval: 60
  hosts:
    - "192.168.100.1"    # Lighthouse's overlay IP

# Listen on any interface (uses IPv6 if available)
listen:
  host: "::"
  port: 0    # Random port for outbound connections

punchy:
  punch: true   # UDP hole punching

tun:
  dev: nebula0
  mtu: 1300

firewall:
  outbound:
    - port: any
      proto: any
      host: any
  inbound:
    - port: any
      proto: icmp
      host: any
    - port: 22
      proto: tcp
      group: nodes
```

## IPv6 Underlay Transport

Nebula automatically uses IPv6 for peer connections when:
- Both peers have IPv6 addresses in the `static_host_map`
- The lighthouse has an IPv6 address
- The network path prefers IPv6

```yaml
# Multiple endpoints for a lighthouse (IPv4 and IPv6)
static_host_map:
  "192.168.100.1":
    - "203.0.113.10:4242"     # IPv4
    - "[2001:db8::1]:4242"    # IPv6
```

## Starting Nebula

```bash
# Start as service
sudo systemctl enable nebula
sudo systemctl start nebula

# Or run directly
sudo nebula -config /etc/nebula/config-node.yaml

# Validate that the config parses (does not actually dial the lighthouse)
sudo nebula -config /etc/nebula/config-node.yaml -test

# Verify tunnel interface
ip addr show nebula0
```

## Firewall Rules for Nebula with IPv6

```bash
# Allow Nebula port on IPv6
sudo ip6tables -A INPUT -p udp --dport 4242 -j ACCEPT
sudo ip6tables -A OUTPUT -p udp --sport 4242 -j ACCEPT

# Allow Nebula tunnel traffic
sudo ip6tables -A FORWARD -i nebula0 -j ACCEPT
```

## Monitoring Nebula Connections

```bash
# Enable metrics endpoint
# In config: add:
stats:
  type: prometheus
  listen: 127.0.0.1:8080
  path: /metrics

# Check metrics
curl http://127.0.0.1:8080/metrics | grep nebula
```

Nebula's `host: "::"` configuration makes it straightforward to use IPv6 as the underlay transport for peer discovery and tunneling, enabling IPv6-native Nebula deployments.
