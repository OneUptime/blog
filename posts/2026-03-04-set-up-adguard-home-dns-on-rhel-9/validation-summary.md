# Validation Summary: How to Set Up AdGuard Home DNS on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AdGuard Home
- Red Hat Enterprise Linux 9 / CentOS Stream 9
- systemd service management
- firewalld
- DNS verification with dig

## Sources Consulted
- AdGuard Home official README, automated install commands: https://github.com/AdguardTeam/AdGuardHome
- AdGuard Home official Getting Started guide, first run and service commands: https://github.com/AdguardTeam/AdGuardHome/wiki/Getting-Started
- AdGuard Home official install script, default install directory and service-control output: https://raw.githubusercontent.com/AdguardTeam/AdGuardHome/master/scripts/install.sh
- Red Hat Enterprise Linux 9 documentation, firewalld predefined services and DNS firewall examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 documentation, DNS service firewall command examples: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/managing_networking_infrastructure_services/Red_Hat_Enterprise_Linux-9-Managing_networking_infrastructure_services-en-US.pdf

## Issues Found
- The post contained placeholder service paths and names such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>`. Replaced them with AdGuard Home's actual default install path, `/opt/AdGuardHome/AdGuardHome.yaml`, and the official `/opt/AdGuardHome/AdGuardHome -s ...` service-control commands.
- The guide claimed to walk through installation but had no installation step. Added the official AdGuard Home install-script command and the RHEL package prerequisites needed for the commands used in the post.
- The firewall configuration was missing. Added Red Hat-supported `firewall-cmd --permanent --add-service=dns` and `firewall-cmd --reload` commands, plus a temporary TCP 3000 rule for the initial AdGuard Home setup wizard.
- Verification used placeholder systemd commands and did not test DNS resolution. Replaced the examples with AdGuard Home status/log commands and a `dig @127.0.0.1 example.com` DNS query.

## Review Notes
The guide now uses the official AdGuard Home installer, which installs into `/opt/AdGuardHome` by default and registers AdGuard Home as a service. The temporary `3000/tcp` firewall rule is intentionally non-permanent because it is only needed for the initial setup wizard unless the administrator chooses to expose the web UI on that port long term.
