# Validation Summary: How to Set Up Traefik with Automatic Let's Encrypt TLS on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Traefik Proxy
- Let's Encrypt ACME HTTP-01 challenge
- TLS certificates
- systemd services
- firewalld
- YAML configuration

## Sources Consulted
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik EntryPoints documentation: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik File provider documentation: https://doc.traefik.io/traefik/reference/install-configuration/providers/others/file/
- Traefik GitHub releases: https://github.com/traefik/traefik/releases
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- systemd.exec manual: https://www.freedesktop.org/software/systemd/man/systemd.exec.html

## Issues Found
- The installation commands pinned Traefik `v3.0.0`, while current Traefik releases are in the `v3.7.x` series. Updated the binary download URL to `v3.7.1` to avoid sending readers to an outdated release.
- The systemd setup created `/var/lib/traefik` but did not create the ACME storage file with restrictive permissions. Added `touch`, `chmod 600`, and ownership commands for `/var/lib/traefik/acme.json`, matching Traefik's ACME storage expectations.
- The final explanation said Traefik requests a certificate when the first HTTPS request arrives. Adjusted the wording to match Traefik's documented behavior: ACME domains are derived from routers that reference the certificate resolver.

## Review Notes
The Traefik static and dynamic YAML examples use valid current keys for entry points, HTTP-to-HTTPS redirection, the file provider, routers, services, and ACME HTTP-01. The HTTP-01 challenge requires port 80 to be reachable by Let's Encrypt, and the post's firewalld commands correctly open HTTP and HTTPS permanently before reloading firewalld.
