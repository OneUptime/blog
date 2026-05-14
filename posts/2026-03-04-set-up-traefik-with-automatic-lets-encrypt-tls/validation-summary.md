# Validation Summary: How to Set Up Traefik with Automatic Let's Encrypt TLS on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Traefik Proxy
- Let's Encrypt / ACME
- TLS certificates
- systemd
- Cloudflare DNS challenge
- YAML configuration

## Sources Consulted
- Traefik v3.5 ACME certificate resolver documentation: https://doc.traefik.io/traefik/v3.5/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik v3.5 provider overview and file provider references: https://doc.traefik.io/traefik/v3.5/reference/install-configuration/providers/overview/
- Lego DNS provider documentation: https://go-acme.github.io/lego/dns/
- Lego Cloudflare DNS provider documentation: https://go-acme.github.io/lego/dns/cloudflare/
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The DNS challenge section used `export CF_DNS_API_TOKEN=your-api-token`, which only sets the variable for the current shell and would not make it available to a Traefik service started by systemd. Updated the instructions to add the environment variable through a systemd service override and restart Traefik.
- The Cloudflare token requirements were underspecified. Added that the token needs Zone:Read and DNS:Edit permissions, matching the Lego Cloudflare provider documentation used by Traefik.

## Review Notes
The main HTTP-01 ACME configuration, router TLS resolver usage, file provider dynamic configuration, `acme.json` mode `600`, and wildcard certificate requirement for DNS-01 are consistent with current Traefik documentation. The post assumes the Traefik package creates a `traefik` user and service named `traefik`; that is common for packaged installations, but installation method differences may require adjusting the service user or unit name.
