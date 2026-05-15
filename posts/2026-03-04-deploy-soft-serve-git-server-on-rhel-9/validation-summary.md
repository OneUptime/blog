# Validation Summary: How to Deploy Soft Serve Git Server on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Soft Serve Git server
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd
- firewalld
- SELinux audit troubleshooting

## Sources Consulted
- Soft Serve official README and installation/configuration documentation: https://github.com/charmbracelet/soft-serve
- Soft Serve official systemd service documentation: https://github.com/charmbracelet/soft-serve/blob/main/systemd.md
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 systemctl service management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- Red Hat Enterprise Linux 9 SELinux troubleshooting documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index

## Issues Found
- The post contains placeholder commands rather than usable Soft Serve instructions. Commands such as `sudo vi /etc/<service>/config.conf`, `sudo systemctl restart <service-name>`, and `sudo firewall-cmd --permanent --add-port=<PORT>/tcp` cannot be validated or executed as written.
- The post starts at "Step 2" and does not include a Soft Serve installation step, despite claiming to cover installation.
- The service name, configuration path, and firewall ports are not Soft Serve-specific. Official Soft Serve documentation uses the `soft-serve` package/service, stores configuration in `config.yaml` under the configured data path, and documents default ports such as SSH `23231/tcp`, HTTP `23232/tcp`, Git `9418/tcp`, and stats `23233/tcp`.
- Rewriting the placeholders into a correct deployment guide would require adding missing substantive content and restructuring the article, which is beyond a validation correction pass.

## Review Notes
The post is technically relevant in topic, but the current content is a generic service template rather than a working Soft Serve on RHEL guide. It should be removed or replaced with a complete, verified tutorial based on the official Soft Serve RPM/Yum and systemd documentation.
