# How to Deploy Pi-hole via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Pi-hole, DNS, Ad Blocking, Self-Hosted, Privacy

Description: Deploy Pi-hole via Portainer as a network-wide DNS ad blocker that eliminates ads, trackers, and malware domains for all devices on your network.

## Introduction

Pi-hole is a network-wide DNS ad blocker. By setting it as the DNS server for your router, devices on your network can benefit from DNS-level blocking without installing browser extensions. Deploying via Portainer makes it easy to update blocklists and manage the configuration.

## Deploy as a Stack

```yaml
services:
  pihole:
    image: pihole/pihole:latest
    container_name: pihole
    network_mode: host   # Optional on Linux if you want Pi-hole to share the host network namespace
    environment:
      TZ: America/New_York
      FTLCONF_webserver_api_password: change_this_password
      FTLCONF_dns_upstreams: 1.1.1.1;1.0.0.1  # Upstream DNS servers
      FTLCONF_dns_dnssec: "true"              # Enable DNSSEC validation
      FTLCONF_dns_revServers: 'true,192.168.1.0/24,192.168.1.1,local'  # Enable reverse DNS lookup
    volumes:
      - pihole_etc:/etc/pihole
    restart: unless-stopped

volumes:
  pihole_etc:
```

Note: `network_mode: host` is one option on Linux, but it is not required for Pi-hole. The default bridge network with published ports also works.

## Bridge Network Alternative

If you cannot use host network mode (e.g., on some NAS devices):

```yaml
services:
  pihole:
    image: pihole/pihole:latest
    container_name: pihole
    environment:
      TZ: America/New_York
      FTLCONF_webserver_api_password: change_this_password
      FTLCONF_dns_upstreams: 1.1.1.1;1.0.0.1
      FTLCONF_dns_listeningMode: 'ALL'
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "80:80/tcp"     # Admin UI
    volumes:
      - pihole_etc:/etc/pihole
    restart: unless-stopped

volumes:
  pihole_etc:
```

## Accessing Pi-hole Admin

Navigate to `http://<host>/admin` and log in with the password configured in `FTLCONF_webserver_api_password`.

## Configure Your Router to Use Pi-hole

In your router's DHCP settings, change the DNS server to Pi-hole's IP (e.g., `192.168.1.100`). This makes devices that use your router's advertised DNS settings use Pi-hole automatically.

## Adding Custom Blocklists

1. In Pi-hole Admin, navigate to **Lists**
2. Click **Add a new list**
3. Popular blocklist URLs:
   - `https://someonewhocares.org/hosts/zero/hosts`
   - `https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts`
   - `https://raw.githubusercontent.com/anudeepND/blacklist/master/adservers.txt`

## Custom DNS Entries (Local Hostnames)

```bash
# Set local DNS records via Pi-hole FTL
docker exec pihole pihole-FTL --config dns.hosts '[ "192.168.1.50 mynas.local", "192.168.1.100 portainer.local", "192.168.1.101 homeassistant.local" ]'
docker exec pihole pihole reloaddns
```

## Update Gravity (Blocklists)

```bash
# Update all blocklists
docker exec pihole pihole -g

# Or via admin UI: Tools > Update Gravity
```

## Allowlist Domains

```bash
# Allowlist a domain
docker exec pihole pihole allow example.com

# Remove from the allowlist
docker exec pihole pihole allow remove example.com
```

## Pi-hole with Unbound (Recursive DNS)

For local recursive DNS resolution, configure Unbound separately to listen on `127.0.0.1:5335`, then point Pi-hole to it:

```yaml
services:
  pihole:
    image: pihole/pihole:latest
    container_name: pihole
    network_mode: host
    environment:
      TZ: America/New_York
      FTLCONF_webserver_api_password: change_this_password
      FTLCONF_dns_upstreams: 127.0.0.1#5335  # Point to Unbound
    volumes:
      - pihole_etc:/etc/pihole
    restart: unless-stopped

volumes:
  pihole_etc:
```

## Conclusion

Pi-hole deployed via Portainer provides network-wide DNS-level blocking for devices on your network. The web admin interface makes it easy to manage blocklists, view query logs, and allowlist legitimate domains. Combined with Unbound for recursive DNS, you reduce your dependence on commercial DNS providers and limit how much of your DNS history any single upstream resolver can see.
