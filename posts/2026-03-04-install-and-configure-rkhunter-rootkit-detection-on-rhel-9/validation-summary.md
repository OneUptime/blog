# Validation Summary: How to Install and Configure RKHunter Rootkit Detection on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- EPEL
- rkhunter
- DNF
- RPM

## Sources Consulted
- RKHunter project site: https://www.rkhunter.dev/
- RKHunter command help as published by Kali tools documentation: https://www.kali.org/tools/rkhunter/
- Fedora package metadata for rkhunter in EPEL 9: https://packages.fedoraproject.org/pkgs/rkhunter/rkhunter/epel-9.html
- Red Hat blog on installing EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux
- Fedora RKHunter QA testcase: https://fedoraproject.org/wiki/QA:Testcase_Rkhunter
- RKHunter project wiki for property database updates: https://sourceforge.net/p/rkhunter/wiki/propupd/

## Issues Found
- The installation command used `<package-name>` instead of the actual `rkhunter` package and did not enable EPEL, where the RHEL 9 package is provided. Updated the installation section with RHEL 9 and CentOS Stream 9 EPEL setup commands and `sudo dnf install -y rkhunter`.
- The configuration path used `/etc/<service>/config.conf`, which is not valid for rkhunter. Updated it to `/etc/rkhunter.conf`.
- The post described rkhunter as a restartable systemd service with listening addresses and authentication settings. rkhunter is a command-line scanner, not a network service. Replaced the service restart with `sudo rkhunter --config-check` and changed the configuration guidance to mirror, email warning, and logging settings.
- The post retained service-oriented wording in a heading and conclusion. Updated those references to describe rkhunter configuration, scans, and logs instead.
- The enable/start/status commands used `<service-name>` and were not applicable to rkhunter. Replaced them with `sudo rkhunter --propupd`, `sudo rkhunter --update`, and `sudo rkhunter --check --skip-keypress`.
- The verification and troubleshooting steps used `systemctl` and `journalctl` for a nonexistent service unit. Replaced them with warning-only rkhunter scans, the Fedora/EPEL RPM log path, and `rpm -q rkhunter`.

## Review Notes
The article is now technically accurate as a basic RHEL 9/CentOS Stream 9 rkhunter setup guide. Future improvements could explain how to schedule scans or tune false positives, but those additions were outside the requested correction scope.
