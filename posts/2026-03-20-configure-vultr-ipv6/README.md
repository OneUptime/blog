# How to Configure Vultr Instances with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Vultr, Cloud, VPS, Networking

Description: Configure IPv6 on Vultr cloud instances, including enabling IPv6 at deployment, OS-level configuration, and firewall setup.

## Introduction

Vultr provides IPv6 on all instances. Each instance receives a /64 IPv6 subnet. IPv6 must be explicitly enabled during instance creation or can be added to existing instances via the Vultr API or console.

## Enabling IPv6 via Vultr CLI

```bash
# Install vultr-cli

curl -sSL https://github.com/vultr/vultr-cli/releases/latest/download/vultr-cli_linux_amd64.tar.gz | tar xz

# Create instance with IPv6
vultr-cli instance create \
  --region "ewr" \
  --plan "vc2-2c-4gb" \
  --os 387 \
  --ipv6=true

# List IPv6 addresses on an instance
vultr-cli instance ipv6 list <instance-id>
```

## Terraform for Vultr with IPv6

```hcl
resource "vultr_instance" "web" {
  plan      = "vc2-2c-4gb"
  region    = "ewr"
  os_id     = 387  # Ubuntu 22.04
  label     = "web-server"

  enable_ipv6 = true

  user_data = <<-EOF
    #!/bin/bash
    # cloud-init configures IPv6 automatically on Vultr Ubuntu images
    apt-get update -y
    apt-get install -y nginx
  EOF
}

output "instance_ipv6" {
  value = vultr_instance.web.v6_main_ip
}

output "ipv6_network" {
  value = vultr_instance.web.v6_network
}
```

## Manual OS Configuration

```bash
# Vultr Ubuntu 22.04 auto-configures IPv6 via cloud-init
# If not auto-configured, set up manually:

# Get your IPv6 address from Vultr console
# e.g., 2001:19f0:5:1234:5400:02ff:fe00:0001/64

# Netplan configuration
cat > /etc/netplan/60-vultr-ipv6.yaml << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - "2001:19f0:5:1234:5400:02ff:fe00:0001/64"
      routes:
        - to: "::/0"
          via: "fe80::1"
          on-link: true
      nameservers:
        addresses:
          - "2001:19f0:300:1704::6"  # Vultr's IPv6 DNS
          - "2606:4700:4700::1111"
EOF
netplan apply
```

## Vultr Firewall Group for IPv6

```bash
# Create a firewall group
FWID=$(vultr-cli firewall group create | grep "^ID:" | awk '{print $2}')

# Add IPv6 rules
vultr-cli firewall rule create \
  --id "$FWID" \
  --protocol tcp \
  --port 80 \
  --size 0 \
  --ip-type "v6" \
  --subnet "::"   # All IPv6

vultr-cli firewall rule create \
  --id "$FWID" \
  --protocol tcp \
  --port 443 \
  --size 0 \
  --ip-type "v6" \
  --subnet "::"

# SSH from specific IPv6
vultr-cli firewall rule create \
  --id "$FWID" \
  --protocol tcp \
  --port 22 \
  --size 128 \
  --ip-type "v6" \
  --subnet "your-ipv6"

# Attach firewall to instance
vultr-cli instance update-firewall-group \
  --instance-id <instance-id> \
  --firewall-group-id "$FWID"
```

## Testing Vultr IPv6

```bash
# Verify IPv6 connectivity
ping6 2001:4860:4860::8888
traceroute6 2001:4860:4860::8888

# Check reverse DNS
host 2001:19f0:5:1234::1
# 1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.4.3.2.1.5.0.0.0.0.f.9.1.1.0.0.2.ip6.arpa domain name pointer ...

# Set reverse DNS via the CLI
vultr-cli instance reverse-dns set-ipv6 <instance-id> \
  --ip "2001:19f0:5:1234::1" \
  --entry "mail.example.com"
```

## Conclusion

Vultr instances support IPv6 with a /64 subnet per instance. Enable IPv6 during creation with `--ipv6` or via the API. Netplan auto-configures from cloud-init on Ubuntu. Use Vultr Firewall Groups to control IPv6 ingress. Monitor Vultr instance IPv6 availability with OneUptime to ensure external reachability.
