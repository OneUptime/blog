# Validation Summary: How to Find Open Files and Sockets with lsof on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- lsof
- DNF package management
- Linux process and socket inspection

## Sources Consulted
- lsof local manual page, `man lsof`
- lsof local help output, `lsof -h`
- lsof upstream manual page: https://man7.org/linux/man-pages/man8/lsof.8.html
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool

## Issues Found
- The post described configuring, enabling, starting, and checking a service, but `lsof` is a diagnostic command-line utility rather than a systemd service. Replaced those commands with `dnf install lsof`, `lsof -v`, and practical lsof verification commands.
- The listening-port example used `lsof -i -P -n | grep LISTEN`. This can work, but lsof directly supports TCP state filtering. Changed it to `lsof -iTCP -sTCP:LISTEN -P -n` to use documented lsof selectors.
- The verification and troubleshooting sections referenced generic service status, logs, and package placeholders. Updated them to verify lsof output and troubleshoot missing privileges or missing package installation.

## Review Notes
The remaining lsof commands use documented options: `-p` for process IDs, `-i` for Internet sockets, path arguments for named files, `-u` for users, `-P` to disable port-name conversion, and `-n` to disable host-name lookups. Running with `sudo` may be required on RHEL systems to inspect processes owned by other users.
