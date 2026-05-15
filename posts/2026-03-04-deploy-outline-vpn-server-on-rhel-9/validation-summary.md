# Validation Summary: How to Deploy Outline VPN Server on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Outline VPN Server
- systemd
- firewalld
- SELinux

## Sources Consulted
- Outline Help: How Outline Works - https://support.getoutline.org/about/how-outline-works
- Outline Help: How can I set up an Outline server? - https://support.getoutline.org/en-GB/manager/server-setup/setup-server/
- Outline Server GitHub repository - https://github.com/Jigsaw-Code/outline-server
- Red Hat Enterprise Linux 9: Using and configuring firewalld - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9: Using SELinux - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux

## Issues Found
- The post is a generic placeholder, not an actionable Outline VPN Server deployment guide. It contains placeholder paths and service names such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>`, which are not valid commands or configuration locations.
- The guide starts at "Step 2" and omits the actual installation step. Official Outline documentation describes setup through Outline Manager and an installation script for Linux servers, and the Outline server installation uses Docker/Shadowbox and Watchtower behind the scenes.
- The service-management commands are generic systemd examples and do not identify the actual Outline containers or services a RHEL administrator would need to inspect.
- The firewall section does not identify the Outline management API port or access-key port/protocol values. Official Outline documentation notes that the server setup flow provides environment-specific instructions and that Outline uses generated/random server details.
- Because correcting these problems would require replacing the article with a substantially new, Outline-specific deployment guide, the post was classified as not technically relevant rather than edited in place.

## Review Notes
The generic `systemctl`, `firewall-cmd`, `journalctl`, and `ausearch` command shapes are plausible for RHEL administration, but they do not validate the article as an Outline deployment guide because the required service names, configuration paths, package names, and ports are missing.
