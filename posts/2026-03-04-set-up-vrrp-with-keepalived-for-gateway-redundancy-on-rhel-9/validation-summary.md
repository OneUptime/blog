# Validation Summary: How to Set Up VRRP with Keepalived for Gateway Redundancy on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Keepalived
- Virtual Router Redundancy Protocol (VRRP)
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- firewalld
- Linux systemd services

## Sources Consulted
- Keepalived configuration synopsis: https://www.keepalived.org/doc/configuration_synopsis.html
- Keepalived man page: https://www.keepalived.org/manpage.html
- Red Hat Keepalived overview documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/load_balancer_administration/ch-keepalived-overview-vsa
- Red Hat initial Keepalived configuration documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/load_balancer_administration/ch-initial-setup-vsa
- Red Hat Customer Portal, validating Keepalived configuration syntax on RHEL: https://access.redhat.com/solutions/7072660
- Red Hat Customer Portal, allowing VRRP traffic through firewalld on RHEL: https://access.redhat.com/solutions/7062064
- firewalld rich language documentation: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html

## Issues Found
- The post is placeholder content rather than a technically actionable Keepalived and VRRP guide. It references `/etc/<service>/config.conf`, `<service-name>`, `<PORT>/tcp`, and `<package-name>`, none of which are valid Keepalived paths, service names, firewall rules, or package names.
- The post omits the actual Keepalived installation step even though the introduction says the guide covers installation.
- The configuration file path is incorrect for Keepalived on RHEL. Official Red Hat and Keepalived documentation use `/etc/keepalived/keepalived.conf`.
- The configuration guidance does not include a valid `vrrp_instance` block, `interface`, `virtual_router_id`, `priority`, `advert_int`, or `virtual_ipaddress`, which are the core settings needed for a Keepalived VRRP setup.
- The systemd commands use a placeholder instead of the real `keepalived` service.
- The firewall guidance is incorrect for VRRP. VRRP is IP protocol 112, not a TCP port opened with `--add-port=<PORT>/tcp`; firewalld should allow the VRRP protocol, typically with a rich rule such as `rule protocol value="vrrp" accept` or the equivalent environment-specific rule.
- The verification and troubleshooting commands use placeholders instead of Keepalived-specific commands such as `systemctl status keepalived`, `journalctl -u keepalived`, and `keepalived -t` for syntax validation.
- Because the article is a generic service-management template with placeholders and lacks a valid Keepalived setup workflow, it was marked `not-technically-relevant` instead of edited into a different article.

## Review Notes
The topic itself is technically relevant, but this specific post has no salvageable Keepalived-specific implementation details. A replacement article should cover installing the `keepalived` package, configuring `/etc/keepalived/keepalived.conf` on both gateway nodes, allowing VRRP protocol traffic through firewalld, enabling and starting `keepalived.service`, validating syntax with `keepalived -t`, and confirming VIP failover behavior.
