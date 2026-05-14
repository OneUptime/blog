# Validation Summary: How to Fix 'Firewalld Not Running' and Restore Firewall on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- firewalld
- firewall-cmd
- systemd systemctl
- systemd journalctl
- iptables and nftables firewall backends

## Sources Consulted
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld "Get firewalld State" documentation: https://firewalld.org/documentation/howto/get-firewalld-state.html
- Red Hat Enterprise Linux 8 documentation, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/using-and-configuring-firewalld_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/configuring_firewalls_and_packet_filters/Red_Hat_Enterprise_Linux-9-Configuring_firewalls_and_packet_filters-en-US.pdf
- Local systemctl help output for `status`, `start`, `stop`, `restart`, `enable --now`, `disable`, `is-enabled`, and `unmask`
- Local journalctl help output for `-u`, `--no-pager`, and `-n`

## Issues Found
- The introduction implied firewalld automatically falls back to raw iptables/nftables rules when stopped. Updated it to state that firewalld-managed rules are not applied and that only rules from other services or manual configuration may remain.
- The verification section used `firewall-cmd --list-all`, which lists the default zone unless a zone is specified. Changed it to `--list-all-zones` for both runtime and permanent checks so the command matches the "active zones and their rules" guidance better on multi-zone systems.
- The restore section claimed to remove all custom configuration, but the commands only removed custom zones, services, and `direct.xml`. Narrowed the wording to match the files actually removed.

## Review Notes
The remaining systemctl, journalctl, and firewall-cmd command syntax is valid. The iptables/ip6tables service conflict note is mainly relevant to systems with the legacy `iptables-services` package installed; on newer RHEL installations, nftables is the preferred lower-level framework when firewalld is not used.
