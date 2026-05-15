# Validation Summary: How to Install and Configure Envoy Proxy on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Envoy Proxy
- Envoy static bootstrap configuration
- systemd
- firewalld
- Podman

## Sources Consulted
- Envoy official installation documentation: https://www.envoyproxy.io/docs/envoy/latest/start/install
- Envoy official GitHub release assets: https://github.com/envoyproxy/envoy/releases/tag/v1.38.0
- Envoy quick start and admin interface documentation: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Red Hat Enterprise Linux systemd service management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The original `https://getenvoy.io/linux/rhel/tetrate-getenvoy.repo` repository URL no longer returns a RHEL repository file; it redirects to Envoy's generic installation page. Replaced the repository-based install with the current official Envoy GitHub release binary for Linux x86_64.
- The original direct binary URL, `https://github.com/envoyproxy/envoy/releases/latest/download/envoy-x86_64`, returns 404 for the current Envoy release asset naming. Updated it to the current release asset format, `envoy-1.38.0-linux-x86_64`.
- The original direct binary commands wrote to `/usr/local/bin` without `sudo`, which would fail for a normal sudo-capable user. Added `sudo` to the download and `chmod` commands.
- The `useradd` command would fail if the `envoy` system user already existed. Made user creation idempotent before enabling the service.

## Review Notes
- The Envoy configuration snippet uses current v3 extension type URLs and validates successfully with Envoy 1.38.0.
- The admin interface is bound to `127.0.0.1:9901`, which matches Envoy's security guidance to keep the admin listener local or otherwise protected.
