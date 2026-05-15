# Validation Summary: How to Install and Configure Vaultwarden on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vaultwarden
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Podman
- systemd Quadlet
- firewalld
- SELinux container volume labeling

## Sources Consulted
- Vaultwarden Wiki: Starting a Container - https://github.com/dani-garcia/vaultwarden/wiki/Starting-a-Container
- Vaultwarden Wiki: Using Podman - https://github.com/dani-garcia/vaultwarden/wiki/Using-Podman
- Red Hat Enterprise Linux 9 documentation: Porting containers to systemd using Podman - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_porting-containers-to-systemd-using-podman_building-running-and-managing-containers
- Podman documentation: volume option and SELinux relabeling - https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post incorrectly installed HashiCorp Vault from the HashiCorp RPM repository instead of Vaultwarden. Replaced the repository and `vault` package commands with RHEL container tooling and a Vaultwarden container deployment.
- The post used placeholder paths and service names such as `/etc/<service>/config.conf` and `<service-name>`. Replaced them with a concrete Podman Quadlet file at `/etc/containers/systemd/vaultwarden.container` and `vaultwarden.service`.
- The post had no valid Vaultwarden configuration. Added a minimal Quadlet configuration using `docker.io/vaultwarden/server:latest`, persistent `/vw-data:/data:Z` storage, port publishing, `DOMAIN`, and `SIGNUPS_ALLOWED`.
- The firewall example used an unresolved `<PORT>` placeholder. Replaced it with `8080/tcp`, matching the published host port.
- The verification commands used HashiCorp Vault CLI commands (`vault status` and `vault secrets list`), which do not verify Vaultwarden. Replaced them with `systemctl status vaultwarden.service` and `curl -I http://localhost:8080`.
- Troubleshooting references used placeholder service and package names. Replaced them with the actual Vaultwarden systemd unit and relevant package checks.
- The tags referenced HashiCorp, which was inaccurate for a Vaultwarden post. Replaced it with Vaultwarden.

## Review Notes
The corrected article uses Podman Quadlet, which Red Hat documents for Podman 4.6 and later. Production Vaultwarden deployments should be placed behind HTTPS; the article now calls out the need for a TLS-capable reverse proxy but does not configure one.
