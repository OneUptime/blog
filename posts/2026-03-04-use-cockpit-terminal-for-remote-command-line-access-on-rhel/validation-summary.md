# Validation Summary: How to Use Cockpit Terminal for Remote Command-Line Access on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- Cockpit terminal
- systemd socket activation
- firewalld and rich rules
- Cockpit add-on packages

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- Red Hat Enterprise Linux 9 documentation: Web console add-ons: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/cockpit-add-ons-_system-management-using-the-rhel-9-web-console
- Red Hat Enterprise Linux 9 documentation: Managing containers by using the RHEL web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/managing-container-images-by-using-the-rhel-web-console_building-running-and-managing-containers
- Red Hat Enterprise Linux 9 documentation: Managing file systems in the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/managing-partitions-using-the-web-console_managing-file-systems
- Cockpit Project documentation: Terminal: https://cockpit-project.org/guide/latest/feature-terminal
- Cockpit Project documentation: cockpit.conf(5): https://cockpit-project.org/guide/latest/cockpit.conf.5
- firewalld documentation: firewalld.richlanguage(5): https://firewalld.org/documentation/man-pages/firewalld.richlanguage

## Issues Found
- The install section stated that Cockpit is installed by default on RHEL 9. Red Hat documents that the web console is installed by default in many RHEL 9 installation variants, not all of them. Updated the comment to say "Cockpit is installed by default in many RHEL 9 installation variants, but verify."

## Review Notes
The Cockpit socket enablement, firewalld service opening, browser access on port 9090, Cockpit terminal behavior, `IdleTimeout` configuration, rich-rule syntax, and listed add-on packages were consistent with the consulted documentation. The `IdleTimeout` setting applies to interactive password logins; non-interactive authentication methods such as Kerberos, OAuth, or certificate login are treated differently by Cockpit.
