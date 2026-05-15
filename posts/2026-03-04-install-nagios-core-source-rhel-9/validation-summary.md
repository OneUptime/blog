# Validation Summary: How to Install Nagios Core from Source on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nagios Core
- Nagios Plugins
- DNF package management
- Apache httpd and htpasswd
- firewalld
- SELinux
- systemd services

## Sources Consulted
- Nagios Library: Nagios Core - Installing Nagios Core From Source - https://library.nagios.com/docs/nagios-core/getting-started/Nagios-Core-Installing-Nagios-Core-From-Source
- Nagios Support Knowledgebase: Nagios Core - Installing Nagios Core From Source - https://support.nagios.com/kb/article/nagios-core-installing-nagios-core-from-source.html
- Nagios Open Source: Download Nagios Core - https://www.nagios.org/downloads/nagios-core/
- Red Hat Documentation: Using and configuring firewalld in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Customer Portal: Enabling or disabling a repository using Red Hat Subscription Management - https://access.redhat.com/solutions/265523
- Red Hat Documentation: RHEL 9 Package manifest - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index

## Issues Found
- The original post did not install Nagios Core from source. It installed and configured unrelated monitoring tools such as PCP, sysstat, SNMP, Prometheus, and Grafana. I replaced those steps with the Nagios Core source download, configure, build, and install process for RHEL 9.
- The original package list omitted the Nagios Core build and web dependencies. I changed it to install the compiler, build tools, Apache, PHP, GD, OpenSSL development headers, mail packages, and `httpd-tools` for `htpasswd`.
- The original service commands enabled `pmcd`, `pmlogger`, and `sysstat`, which are not Nagios Core services. I changed them to start and enable `httpd.service` and `nagios.service`.
- The original configuration file paths referenced PCP, SNMP, Prometheus, and Grafana instead of Nagios Core. I changed the flow to install Nagios sample configuration and verify `/usr/local/nagios/etc/nagios.cfg`.
- The original firewall ports were for Prometheus, Node Exporter, Grafana, and SNMP. I changed the firewall step to open TCP port 80 for the Nagios Core web interface.
- The original verification commands checked unrelated metrics tools. I changed verification to use the Nagios binary's configuration check and `systemctl status nagios.service`.
- The original post did not install Nagios Plugins, which are required for the default Nagios checks to run. I added the RHEL 9 plugin dependency, repository, source build, and install steps.

## Review Notes
The corrected post follows the current official Nagios source installation flow for RHEL 9. The Nagios documentation assumes SELinux is disabled or permissive; the post now uses a guarded command to switch enforcing systems to permissive mode for the current boot, but a production deployment should use a site-approved SELinux policy instead of leaving SELinux permissive.
