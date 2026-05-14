# Validation Summary: How to Use top, htop, and ps to Monitor System Processes on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package installation
- top
- htop
- ps
- pgrep
- Linux process states and threads

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Customer Portal solution, "Does Red Hat Enterprise Linux support htop?": https://access.redhat.com/solutions/3159101
- Fedora Packages, htop EPEL 9 package listing: https://packages.fedoraproject.org/pkgs/htop/htop/
- Linux top(1) manual page: https://man7.org/linux/man-pages/man1/top.1.html
- Linux htop(1) manual page: https://man7.org/linux/man-pages/man1/htop.1.html
- Linux ps(1) manual page: https://man7.org/linux/man-pages/man1/ps.1.html
- Linux pgrep(1) manual page: https://man7.org/linux/man-pages/man1/pgrep.1.html
- Local procps-ng `top --help`, `ps --help all`, and `pgrep --help` output

## Issues Found
- The `top` header description listed "available memory" as though it were a swap field. Modern `top` displays swap total/free/used and an available-memory estimate, so the bullet was corrected to "plus available memory estimate."
- The `htop` installation section implied `sudo dnf install htop -y` always works on any RHEL system. `dnf install` is correct when the package is available from enabled repositories, and EPEL 9 provides `htop`; the wording now adds that repository availability caveat.

## Review Notes
The remaining command examples and shortcuts reviewed are consistent with the referenced documentation: `top`, `top -bn1`, `top -p`, common interactive `top` keys, `htop -u`, common htop function keys, `ps aux`, `ps auxf`, GNU `ps --sort`, custom `ps -eo` fields, `pgrep -a`, and `ps -T -p`. The `ps aux | grep httpd` example is valid, though `pgrep -a httpd` is usually cleaner for avoiding a matching `grep` process.
