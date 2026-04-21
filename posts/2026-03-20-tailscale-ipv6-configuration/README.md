# How to Configure Tailscale with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tailscale, IPv6, VPN, WireGuard, Mesh Network, Zero-Config

Description: A guide to Tailscale's IPv6 support, including how Tailscale assigns IPv6 addresses to devices, configures dual-stack connectivity, and handles IPv6 exit nodes.

Tailscale is a mesh VPN built on WireGuard that automatically handles IPv6 in several ways: assigning IPv6 addresses within the Tailscale network (from the `fd7a:115c:a1e0::/48` range), supporting IPv6 as a transport protocol for WireGuard connections, and providing IPv6 exit nodes.

## Tailscale IPv6 Address Assignment

Every Tailscale device automatically receives an IPv6 address:

```text
IPv4 Tailscale address: an address from 100.64.0.0/10 (Carrier-Grade NAT range)
IPv6 Tailscale address: an address from fd7a:115c:a1e0::/48 (unique-local range)
```

```bash
# After installing Tailscale, check assigned addresses

tailscale ip

# Example output:
# 100.126.153.111                              (IPv4)
# fd7a:115c:a1e0:ab12:4843:cd96:627e:9975     (IPv6)

# Or check via ip command
ip addr show tailscale0
```

## Installing Tailscale

```bash
# Linux (official script)
curl -fsSL https://tailscale.com/install.sh | sh

# Debian Bookworm manual
curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.noarmor.gpg | \
  sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null

curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.tailscale-keyring.list | \
  sudo tee /etc/apt/sources.list.d/tailscale.list

sudo apt-get update && sudo apt-get install tailscale

# Start and authenticate
sudo tailscale up
```

## Enabling IPv6 Transport

Tailscale uses public IPv6 transport automatically when both peers have public IPv6 connectivity:

```bash
# Check whether the current network has public IPv6 connectivity
tailscale netcheck

# Check if peers are connected via IPv6
tailscale status

# Tailscale will show something like:
# 100.64.0.10  hostname  user@  linux  active; relay "nyc", tx 1.5MB, rx 2.3MB
# or
# 100.64.0.10  hostname  user@  linux  active; direct [2001:db8::1]:41641, tx ...
# "direct [2001:db8::...]" means IPv6 direct connection
```

## Pinging Over IPv6 with Tailscale

```bash
# Ping via Tailscale IPv6 address
ping -6 fd7a:115c:a1e0:ab12:4843:cd96:627e:9975

# Or use the hostname (resolves to both IPv4 and IPv6 Tailscale addresses)
ping -6 hostname.tailnet-name.ts.net

# Check MagicDNS resolves IPv6
dig AAAA hostname.tailnet-name.ts.net
```

## IPv6 Exit Node Configuration

An exit node routes all your traffic through another Tailscale device, including IPv6:

```bash
# On a Linux exit node: enable IP forwarding
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf

# On the exit node: advertise as exit node
sudo tailscale set --advertise-exit-node

# On the Tailscale admin panel: approve the exit node
# https://login.tailscale.com/admin/machines

# On client: use the exit node
sudo tailscale set --exit-node=100.64.0.10
# or by name
sudo tailscale set --exit-node=exit-node-hostname

# Optional: allow access to the client's local LAN while using the exit node
sudo tailscale set --exit-node=exit-node-hostname --exit-node-allow-lan-access=true
```

## Subnet Routing with IPv6

Tailscale can route to subnets beyond the tailnet, including IPv6 subnets:

```bash
# On a Linux subnet router: enable IPv6 forwarding
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf

# Advertise an IPv6 subnet as accessible via this Tailscale node
sudo tailscale set --advertise-routes=2001:db8:1234::/48

# On the Tailscale admin panel: approve the subnet route
# https://login.tailscale.com/admin/machines

# On Linux clients: enable subnet routing
sudo tailscale set --accept-routes
```

## Verifying Dual-Stack Tailscale

```bash
# Check all Tailscale IPs
tailscale ip -4    # IPv4 only
tailscale ip -6    # IPv6 only

# Test connectivity to another device using its Tailscale IPv6 address
ping -6 fd7a:115c:a1e0:ab12:4843:cd96:627e:9975

# View network status including IPv6 connections
tailscale status --peers
```

## DNS and IPv6 with Tailscale MagicDNS

```bash
# MagicDNS automatically creates AAAA records for Tailscale devices
dig AAAA my-server.tailnet-name.ts.net

# Verify DNS resolution returns IPv6 Tailscale address
nslookup -type=AAAA my-server.tailnet-name.ts.net 100.100.100.100
# 100.100.100.100 is Tailscale's MagicDNS resolver
```

Tailscale's automatic IPv6 address assignment and transparent IPv6 transport support means most IPv6 features work without any additional configuration - Tailscale handles the addressing and routing automatically.
