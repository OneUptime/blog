# Validation Summary: How to Install and Configure Falco for Runtime Security on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Falco
- Falco modern eBPF driver
- systemd
- DNF/RPM package management
- SELinux troubleshooting

## Sources Consulted
- Falco official documentation: Install on a host (DEB, RPM): https://falco.org/docs/setup/packages/
- Falco official documentation: Configuration Options: https://falco.org/docs/reference/daemon/config-options/

## Issues Found
- The installation command used `<package-name>` instead of the actual Falco RPM repository setup and package name. Replaced it with the official Falco package signing key import, RPM repository configuration, system update, and `falco` package installation commands.
- The post used placeholder configuration and service paths such as `/etc/<service>/config.conf` and `<service-name>`. Replaced them with Falco's actual configuration file, `/etc/falco/falco.yaml`, and the relevant systemd service commands.
- The configuration guidance listed generic settings such as listening addresses and authentication settings. Replaced that with Falco-specific configuration areas, including `rules_files`, output settings, and alert `priority`.
- The verification and troubleshooting commands used placeholders. Replaced them with concrete `systemctl`, `journalctl`, and RPM checks for Falco.

## Review Notes
The guide now uses the modern eBPF driver path, which is appropriate for a concise RHEL 9 setup because Falco documents that DKMS, kernel headers, and compiler dependencies are not needed for modern eBPF. Systems using the kernel module or classic eBPF probe may still require additional driver dependencies and setup.
