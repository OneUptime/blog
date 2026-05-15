# Validation Summary: How to Install and Configure VirtualBox on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Oracle VirtualBox
- DNF package management
- RPM repositories and GPG keys
- Linux kernel modules
- firewalld

## Sources Consulted
- Oracle VirtualBox 7.2 User Manual, Installing on Linux Hosts: https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/installation.html
- Oracle VirtualBox Linux downloads and RPM repository: https://www.virtualbox.org/wiki/Linux_Downloads
- Oracle VirtualBox RHEL repository file: https://download.virtualbox.org/virtualbox/rpm/rhel/virtualbox.repo
- Red Hat Enterprise Linux 9 documentation, Managing software with DNF: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Enterprise Linux 9 documentation, Managing custom software repositories: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_managing-custom-software-repositories_managing-software-with-the-dnf-tool

## Issues Found
- The original post used placeholder package commands such as `sudo dnf install -y <package-name>` and `rpm -qi <package-name>`. I replaced them with the Oracle VirtualBox repository setup, GPG key import, `VirtualBox-7.2` installation, and VirtualBox-specific verification commands.
- The dependency installation incorrectly included `epel-release` as a generic requirement. I removed it and added build tools and kernel development packages needed to build VirtualBox kernel modules on RHEL.
- The original post treated VirtualBox as a generic systemd service with `<service>` commands. VirtualBox on Linux relies on kernel modules such as `vboxdrv`, so I replaced the service steps with `/sbin/rcvboxdrv setup`, module checks, and user group configuration.
- The verification, logging, firewall, performance, security, and troubleshooting examples all used generic `<service>` placeholders. I replaced them with VirtualBox-specific commands and guidance.

## Review Notes
VirtualBox packages are provided by Oracle rather than Red Hat, so using the Oracle repository introduces the normal support and trust considerations for third-party repositories on RHEL. The exact latest package stream may change over time; the reviewed content uses the current `VirtualBox-7.2` stream available from Oracle's RHEL repository on 2026-05-15.
