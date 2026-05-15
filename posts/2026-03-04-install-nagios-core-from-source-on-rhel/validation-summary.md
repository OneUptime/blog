# Validation Summary: How to Install Nagios Core from Source on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nagios Core
- Nagios Plugins
- Apache HTTP Server
- SELinux
- firewalld
- systemd
- DNF

## Sources Consulted
- Nagios Core official source installation guide: https://library.nagios.com/docs/nagios-core/getting-started/Nagios-Core-Installing-Nagios-Core-From-Source
- Nagios Core GitHub releases: https://github.com/NagiosEnterprises/nagioscore/releases
- Nagios Core 4.x changelog: https://www.nagios.org/projects/nagios-core/4x/
- Official Nagios Plugins downloads page: https://www.nagios.org/downloads/nagios-plugins/
- Nagios Plugins GitHub release for 2.5: https://github.com/nagios-plugins/nagios-plugins/releases/tag/release-2.5
- Red Hat firewalld documentation for RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Apache htpasswd documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html
- Red Hat SELinux documentation for Apache CGI contexts and booleans: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/htmlsingle/selinux_users_and_administrators_guide/sect-managing_confined_services-concurrent_versioning_system-types

## Issues Found
- The dependency setup installed `epel-release` as if it were available from the default RHEL repositories and omitted the CodeReady Builder enablement and plugin packages that Nagios documents for RHEL 9. I changed the commands to install the EPEL release RPM by URL, enable CodeReady Builder, and include `net-snmp-utils` and `perl-Net-SNMP`.
- The post pinned Nagios Core 4.5.1 and Nagios Plugins 2.4.8 even though newer upstream releases are available. I updated the source URLs and extracted directories to Nagios Core 4.5.12 and Nagios Plugins 2.5, and verified both release asset URLs resolve.
- The Nagios Core install step used the older `make install-init` target wording. I changed it to the current documented `make install-daemoninit` target and described the installed service files as daemon files.
- The SELinux section used `httpd_can_network_connect` and did not label the Nagios CGI executable directory. I changed it to enable `httpd_enable_cgi` and label `/usr/local/nagios/sbin/` as `httpd_sys_script_exec_t`, matching Red Hat SELinux guidance for Apache CGI scripts.

## Review Notes
- The guide uses temporary `chcon` commands for SELinux labels. For a production RHEL system, persistent `semanage fcontext` rules followed by `restorecon` would be preferable, but the existing section was framed as an immediate fix when SELinux blocks access.
- The guide assumes RHEL 9 because the official EPEL and CodeReady Builder commands are major-version specific. A future version could add separate RHEL 8 and RHEL 9 command blocks if broader RHEL coverage is required.
