# Validation Summary: How to Compare CentOS Stream and RHEL for Development Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- DNF package management
- Red Hat Subscription Manager
- Linux OS release metadata

## Sources Consulted
- Red Hat: What is CentOS Stream? https://www.redhat.com/en/topics/linux/what-is-centos-stream
- CentOS Documentation: About Stream https://docs.centos.org/centos-stream-docs/
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 9 documentation: Registering the system and managing subscriptions https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_registering-the-system-and-managing-subscriptions_configuring-basic-system-settings/
- DNF Command Reference https://dnf.readthedocs.io/en/stable/command_ref.html
- freedesktop.org os-release specification https://www.freedesktop.org/software/systemd/man/latest/os-release.html

## Issues Found
- The post contained placeholder systemd service commands (`systemctl enable`, `systemctl start`, `systemctl status`, and `journalctl -u`) even though the article is about comparing CentOS Stream and RHEL, not configuring a service. I replaced those commands with release, repository, update, and subscription checks that match the topic.
- The comparison table described RHEL updates only as "Point releases" and CentOS Stream updates only as "Continuous". I clarified that RHEL uses stable minor releases with backported fixes, while CentOS Stream is the continuous preview of the next RHEL minor release.
- The troubleshooting section referenced service startup logs and `rpm -qa | grep <package-name>`, which did not fit the topic. I changed it to RHEL subscription troubleshooting and DNF-based installed package checks.

## Review Notes
The remaining article is still brief and could be expanded in the future with decision criteria such as lifecycle, SLA requirements, and how closely a development environment should match production.
