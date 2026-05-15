# Validation Summary: How to Run Multiple Tomcat Instances on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Apache Tomcat
- Java
- systemd
- firewalld
- DNF

## Sources Consulted
- Apache Tomcat 11 official documentation, Introduction: https://tomcat.apache.org/tomcat-11.0-doc/introduction.html
- Apache Tomcat official RUNNING.txt, Advanced Configuration - Multiple Tomcat Instances: https://apache.googlesource.com/tomcat/+/eec1ef76d411d1e864032504c64af52064c1a883/RUNNING.txt
- Red Hat Enterprise Linux 9 documentation, Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Enterprise Linux 9 documentation, Managing system services with systemctl: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_basic_system_settings/managing-system-services-with-systemctl_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post is a generic placeholder rather than a Tomcat guide. It uses unresolved examples such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, so the commands cannot be run as written.
- The post does not explain the core technical mechanism for running multiple Tomcat instances. Official Tomcat documentation describes using separate `CATALINA_BASE` directories for multiple instances while sharing a Tomcat installation through `CATALINA_HOME`.
- The package installation step does not name Tomcat, Java, or any RHEL package that would install the required runtime.
- The service configuration, service startup, verification, firewall, and performance commands are not Tomcat-specific and would fail until the placeholders are replaced.
- Because the article contains no salvageable Tomcat-specific implementation and would require a full rewrite, it was classified as `not-technically-relevant`. The README was not edited.

## Review Notes
This post should be removed or replaced with a real Tomcat/RHEL tutorial that covers Java installation, Tomcat installation source, per-instance `CATALINA_BASE` directories, distinct ports in `server.xml`, systemd unit configuration, firewall port rules, and verification for each instance.
