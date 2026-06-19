# Validation Summary: How to Handle Package Management with apt and yum

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- APT
- dpkg
- apt-file
- Debian and Ubuntu package repositories
- YUM
- DNF
- RPM
- RHEL, CentOS, CentOS Stream, and Fedora package repositories
- Nginx package repositories
- yum-cron and dnf-automatic

## Sources Consulted
- Debian apt(8) manual: https://manpages.debian.org/testing/apt/apt.8.en.html
- Debian apt-get(8) manual: https://manpages.debian.org/testing/apt/apt-get.8.en.html
- Debian apt-mark(8) manual: https://manpages.debian.org/unstable/apt/apt-mark.8.en.html
- Debian sources.list(5) manual: https://manpages.debian.org/unstable/apt/sources.list.5.en.html
- dpkg-query(1) manual: https://man7.org/linux/man-pages/man1/dpkg-query.1.html
- DNF command reference: https://dnf.readthedocs.io/en/latest/command_ref.html
- DNF CLI differences from YUM: https://dnf.readthedocs.io/en/latest/cli_vs_yum.html
- Red Hat DNF commands list for RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_yum-commands-list_managing-software-with-the-dnf-tool
- Red Hat yum-complete-transaction documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/sec2-yum-complete-transaction
- DNF versionlock plugin documentation: https://dnf-plugins-core.readthedocs.io/en/latest/versionlock.html
- Fedora automatic updates documentation: https://docs.fedoraproject.org/en-US/quick-docs/autoupdates/
- Nginx Linux packages documentation: https://nginx.org/en/linux_packages.html

## Issues Found
- The APT section said `apt upgrade` does not install new dependencies. Current apt documentation says `upgrade` may install new packages when required to satisfy dependencies, but it does not remove installed packages. Updated the comment accordingly.
- The Ubuntu PPA example described `ppa:nginx/stable` as the official Nginx repository. The official nginx.org repository is shown separately in the manual repository example, so the PPA comment was narrowed to "Nginx stable PPA on Ubuntu."
- The DNF equivalent for `yum deplist nginx` used `dnf repoquery --requires nginx`. DNF documentation identifies `dnf repoquery --deplist` as the closer replacement for YUM `deplist`, so the command was corrected.
- The automatic updates example only showed `yum-cron`, which applies to YUM-era RHEL/CentOS systems. Added the DNF-based `dnf-automatic` timer commands for RHEL 8+/Fedora.

## Review Notes
- Most commands are valid as practical administrative examples, but several are distribution-version dependent. For example, package names, available package versions, repository codenames such as `focal`, and exact service/package names can vary by release.
- `apt-file search` requires the `apt-file` package and an updated apt-file cache on systems where it is not already configured.
- `package-cleanup` and `yum-complete-transaction` are legacy YUM troubleshooting tools and are most relevant on older RHEL/CentOS releases.
