# Validation Summary: How to Save and Restore ip6tables Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- `ip6tables`
- `ip6tables-save`
- `ip6tables-restore`
- `iptables-persistent` / `netfilter-persistent`
- `systemd`
- `ifupdown`
- `iptables-services`

## Sources Consulted
- `iptables-save(8)` upstream man page: https://man7.org/linux/man-pages/man8/iptables-save.8.html
- `iptables-restore(8)` upstream man page: https://man7.org/linux/man-pages/man8/iptables-restore.8.html
- Debian `netfilter-persistent(8)` man page: https://manpages.debian.org/unstable/netfilter-persistent/netfilter-persistent.8.en.html
- Debian `iptables-persistent` IPv6 plugin source (`/etc/iptables/rules.v6`, save/restore behavior): https://sources.debian.org/src/iptables-persistent/1.0.20/plugins/25-ip6tables/
- Debian `interfaces(5)` man page for `/etc/network/if-pre-up.d/`: https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html
- Red Hat documentation on `iptables-services` and disabling `firewalld`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-setting_and_controlling_ip_sets_using_iptables
- Red Hat documentation on `service ip6tables save` and `/etc/sysconfig/ip6tables`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/ch-the_sysconfig_directory
- systemd network ordering guidance for firewall services: https://systemd.io/NETWORK_ONLINE/

## Issues Found
- Several command examples wrote to `/etc` or changed firewall state without `sudo`, and some used shell redirection that would fail for non-root users. I changed those commands to root-safe forms using `sudo`, `-f`, direct file arguments, or `sudo tee` so they work as written.
- The RHEL/CentOS/Fedora section omitted the prerequisite to disable `firewalld` before switching to `iptables-services`. I added that step because Red Hat documents `firewalld` as the default firewall manager on those systems.
- The custom systemd unit ordered the restore service before `network.target`, which systemd explicitly says is not the right synchronization point for firewall setup during boot. I changed it to `Wants=network-pre.target` and `Before=network-pre.target`.
- The overview claimed the post covered `cloud-init` and "all methods" even though the article does not include a `cloud-init` method. I narrowed that wording to match the content actually present.
- The safe-save shell script attempted to restore a backup unconditionally if validation failed, even when no backup had been created yet. I added a guard so rollback only happens when a backup file exists.

## Review Notes
- `ip6tables` is still widely available, but on many current distributions it is a compatibility frontend over the nftables backend rather than the preferred native firewall interface.
- The `if-pre-up.d` hook method is a legacy approach that applies only to systems still using `ifupdown`.
