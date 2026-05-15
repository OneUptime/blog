# Validation Summary: How to Set Up Bareos Backup Server on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Bareos Backup Server
- systemd
- firewalld
- SELinux

## Sources Consulted
- Bareos Documentation: Installing the Bareos Server - https://docs.bareos.org/master/IntroductionAndTutorial/InstallingBareos.html
- Red Hat Enterprise Linux 9 Documentation: Using and configuring firewalld - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post is placeholder content rather than a technically valid Bareos setup guide. It uses generic placeholders such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>` instead of Bareos-specific configuration paths, services, packages, or ports.
- The post omits required Bareos installation details for RHEL-based systems, including adding the Bareos repository, installing Bareos packages, preparing the PostgreSQL catalog database, and enabling the RPM-based Bareos services `bareos-dir.service`, `bareos-sd.service`, and `bareos-fd.service`.
- The firewall section does not identify the Bareos TCP ports or predefined firewalld services. Bareos documentation states the daemons need TCP ports 9101-9103, and RHEL firewalld documentation lists predefined Bareos services such as `bareos-director`, `bareos-filedaemon`, and `bareos-storage`.
- The post begins at "Step 2" and never provides an actual Bareos installation step, making the guide incomplete.

## Review Notes
The post should be removed or replaced with a complete Bareos-on-RHEL guide. Fixing it accurately would require writing substantial missing installation, database, service, and firewall instructions rather than making targeted corrections.
