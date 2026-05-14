# Validation Summary: How to Set Up Snort as a Network Intrusion Detection System on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Snort 3
- LibDAQ
- systemd
- firewalld
- SELinux

## Sources Consulted
- Snort 3 Rule Writing Guide: Command Line Basics: https://docs.snort.org/start/help
- Snort 3 Rule Writing Guide: Configuration: https://docs.snort.org/start/configuration
- Snort 3 Rule Writing Guide: Reading Traffic: https://docs.snort.org/start/inspection
- Cisco Snort: Snort 3 on CentOS 8 Stream installation guide: https://snort-org-site.s3.amazonaws.com/production/document_files/files/000/003/977/original/Snort_3_GA_on_CentOS_8_Stream.pdf
- Red Hat Enterprise Linux 8 documentation: Using and configuring firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/using-and-configuring-firewalld_configuring-and-managing-networking
- Red Hat blog: How to install EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- The original installation commands used placeholders such as `<package-name>` and did not install Snort, LibDAQ, or build dependencies. Replaced them with concrete RHEL/EPEL dependency installation commands and source-build steps for LibDAQ and Snort 3.
- The original configuration path `/etc/<service>/config.conf` was not a Snort 3 configuration path. Replaced it with Snort 3 Lua configuration files under `/usr/local/snort/etc/snort/`.
- The original service commands used `<service>` and did not provide a valid Snort systemd unit. Added a Snort 3 systemd unit that runs with a dedicated `snort` user and the Linux capabilities needed for packet capture.
- The original verification command `sudo <service> --test` was invalid for Snort. Replaced it with `snort -c /usr/local/snort/etc/snort/snort.lua -T`, matching Snort 3 command-line usage.
- The original firewall guidance suggested `--add-service=<service>`, but passive Snort IDS mode does not normally expose an inbound service. Replaced it with a note to open only explicitly required ports using `--add-port=<port>/<protocol>`.
- The original security guidance suggested enabling TLS/SSL for network communication, which does not apply to passive Snort packet inspection. Replaced it with capability-limiting guidance relevant to Snort.
- The troubleshooting section referenced generic service names and port conflicts. Updated it to use `snort.service` and to include an interface/traffic visibility check that is relevant to NIDS deployments.

## Review Notes
The corrected post uses RHEL 9-style CodeReady Builder and EPEL setup. RHEL 8 systems need the corresponding RHEL 8 repository and EPEL release package names.
