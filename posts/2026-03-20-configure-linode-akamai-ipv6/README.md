# How to Configure Linode/Akamai Cloud Instances with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linode, Akamai, Cloud, Networking, SLAAC

Description: Configure IPv6 on Linode (now Akamai Cloud) instances, including SLAAC-based address assignment, static IPv6 ranges, and firewall configuration.

## Introduction

Linode (now part of Akamai Cloud) provides IPv6 via SLAAC on all instances by default. Every Linode receives a /128 IPv6 address automatically, and you can request a /56 or /64 range for additional addressing needs.

## IPv6 Assignment on Linode

```bash
# IPv6 is enabled by default on all Linodes

# Check assigned IPv6 address
ip -6 addr show eth0
# inet6 2400:8901::f03c:92ff:fe1a:1234/128 scope global dynamic

# Linode assigns via SLAAC (EUI-64 from MAC)
# Your MAC: f2:3c:92:1a:12:34
# → SLAAC: 2400:8901::f03c:92ff:fe1a:1234

# Check default IPv6 gateway
ip -6 route show default
# default via fe80::1 dev eth0 proto ra metric 1024

# Verify connectivity
ping6 2001:4860:4860::8888
curl -6 https://ipv6.icanhazip.com
```

## Requesting Additional IPv6 Ranges

```bash
# Via Linode CLI (linode-cli)
# Request a /64 range
linode-cli networking v6-range-create \
  --linode_id 12345678 \
  --prefix_length 64

# Or request a /56 (for multiple instances/subnets)
linode-cli networking v6-range-create \
  --linode_id 12345678 \
  --prefix_length 56

# List assigned IPv6 ranges
linode-cli networking v6-ranges
```

## Terraform Configuration

```hcl
# main.tf - Linode instance with IPv6
resource "linode_instance" "web" {
  label       = "web-server"
  type        = "g6-standard-2"
  region      = "us-east"
  image       = "linode/ubuntu22.04"
  authorized_keys = [var.ssh_public_key]

  # IPv6 is enabled by default, no explicit flag needed
}

# Request /56 IPv6 range
resource "linode_ipv6_range" "range" {
  prefix_length = 56
  linode_id     = linode_instance.web.id
}

output "instance_ipv6" {
  value = linode_instance.web.ipv6
}
```

## Static IPv6 Address from Assigned Range

```bash
# After receiving a /56 range (e.g., 2600:3c00:e000::/56)
# Assign a static address from the range

# Ubuntu Netplan
# Individual addresses from a routed range use /128 (the range itself is routed to your Linode)
cat > /etc/netplan/60-ipv6-static.yaml << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - "2600:3c00:e000::1/128"
EOF
netplan apply

# Verify
ip -6 addr show eth0 | grep "2600:3c00:e000"
```

## Linode Firewall for IPv6

```bash
# linode-cli: create a firewall with IPv6 rules
linode-cli firewalls create \
  --label my-firewall \
  --rules.inbound '[
    {"action":"ACCEPT","label":"allow-http","protocol":"TCP","ports":"80","addresses":{"ipv6":["::0/0"]}},
    {"action":"ACCEPT","label":"allow-https","protocol":"TCP","ports":"443","addresses":{"ipv6":["::0/0"]}},
    {"action":"ACCEPT","label":"allow-ssh","protocol":"TCP","ports":"22","addresses":{"ipv6":["your-ipv6/128"]}}
  ]' \
  --rules.inbound_policy DROP \
  --rules.outbound_policy ACCEPT

# Assign firewall to instance
linode-cli firewalls device-create <firewall-id> \
  --type linode \
  --id 12345678
```

## Testing IPv6 Services

```bash
# Test web server on IPv6
nginx -t && systemctl start nginx

# Verify NGINX listens on IPv6
ss -6 -tlnp | grep nginx

# External test
curl -6 https://[2400:8901::f03c:92ff:fe1a:1234]/

# Reverse DNS for IPv6
linode-cli networking ip-update \
  2400:8901::f03c:92ff:fe1a:1234 \
  --rdns mail.example.com
```

## Conclusion

Linode/Akamai Cloud instances receive IPv6 via SLAAC automatically. Request additional /56 or /64 ranges for static addressing requirements. Use Linode Cloud Firewalls with `::0/0` to control IPv6 ingress. Monitor IPv6 availability and latency for all your Linode instances with OneUptime.
