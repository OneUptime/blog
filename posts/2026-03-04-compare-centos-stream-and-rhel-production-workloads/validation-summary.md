# Validation Summary: How to Compare CentOS Stream and RHEL for Production Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- CentOS Stream
- DNF package management
- RPM package queries
- Red Hat subscription-manager
- RHEL API/ABI compatibility
- Extended Update Support

## Sources Consulted
- Red Hat, "What is CentOS Stream?": https://www.redhat.com/en/topics/linux/what-is-centos-stream
- CentOS Stream documentation, "About Stream": https://docs.centos.org/centos-stream-docs/
- CentOS Stream documentation, "Build": https://docs.centos.org/centos-stream-docs/build/
- CentOS Stream documentation, "Report a Bug": https://docs.centos.org/centos-stream-docs/bugs/
- Red Hat Enterprise Linux 10 Application Compatibility Guide: https://access.redhat.com/articles/rhel10-abi-compatibility
- Red Hat Enterprise Linux 9, "Managing software with the DNF tool": https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- RPM official manual pages: https://rpm.org/docs/4.19.x/man/rpm.8.html
- Red Hat Enterprise Linux for SAP Solutions documentation covering EUS support windows: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/

## Issues Found
- The post stated that CentOS Stream packages use "the same build system" as RHEL. CentOS documentation says CentOS Stream has its own dedicated Koji build system, while Red Hat's internal RHEL build setup works basically the same way and the two systems are kept in sync. Updated the sentence to say CentOS Stream shares sources with RHEL and uses a dedicated build system that stays in sync with RHEL development.
- The post referred to CentOS Stream support through "community forums and Bugzilla." Current CentOS Stream documentation directs CentOS Stream 9 and 10 bug reports to Red Hat Jira. Updated the support comment to "community forums and Red Hat Jira."

## Review Notes
The commands shown are valid for RHEL-family systems: `dnf info <package_name>` is documented by Red Hat, `rpm -q --provides` is valid RPM query syntax, and `subscription-manager status` is a documented RHEL subscription check. The local review environment did not include `dnf`, `rpm`, or `subscription-manager`, so command validation was performed against official documentation rather than local execution.
