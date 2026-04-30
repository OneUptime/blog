# How to Use IPv6 for Home Lab Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Home Lab, Linux, Networking, Static Address, Server

Description: Configure IPv6 for home lab servers with static addresses, local DNS, reverse proxy, and remote access without NAT.

## Why IPv6 is Great for Home Labs

IPv6 removes the need for NAT for home lab servers when you assign globally routable addresses. This means:
- No NAT port forwarding rules to manage
- Each service can have its own address
- Remote access is simpler, with security handled by firewall rules
- Multiple services on the same port across different addresses

## Step 1: Assign Static IPv6 Addresses

For home lab servers, assign static addresses from your delegated prefix:

```bash
# /etc/netplan/01-homelab.yaml (Ubuntu)

network:
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: false          # Disable DHCPv6 on this interface
      accept-ra: false      # Disable SLAAC/router advertisements on this interface
      addresses:
        - "2001:db8:100::10/64"   # Primary server
      routes:
        - to: "::/0"
          via: "2001:db8:100::1"  # Your router
          metric: 100
      nameservers:
        addresses:
          - "2001:db8:100::1"
          - "2001:4860:4860::8888"
  version: 2

sudo netplan apply
```

## Step 2: Local DNS for Home Lab

Add each server to local name resolution for easy access by name:

```text
# /etc/hosts on each client/server (or dnsmasq config for local DNS)
2001:db8:100::10  homeserver.lab.home.arpa
2001:db8:100::20  nas.lab.home.arpa
2001:db8:100::30  pihole.lab.home.arpa
2001:db8:100::40  proxmox.lab.home.arpa
```

Or configure dnsmasq with AAAA records:

```text
# /etc/dnsmasq.d/homelab.conf
aaaa-record=homeserver.lab.home.arpa,2001:db8:100::10
aaaa-record=nas.lab.home.arpa,2001:db8:100::20
aaaa-record=proxmox.lab.home.arpa,2001:db8:100::40
```

## Step 3: Configure SSH for IPv6

SSH works over IPv6 without any changes. Connect using:

```bash
# Connect to home lab server by IPv6 address
ssh user@2001:db8:100::10

# Or by hostname (if DNS is configured)
ssh user@homeserver.lab.home.arpa

# If using link-local (no global address):
ssh user@fe80::1234:5678:abcd:ef01%eth0
```

SSH server configuration for IPv6:

```text
# /etc/ssh/sshd_config
ListenAddress ::    # Listen on all IPv6 interfaces
ListenAddress 0.0.0.0  # And IPv4
AddressFamily any   # Accept both
```

## Step 4: Web Services Over IPv6

Nginx configuration to serve web content over IPv6:

```nginx
server {
    # Listen on IPv6 (and IPv4 via dual-stack)
    listen [::]:80 ipv6only=off;
    listen [::]:443 ssl ipv6only=off;

    server_name homeserver.lab.home.arpa;

    ssl_certificate     /etc/ssl/certs/homelab.crt;
    ssl_certificate_key /etc/ssl/private/homelab.key;

    root /var/www/homelab;
    index index.html;
}
```

Access via browser: `https://[2001:db8:100::10]` (note the square brackets)

## Step 5: Docker with IPv6 in Home Lab

Enable IPv6 in Docker daemon:

```json
// /etc/docker/daemon.json
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:101::/64",
  "ip6tables": true
}
```

Docker compose with IPv6 networking:

```yaml
# compose.yaml

networks:
  homelab:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: "2001:db8:101::/64"

services:
  web:
    image: nginx
    networks:
      homelab:
        ipv6_address: "2001:db8:101::10"
    ports:
      - "[::]:8080:80"
```

## Step 6: Firewall Rules for Home Lab

Apply nftables to control access to home lab servers:

```bash
# /etc/nftables.conf - home lab server firewall

table ip6 filter {
    chain input {
        type filter hook input priority 0; policy drop;

        iifname "lo" accept
        ct state established,related accept
        meta l4proto ipv6-icmp accept

        # SSH only from home LAN
        ip6 saddr 2001:db8:100::/64 tcp dport 22 accept

        # Web services from anywhere
        tcp dport { 80, 443 } accept

        # Prometheus monitoring from monitoring server
        ip6 saddr 2001:db8:100::50 tcp dport 9100 accept
    }
}
```

## Step 7: Remote Access Without Port Forwarding

With IPv6, access your home lab from anywhere on the internet directly:

1. Add firewall rules on your host and, if needed, your router to allow inbound SSH from your remote IP
2. Connect directly: `ssh user@2001:db8:100::10`

No NAT port forwarding in the router is required, though you may still need an IPv6 allow rule on your router/firewall.

## Conclusion

IPv6 transforms home lab networking by removing the need for NAT for internet-routable services. Each server can have a globally routable address, enabling direct inbound connections from the internet when your router and host firewalls allow them. Combine static addresses, local DNS, and nftables firewalls for a clean, professional home lab IPv6 setup.
