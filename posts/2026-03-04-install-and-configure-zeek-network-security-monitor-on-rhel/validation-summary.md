# Validation Summary: How to Install and Configure Zeek Network Security Monitor on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- DNF package management
- EPEL and CodeReady Linux Builder / CRB repositories
- Zeek Network Security Monitor
- ZeekControl (`zeekctl`)
- SELinux troubleshooting

## Sources Consulted
- Zeek installation documentation: https://docs.zeek.org/en/current/install.html
- Zeek quick start and ZeekControl usage documentation: https://docs.zeek.org/en/current/quickstart.html
- ZeekControl documentation: https://github.com/zeek/zeekctl
- Zeek binary packages wiki: https://github.com/zeek/zeek/wiki/Binary-Packages
- Fedora package listing for `zeek-core` in EPEL 9: https://packages.fedoraproject.org/pkgs/zeek/zeek-core/epel-9.html
- Fedora package listing for `zeekctl` in EPEL 9: https://packages.fedoraproject.org/pkgs/zeek/zeekctl/epel-9.html
- Red Hat documentation for managing software with DNF on RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat blog on installing EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- The installation command used a placeholder package name (`<package-name>`), which was not usable for Zeek on RHEL 9. Replaced it with repository setup commands for RHEL 9 and CentOS Stream 9, plus installation of `zeek-core` and `zeekctl` from EPEL.
- The configuration path `/etc/<service>/config.conf` was generic and incorrect for ZeekControl-managed Zeek on EPEL. Replaced it with `/etc/zeek/node.cfg`, `/etc/zeek/networks.cfg`, and `/usr/share/zeek/site/local.zeek`.
- The service management commands used placeholder systemd units (`<service-name>`), but the EPEL Zeek packages provide ZeekControl commands rather than a documented Zeek systemd service. Replaced them with `sudo zeekctl check`, `sudo zeekctl deploy`, and `sudo zeekctl status`.
- The verification section used `journalctl` against a placeholder service. Replaced it with ZeekControl status checks and log inspection under `/var/log/zeek/logs/current`.
- Troubleshooting commands referenced placeholder package names and endpoint-oriented network checks. Replaced them with `zeekctl diag`, package checks for Zeek packages, interface validation, and packet capture validation.

## Review Notes
The EPEL 9 Zeek package may lag upstream Zeek releases. Users who require the newest upstream release should compare EPEL with Zeek's current binary package support matrix or build from source, but the corrected commands are accurate for the RHEL 9 / CentOS Stream 9 path covered by this post.
