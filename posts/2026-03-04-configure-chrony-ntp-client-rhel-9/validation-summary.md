# Validation Summary: How to Configure chrony as an NTP Client on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- chrony / chronyd
- NTP
- systemd / systemctl
- timedatectl
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring time synchronization - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- Red Hat Enterprise Linux 8 release notes: ntp package removed and chrony only available - https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/pdf/8.0_release_notes/80-release-notes.pdf
- chrony project documentation: chrony.conf(5) - https://chrony-project.org/doc/4.4/chrony.conf.html
- chrony project documentation: chronyc(1) - https://chrony-project.org/doc/4.2/chronyc.html
- firewalld documentation: How to open a port or service - https://firewalld.org/documentation/howto/open-a-port-or-service.html
- Local command help: timedatectl --help

## Issues Found
- The firewall section described `firewall-cmd --permanent --add-service=ntp` as allowing outbound client NTP traffic. That command opens inbound service access in a firewalld zone, so I clarified that it is only needed when the host also serves NTP to other clients.
- The offline/online examples used `chronyc online` and `chronyc offline` without privileges. Red Hat notes that restricted chronyc commands require root, so I changed them to `sudo chronyc online` and `sudo chronyc offline`.
- The authentication example edited `/etc/chrony.keys` and used `key 1`, but did not show the `keyfile /etc/chrony.keys` directive. RHEL defaults normally include it, but I added it to the snippet so the example is complete and portable.

## Review Notes
- The remaining chrony directives and commands are valid for RHEL 9 chrony client configuration, including `pool`, `server`, `iburst`, `maxsources`, `makestep`, `rtcsync`, `logdir`, `chronyc sources -v`, `chronyc tracking`, `chronyc ntpdata`, and `sudo chronyc makestep`.
- Symmetric key authentication is syntactically valid, but deployments should prefer stronger key types where supported by both client and server, as current chrony documentation recommends AES ciphers or SHA3 hash functions over MD5 and older hashes.
