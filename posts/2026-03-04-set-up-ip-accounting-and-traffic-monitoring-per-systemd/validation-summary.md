# Validation Summary: How to Set Up IP Accounting and Traffic Monitoring per systemd Service on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd service units
- systemd IP accounting
- systemctl
- journalctl
- rpm

## Sources Consulted
- systemd.resource-control(5), systemd 252: https://www.freedesktop.org/software/systemd/man/252/systemd.resource-control.html
- systemctl(1), systemd 252: https://www.freedesktop.org/software/systemd/man/252/systemctl.html
- journalctl(1), systemd 252: https://www.freedesktop.org/software/systemd/man/252/journalctl.html
- org.freedesktop.systemd1(5), systemd 252: https://www.freedesktop.org/software/systemd/man/252/org.freedesktop.systemd1.html
- Red Hat/CentOS Stream systemd packaging references for RHEL 9 generation, systemd 252: https://gitlab.com/redhat/centos-stream/rpms/systemd/-/blob/c9s/systemd.spec

## Issues Found
- The examples used shell placeholders such as `<service-name>` and `<setting>`. In a POSIX shell, unquoted angle brackets are redirection syntax, so copying these commands literally would fail or behave incorrectly. I changed the examples to use `nginx.service`, matching the service used earlier in the guide.
- The verification command `systemctl show <service-name> | grep -i <setting>` was not directly valid and did not verify the setting named in the guide. I changed it to `systemctl show nginx.service -p IPAccounting`, which uses the documented `systemctl show --property` behavior and checks the actual IP accounting setting.
- The restart and journal examples now use the explicit unit name `nginx.service` for consistency with the drop-in path and traffic-statistics command.
- The package-check command used `rpm -qa | grep <package-name>`, which had the same shell placeholder problem. I changed it to `rpm -q nginx`, a direct package query for the service used in the guide.

## Review Notes
systemd's `IPAccounting=yes` setting and the `IPIngressBytes`, `IPEgressBytes`, `IPIngressPackets`, and `IPEgressPackets` properties are documented for systemd 252, which matches the RHEL 9 systemd generation. systemd documentation notes that IP accounting depends on system support such as eBPF cgroup functionality and applies to system services rather than per-user services; this could be mentioned in a future expansion, but it does not make the current RHEL 9-focused procedure incorrect.
