# How to Enable ip6tables in Docker for IPv6 Network Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Ip6tables, Firewall, Network Isolation, Security

Description: Enable and configure ip6tables in Docker to provide IPv6 network isolation between containers, manage IPv6 firewall rules for Docker networks, and understand how Docker manages ip6tables rules...

## Introduction

When IPv6 is enabled for Docker bridge networking, Docker automatically manages `ip6tables` rules to provide IPv6 network isolation and port mapping. `ip6tables` is enabled by default, but you can set it explicitly in `daemon.json`. If you disable `ip6tables`, Docker stops creating most of its IPv6 firewall rules, which can break expected network isolation and container connectivity. On current Docker Engine releases using the iptables firewall backend, Docker creates chains such as `DOCKER-USER`, `DOCKER-FORWARD`, and `DOCKER`.

## Enable ip6tables in daemon.json

`/etc/docker/daemon.json`

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:dead:beef::/64",
  "ip6tables": true
}
```

```bash
sudo systemctl restart docker

# Verify ip6tables rules are being managed by Docker

sudo ip6tables -L DOCKER -n
# Should show the DOCKER chain with Docker-managed rules

sudo ip6tables -L FORWARD -n
# Should show jumps to Docker-managed chains such as DOCKER-USER and DOCKER-FORWARD
```

## View Docker-Managed ip6tables Rules

```bash
# Dump all ip6tables rules across available tables
sudo ip6tables-save

# List Docker-specific chains
sudo ip6tables -L DOCKER-USER -n -v
sudo ip6tables -L DOCKER-FORWARD -n -v
sudo ip6tables -L DOCKER -n -v

# Nat table (for Docker-managed port mapping and masquerading in nat mode)
sudo ip6tables -t nat -L -n -v

# Docker IPv6 MASQUERADE/SNAT rules
sudo ip6tables -t nat -L POSTROUTING -n -v
# In the default nat gateway mode, should show Docker-managed MASQUERADE/SNAT rules
```

## Add Custom ip6tables Rules

```bash
# Docker creates a DOCKER-USER chain for custom rules
# Add custom rules to DOCKER-USER so they run before Docker's own forwarding rules
# Use one example pattern at a time, not all of them together

# Example: block inbound IPv6 from a specific range to the container subnet
sudo ip6tables -I DOCKER-USER -s 2001:db8:ffff::/48 -d fd00:dead:beef::/64 -j DROP

# Example: allow only a specific IPv6 prefix to reach containers
sudo ip6tables -I DOCKER-USER -s 2001:db8:100::/48 -d fd00:dead:beef::/64 -j ACCEPT
sudo ip6tables -A DOCKER-USER -d fd00:dead:beef::/64 -j DROP

# Example: rate limit IPv6 packets to the container subnet
sudo ip6tables -I DOCKER-USER 1 -p tcp -d fd00:dead:beef::/64 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo ip6tables -I DOCKER-USER 2 -p tcp -d fd00:dead:beef::/64 -m limit --limit 100/second --limit-burst 200 -j ACCEPT
sudo ip6tables -A DOCKER-USER -p tcp -d fd00:dead:beef::/64 -j DROP

# View DOCKER-USER rules
sudo ip6tables -L DOCKER-USER -n -v
```

## Persist ip6tables Rules Across Reboots

```bash
# Install iptables-persistent
sudo apt-get install iptables-persistent

# Save current rules, including custom DOCKER-USER ip6tables rules
sudo netfilter-persistent save

# Rules saved to:
# /etc/iptables/rules.v4
# /etc/iptables/rules.v6

# Verify saved ip6tables rules
sudo cat /etc/iptables/rules.v6

# Restore manually if needed
sudo ip6tables-restore /etc/iptables/rules.v6
```

## Troubleshoot ip6tables Issues

```bash
# Problem: IPv6 container traffic not isolated between networks
# Check: ip6tables is explicitly disabled in daemon.json
sudo test -f /etc/docker/daemon.json && sudo grep -n '"ip6tables"' /etc/docker/daemon.json

# If the file or key is absent, the default is true
# If the key is set to false, change it to true or remove it

# Problem: Container cannot reach IPv6 internet
# Check FORWARD chain policy and Docker-managed jumps
sudo ip6tables -L FORWARD -n -v

# Verify Docker's forwarding chain
sudo ip6tables -L DOCKER-FORWARD -n -v

# Check if MASQUERADE/SNAT is in place for outbound traffic in nat mode
sudo ip6tables -t nat -L POSTROUTING -n | grep -E 'MASQUERADE|SNAT'

# Problem: Custom rules disappear after Docker restart
# Always use DOCKER-USER chain, not DOCKER chain
# Docker re-creates its own chains on restart
# Persist your custom DOCKER-USER rules separately with netfilter-persistent
```

## Conclusion

Enable `ip6tables` in Docker's `daemon.json`, or leave the default enabled setting in place, to get Docker-managed IPv6 network isolation and port mapping for bridge networks. Docker manages chains such as `DOCKER-USER`, `DOCKER-FORWARD`, and `DOCKER` automatically when using the iptables firewall backend. Add custom rules to the `DOCKER-USER` chain and persist those rules using `netfilter-persistent save`. If you disable `ip6tables`, Docker stops creating most IPv6 firewall rules, which can remove expected isolation and break parts of container networking.
