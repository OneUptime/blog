# Validation Summary: How to Monitor Real-Time Memory Usage per Process with smem on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- EPEL
- DNF
- smem
- procps watch
- Linux /proc memory metrics

## Sources Consulted
- smem(8) manual page: https://man7.org/linux/man-pages/man8/smem.8.html
- Fedora EPEL 9 smem package page: https://packages.fedoraproject.org/pkgs/smem/smem/epel-9.html
- Fedora EPEL 9 python3-matplotlib package page: https://packages.fedoraproject.org/pkgs/python-matplotlib/python3-matplotlib/epel-9.html
- Red Hat blog, "How to install EPEL on RHEL and CentOS Stream": https://www.redhat.com/en/blog/install-epel-linux
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- proc_pid_smaps(5) manual page: https://www.man7.org/linux/man-pages/man5/proc_pid_smaps.5.html
- procps watch(1) manual page: https://manpages.debian.org/unstable/procps/watch.1.en.html

## Issues Found
- The post used `sudo dnf install -y smem` without noting that `smem` is packaged for Enterprise Linux 9 through EPEL. Added the RHEL 9 CodeReady Builder/EPEL setup and the CentOS Stream 9 CRB/EPEL setup before installation.
- The post described "real-time" monitoring but only showed one-time `smem` reports. Added a `watch -n 2 'smem -tk --sort pss'` command to refresh the report periodically.
- The post said `smem -u` shows memory for a specific user. The `-u` option reports by user; filtering to a specific user uses `-U/--userfilter`. Updated the text and added `smem -U nginx`.
- The post included `systemctl` and `journalctl` examples for a placeholder service. `smem` is a command-line reporting tool, not a service to enable or start. Replaced those sections with command-based verification and troubleshooting.
- The graphical chart command depends on matplotlib. Added `python3-matplotlib` to the installation command so the chart example works.

## Review Notes
The `smem` options shown in the corrected post match the documented `smem(8)` flags. The EPEL package page currently lists `smem` for Fedora EPEL 9, which matches the RHEL 9 and CentOS Stream 9 target in the post.
