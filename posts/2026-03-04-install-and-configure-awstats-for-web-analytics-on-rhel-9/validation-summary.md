# Validation Summary: How to Install and Configure AWStats for Web Analytics on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- DNF package manager
- EPEL repository
- AWStats
- Apache HTTP Server
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Fedora Packages, `awstats` package overview: https://packages.fedoraproject.org/pkgs/awstats/awstats/
- Fedora Packages, `awstats` EPEL 9 package file list: https://packages.fedoraproject.org/pkgs/awstats/awstats/epel-9.html
- AWStats official setup documentation: https://awstats.sourceforge.io/docs/awstats_setup.html
- AWStats official configuration directive documentation: https://awstats.sourceforge.io/docs/awstats_config.html

## Issues Found
- The installation step used the placeholder `dnf install -y <package-name>`. I changed it to install the actual EPEL package, `awstats`, plus `httpd`, and added the RHEL 9 EPEL enablement commands required before installing EPEL packages.
- The configuration step used the placeholder path `/etc/<service>/config.conf`. I changed it to create and edit `/etc/awstats/awstats.example.com.conf` from `/etc/awstats/awstats.model.conf`, matching the AWStats package layout and AWStats configuration model.
- The configuration guidance mentioned generic service settings such as listening addresses and authentication settings. I replaced this with AWStats-specific directives: `LogFile`, `LogType`, `LogFormat`, `SiteDomain`, `HostAliases`, `DirData`, and `AllowToUpdateStatsFromBrowser`.
- The post treated AWStats as a standalone systemd service. I changed the service management commands to manage Apache `httpd`, because the packaged AWStats web interface is served through Apache and AWStats itself is updated through its Perl command-line/CGI script.
- The verification and troubleshooting commands used placeholder service and package names. I changed them to run the AWStats update command, check `httpd`, inspect `httpd` journal logs, and verify `awstats` and `httpd` RPM installation.

## Review Notes
The corrected guide uses Apache access logs and AWStats' Apache combined log preset (`LogFormat=1`) as the default example. Environments with custom Apache log paths, virtual-host-specific logs, SELinux changes, or non-Apache web servers will need corresponding local adjustments.
