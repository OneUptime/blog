# Validation Summary: How to Set Up Split DNS for Portainer Services - Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Split DNS / split-horizon DNS
- dnsmasq
- systemd-resolved
- Linux `/etc/resolv.conf`
- Public DNS records and Cloudflare DNS proxy status
- Nginx reverse proxy
- Portainer Server
- Docker/self-hosted networking

## Sources Consulted
- dnsmasq man page: https://dnsmasq.org/docs/dnsmasq-man.html
- systemd-resolved service man page: https://www.man7.org/linux/man-pages/man8/systemd-resolved.service.8.html
- Nginx HTTP proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Portainer CE Docker installation documentation: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy
- Cloudflare DNS proxy status documentation: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare 1.1.1.1 resolver documentation: https://developers.cloudflare.com/1.1.1.1/
- Google Public DNS documentation: https://developers.google.com/speed/public-dns/
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- The dnsmasq configuration specified upstream `server=` entries but did not disable reading `/etc/resolv.conf`. dnsmasq documents that `server=` does not suppress `/etc/resolv.conf`; because the guide points `/etc/resolv.conf` at `127.0.0.1`, this could create a forwarding loop. I added `no-resolv` so dnsmasq uses only the listed upstream resolvers.
- The guide wrote to `/etc/resolv.conf` after disabling systemd-resolved, but on systemd-resolved systems `/etc/resolv.conf` is commonly a symlink to a systemd-managed runtime file. I added `sudo rm -f /etc/resolv.conf` before writing the static localhost resolver entry.
- The Cloudflare public DNS example implied DNS lookups always return the configured public IP. Cloudflare proxied records return Cloudflare anycast IPs instead of the origin IP, so I clarified that this test result applies to DNS-only records.

## Review Notes
The dnsmasq snippet was syntax-checked locally with `dnsmasq --test`. Nginx is not installed in this workspace, so the reverse proxy snippet was reviewed against official Nginx and Portainer documentation rather than with `nginx -t`. The example IP `203.0.113.10` is from an RFC 5737 documentation range and should be replaced with the reader's real public IP.
