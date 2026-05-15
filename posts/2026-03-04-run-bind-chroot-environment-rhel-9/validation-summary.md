# Validation Summary: How to Run BIND in a chroot Environment on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND 9 / named
- bind-chroot / named-chroot
- systemd
- SELinux
- DNS zone validation tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing networking infrastructure services": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_networking_infrastructure_services/index
- ISC BIND 9 documentation, named-checkconf and named-checkzone manual pages: https://bind9.readthedocs.io/en/v9.16.38/manpages.html
- ISC BIND 9 Configuration Reference, zone statement types: https://bind9.readthedocs.io/en/v9.16.18/reference.html

## Issues Found
- The post instructed readers to copy `/etc/named.conf` and zone files manually into `/var/named/chroot`. On RHEL 9, `named-chroot` uses bind mounts from `/etc/named-chroot.files`, so the canonical configuration remains in `/etc/named.conf` and standard zone files remain under `/var/named`. Updated the migration guidance to review `/etc/named-chroot.files` and only add or relocate non-standard paths when needed.
- The post created and edited most working directories directly under `/var/named/chroot`. Updated the commands to use standard RHEL BIND locations such as `/var/named`, `/var/named/log`, `/var/named/data`, `/var/named/dynamic`, and `/var/named/slaves`, which are made visible to `named-chroot` by the service.
- The logging example used `/var/log/named/default.log`, while the Red Hat documentation shows BIND logging under `/var/named/log` with ownership granted to the `named` user. Updated the example to `/var/named/log/default.log`.
- The reload guidance used only `rndc reload`. Updated it to use `systemctl reload named-chroot`, matching Red Hat's service guidance, while noting that `rndc reload` can still work when RNDC is configured.
- The security explanation implied chroot plus SELinux was simply stronger. Red Hat explicitly notes that SELinux in enforcing mode is more secure than running BIND in a change-root environment. Updated the text to avoid overstating chroot and to keep SELinux as the stronger RHEL protection.

## Review Notes
The BIND configuration syntax, `type primary` zone declaration, `named-checkconf -t`, `named-checkzone`, `systemctl enable --now named-chroot`, and `/proc/$(pidof named)/root` verification approach are technically valid. The sample zone name `example.com` is illustrative; a real deployment still needs a valid zone file and appropriate recursion restrictions for the site's network.
