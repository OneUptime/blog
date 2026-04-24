# How to Deploy AdGuard Home via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, AdGuard Home, DNS, Ad Blocking, Privacy, Self-Hosted

Description: Deploy AdGuard Home via Portainer as a feature-rich network-wide DNS ad blocker with DNS-over-HTTPS, parental controls, and a modern web interface.

## Introduction

AdGuard Home is a network-wide DNS ad blocker similar to Pi-hole but with built-in DNS-over-HTTPS (DoH), DNS-over-TLS (DoT), parental controls, and a more modern interface. Deploy it via Portainer for secure, private DNS for your entire network.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  adguard:
    image: adguard/adguardhome:latest
    container_name: adguardhome
    volumes:
      - adguard_work:/opt/adguardhome/work
      - adguard_conf:/opt/adguardhome/conf
    ports:
      - "53:53/tcp"    # DNS
      - "53:53/udp"    # DNS
      - "3000:3000"    # Initial setup UI
      - "80:80"        # Admin UI (after setup)
      - "443:443"      # HTTPS admin + DoH
      - "853:853"      # DNS-over-TLS
    restart: unless-stopped

volumes:
  adguard_work:
  adguard_conf:
```

## Initial Setup

1. Access `http://<host>:3000` for the setup wizard
2. Configure:
   - Admin interface port: 80 (or another port if 80 is taken)
   - DNS server port: 53
   - Create admin username and password
3. Complete setup

## Post-Setup Configuration

Access Admin UI at `http://<host>` if you kept port 80, or `http://<host>:<admin-port>` if you chose a different admin port.

### Configure Upstream DNS

Navigate to **Settings > DNS settings > Upstream DNS servers**:

```text
# Cloudflare DoH (encrypted DNS)

https://dns.cloudflare.com/dns-query

# Quad9 DoH (malware blocking)
https://dns.quad9.net/dns-query

# Google DoH
https://dns.google/dns-query
```

### Enable Bootstrap DNS

```text
1.1.1.1:53
8.8.8.8:53
```

### Add Blocklists

Navigate to **Filters > DNS blocklists > Add blocklist**:

- AdGuard DNS filter (built-in)
- `https://adaway.org/hosts.txt`

## Configure DNS-over-HTTPS

1. Navigate to **Settings > Encryption settings**
2. Enable encryption
3. Set server name: `dns.example.com`
4. Upload or configure SSL certificates
5. Enable DNS-over-HTTPS and DNS-over-TLS

## Configure Parental Controls

1. Navigate to **Settings > General settings**
2. Enable **Parental control**: blocks adult content
3. Enable **Safe search**: enforces safe search on Google, Bing, YouTube

## Custom DNS Rewrites (Local Hostnames)

Navigate to **Filters > DNS rewrites**:

| Domain | Answer |
|--------|--------|
| `portainer.local` | `192.168.1.100` |
| `nas.local` | `192.168.1.50` |
| `homeassistant.local` | `192.168.1.101` |

## Router Configuration

Set AdGuard Home as DNS server in your router's DHCP settings:
- Primary DNS: `192.168.1.100` (AdGuard Home IP)
- Secondary DNS: leave blank if your router allows it, or use a second AdGuard Home instance for redundancy (using a public resolver here can bypass filtering)

## AdGuard Home vs Pi-hole

| Feature | AdGuard Home | Pi-hole |
|---------|-------------|---------|
| DNS-over-HTTPS | Built-in | Requires external setup |
| DNS-over-TLS | Built-in | Requires external setup |
| Parental Controls | Built-in | Limited |
| DNSSEC | Built-in | Built-in |
| Interface | Modern | Functional |
| Resources | Varies by lists and traffic | Varies by lists and traffic |

## Conclusion

AdGuard Home deployed via Portainer offers more security features out-of-the-box than Pi-hole, particularly native DoH and DoT support, which can encrypt upstream DNS traffic and reduce direct ISP visibility into those lookups. The modern web interface simplifies configuration, and built-in parental controls make it family-friendly. For networks where encrypted DNS is important, AdGuard Home is a strong choice.
