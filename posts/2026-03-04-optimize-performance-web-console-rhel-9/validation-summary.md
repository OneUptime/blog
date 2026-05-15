# Validation Summary: How to Optimize System Performance Using the RHEL Web Console

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Web Console
- Cockpit
- TuneD performance profiles
- Performance Co-Pilot (PCP)
- systemd services
- firewalld
- Linux performance commands

## Sources Consulted
- Red Hat Documentation: Managing systems using the RHEL 9 web console - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- Red Hat Documentation: Optimizing the system performance using the web console - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/using-the-web-console-for-selecting-performance-profiles_monitoring-and-managing-system-status-and-performance
- Red Hat Documentation: Installing web console add-ons and creating custom pages - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/cockpit-add-ons-_system-management-using-the-rhel-9-web-console
- Red Hat Documentation: Managing file systems with the RHEL 9 web console - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/index
- Cockpit Project Documentation: Privileges and Permissions - https://cockpit-project.org/guide/latest/privileges.html

## Issues Found
- The prerequisites only said network access was required. Updated this to specify that TCP port 9090 must be open in the firewall, matching Red Hat's web console login prerequisites.
- The installation section said the Web Console is included by default on RHEL. Updated this to "included by default in many RHEL installation variants" because Red Hat documents that it is not installed by default in every variant.
- The detailed metrics instructions said to click performance graphs. Updated this to use the RHEL 9 documented path: Overview > Usage > View metrics and history.
- The process monitoring command list included `htop` as a standard command. Removed it because it is not guaranteed to be available on a default RHEL installation.
- The PCP services section enabled `pmcd` and `pmlogger`. Updated the command to enable `pmlogger.service` and `pmproxy.service`, which are the PCP services Red Hat documents as required for web console metrics.

## Review Notes
The post is technically relevant and the remaining commands and descriptions are consistent with RHEL 9 Web Console documentation. Some Web Console pages depend on optional add-on packages such as `cockpit-storaged`, `cockpit-pcp`, or `cockpit-packagekit`; the post already includes add-on installation guidance for the PCP and PackageKit examples.
