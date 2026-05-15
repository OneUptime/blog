# Validation Summary: How to Configure Firewall Rules Using the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- firewalld
- firewall-cmd
- systemd
- Linux kernel logging / journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/getting-started-with-the-rhel-9-web-console_system-management-using-the-rhel-9-web-console
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld rich language manual page: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- firewalld custom service documentation: https://firewalld.org/documentation/howto/add-a-service.html
- firewalld runtime versus permanent configuration documentation: https://firewalld.org/documentation/configuration/runtime-versus-permanent.html

## Issues Found
- The custom port instructions described clicking "Add ports" directly within a zone. RHEL 9 web console documentation shows the custom port flow as selecting a zone, clicking "Add Services," choosing "Custom Ports," then clicking "Add Ports." Updated the wording to match the documented UI flow.
- The `firewall-cmd --state` example was labeled as a "Full status dump." Official `firewall-cmd` documentation says `--state` checks whether the firewalld daemon is active and prints that state. Updated the comment to describe the command accurately.
- The logging example used `sudo firewall-cmd --set-log-denied=all --permanent` followed by `sudo firewall-cmd --reload`. Official `firewall-cmd` documentation lists `--set-log-denied=value` as a runtime and permanent change that reloads the firewall itself; `--permanent` is not part of that option's documented syntax. Removed `--permanent` and the redundant reload.

## Review Notes
The remaining `firewall-cmd` examples use documented zone, service, port, rich rule, interface binding, reload, and query options. The XML service definition follows the documented firewalld service-file pattern and `/etc/firewalld/services` location for administrator-defined services.
