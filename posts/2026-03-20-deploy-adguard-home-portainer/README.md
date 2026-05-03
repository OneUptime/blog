# How to Deploy AdGuard Home via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, AdGuard Home, DNS, Ad Blocking, Docker, Self-Hosting, Privacy

Description: Learn how to deploy AdGuard Home, the network-wide DNS-based ad and tracker blocker, via Portainer with support for DNS-over-HTTPS and DNS-over-TLS.

---

AdGuard Home is a modern alternative to Pi-hole with a cleaner UI, built-in DNS-over-HTTPS (DoH) and DNS-over-TLS (DoT) support, and advanced parental controls. Portainer makes the container management straightforward.

## Prerequisites

- Portainer running
- Port 53 available (see Pi-hole guide for freeing it on Ubuntu)
- At least 128MB RAM

## Compose Stack

AdGuard Home exposes multiple ports for different DNS protocols and its admin UI:

```yaml
version: "3.8"

services:
  adguardhome:
    image: adguard/adguardhome:latest
    restart: unless-stopped
    ports:
      - "3000:3000/tcp"   # Initial setup wizard
      - "8054:80/tcp"     # Admin dashboard after setup
      - "53:53/tcp"       # DNS over TCP
      - "53:53/udp"       # DNS over UDP
      - "853:853/tcp"     # DNS-over-TLS (DoT)
      - "443:443/tcp"     # DNS-over-HTTPS (DoH)
    volumes:
      - adguard_work:/opt/adguardhome/work
      - adguard_conf:/opt/adguardhome/conf

volumes:
  adguard_work:
  adguard_conf:
```

## Initial Setup

1. Deploy the stack in Portainer.
2. Open `http://<host>:3000` to run the setup wizard.
3. Set your admin credentials and choose which network interface to listen on.
4. After setup, the dashboard moves to port `80` (mapped to `8054`).

## Configuring Upstream DNS

After setup, go to **Settings > DNS settings** and set upstream resolvers. Use encrypted DNS for privacy:

```text
# Cloudflare DNS-over-HTTPS

https://cloudflare-dns.com/dns-query

# Google DNS-over-HTTPS
https://dns.google/dns-query

# Quad9 DNS-over-TLS
tls://dns.quad9.net
```

## Enabling DNS-over-HTTPS for Clients

AdGuard Home provides a DoH endpoint your devices can use natively:

```text
https://<your-adguard-ip>/dns-query
```

Configure this in browsers via `Settings > Privacy > DNS-over-HTTPS` for encrypted DNS resolution on the client side.

## Block List Management

Add lists under **Filters > DNS blocklists**. AdGuard Home refreshes them automatically on a configurable schedule. Popular lists:

- `https://adguardteam.github.io/HostlistsRegistry/assets/filter_1.txt` (AdGuard DNS filter)
- `https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts` (StevenBlack)

## Monitoring

Use OneUptime to monitor `http://<host>:8054` for HTTP 200. Also create a DNS monitor to verify AdGuard Home is resolving known-good domains. Alert on any DNS resolution failure to catch outages before network-wide ad blocking stops working.
