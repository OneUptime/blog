# Validation Summary: How to Deploy AdGuard Home via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- AdGuard Home (network-wide DNS-based ad/tracker blocker)
- Portainer (Docker container management UI)
- Docker / Docker Compose
- DNS-over-HTTPS (DoH)
- DNS-over-TLS (DoT)
- Cloudflare, Google, and Quad9 public DNS resolvers
- StevenBlack hosts blocklist
- OneUptime (HTTP and DNS monitoring)

## Sources Consulted
- AdGuard Home Docker Wiki: https://github.com/AdguardTeam/AdGuardHome/wiki/Docker (volume paths `/opt/adguardhome/work` and `/opt/adguardhome/conf`, port 3000 setup wizard, ports 53/853/443/80)
- Cloudflare 1.1.1.1 DoH documentation: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/ (canonical endpoint `https://cloudflare-dns.com/dns-query`)
- Google Public DNS DoH endpoint: `https://dns.google/dns-query` (verified)
- Quad9 DoT hostname: `dns.quad9.net` (verified)
- AdGuard HostlistsRegistry: https://adguardteam.github.io/HostlistsRegistry/ (filter_1.txt is the AdGuard DNS filter)
- StevenBlack/hosts repo: https://github.com/StevenBlack/hosts (raw hosts URL verified)

## Issues Found
- **Incorrect Cloudflare DoH endpoint**: The post listed `https://dns.cloudflare.com/dns-query`, which is not Cloudflare's documented DoH endpoint. The official Cloudflare DNS-over-HTTPS resolver is `https://cloudflare-dns.com/dns-query`. Fixed by updating the URL in the "Configuring Upstream DNS" section.

## Review Notes
- The Compose stack maps host port 443 directly to the container, which will conflict with any existing reverse proxy or webserver on the host using TLS. This is a deployment-specific consideration, not a technical error, so it was not changed.
- The post links port 80 → 8054 for the post-setup admin UI. The user is told to set this during the setup wizard; AdGuard Home defaults to port 80 internally and the wizard prompts the user to choose, so the mapping is consistent with the documented behavior.
- DHCP ports (67/68) and DNSCrypt (5443) are not exposed in the stack — appropriate, since the post does not enable those features.
- The `version: "3.8"` Compose key is obsolete in modern Docker Compose v2 (it is ignored with a warning) but not technically wrong; left as-is to preserve author's style.
