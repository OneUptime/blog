# Validation Summary: How to Set Up Lynis Security Auditing on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Lynis
- systemd
- journalctl
- SELinux audit tooling
- RPM package queries

## Sources Consulted
- CISOfy Lynis Installation and Usage Guide: https://cisofy.com/documentation/lynis/
- CISOfy Get Started with Lynis: https://cisofy.com/documentation/lynis/get-started/
- CISOfy Lynis features overview: https://cisofy.com/documentation/lynis/features/
- Red Hat Enterprise Linux 9 documentation for managing software with DNF: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Customer Portal article on EPEL usage: https://access.redhat.com/solutions/3358

## Issues Found
- The post is a placeholder and does not contain a technically valid Lynis setup procedure. It skips installation, refers to non-existent placeholder paths such as `/etc/<service>/config.conf`, and uses placeholder systemd commands such as `systemctl restart <service-name>`.
- Lynis is normally run as a command-line auditing tool with commands such as `lynis audit system`; the reviewed post incorrectly frames it as a generic long-running service that should be enabled, started, checked with `systemctl status`, and inspected with `journalctl -u`.
- The troubleshooting section uses placeholder package and service names, so the commands cannot be executed as written for Lynis on RHEL 9.
- Because the article is placeholder content with no accurate Lynis-specific setup flow, it was marked `not-technically-relevant` rather than rewritten into a new article.

## Review Notes
The topic itself is technically relevant, but this file's current content is not a salvageable Lynis guide without replacing most of the body. A future version should cover obtaining Lynis through an RPM repository or package source, running `lynis audit system`, reviewing `/var/log/lynis.log` and the Lynis report output, and optionally scheduling audits with cron or a systemd timer.
