# Validation Summary: How to Fix 'Firewalld Not Running' and Restore Firewall on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- firewall-offline-cmd
- systemd
- nftables
- dnf
- journalctl

## Sources Consulted
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld firewall-offline-cmd manual: https://firewalld.org/documentation/man-pages/firewall-offline-cmd.html
- firewalld configuration directories documentation: https://firewalld.org/documentation/configuration/directories.html
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- Red Hat Enterprise Linux 9.0 Release Notes, deprecated networking functionality: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/deprecated_functionality
- Local command help for nft: `nft --help`
- Local command help/version for systemd: `systemctl --version`

## Issues Found
- The configuration reset example manually removed files from `/etc/firewalld/zones/` and `/etc/firewalld/services/`. firewalld documents `--reset-to-defaults` for resetting configuration, and `firewall-offline-cmd` is the documented tool to use when the firewalld service is not running. Changed the commands to `sudo firewall-offline-cmd --check-config` and `sudo firewall-offline-cmd --reset-to-defaults`.

## Review Notes
- The remaining `firewall-cmd`, `systemctl`, `journalctl`, `dnf`, and `nft list ruleset` commands are technically valid for RHEL 9 troubleshooting.
- RHEL 9 uses firewalld with the nftables back end, and Red Hat recommends running only one firewall management service, such as `firewalld` or the standalone `nftables` service, on a host.
- The local review environment did not have `firewall-cmd` installed, so firewalld command validation used upstream firewalld documentation instead of local command output.
