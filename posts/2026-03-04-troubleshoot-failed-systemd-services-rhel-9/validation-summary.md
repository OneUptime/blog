# Validation Summary: How to Troubleshoot Failed systemd Services on RHEL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd services and unit files
- systemctl
- journalctl
- SELinux, ausearch, sealert, audit2allow, and semodule
- Linux networking diagnostics with ss

## Sources Consulted
- systemctl(1) man page, systemd 255 local documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- journalctl(1) man page, systemd 255 local documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd.exec(5) man page for systemd service exit codes: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemd.service(5) man page for ExecStartPre behavior and command prefixes: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- ss(8) local help output from iproute2

## Issues Found
- Corrected the explanation of `journalctl -e`. The `-e` flag jumps to the end of the journal in the pager; it does not reverse output order or make the newest entries appear first.
- Corrected the user/group exit-code mapping. `217/USER` corresponds to user credential failures, while group credential failures are reported as `216/GROUP`.
- Narrowed "Exit Codes 1-255" to "Exit Codes 1-199" because systemd reserves and uses many 200-and-above status codes for service-manager and invocation failures.
- Clarified `ExecStartPre` behavior. Failed pre-start commands stop service startup unless the command is prefixed with `-`, which tells systemd to treat that failure as successful.
- Updated the SELinux remediation guidance. Red Hat recommends using `sealert` to identify the cause and fixing labels, booleans, or port types first; `audit2allow` policy modules should not be the first response to every denial.
- Clarified the port-binding section. The `ss -tlnp | grep :80` command checks whether a port is already in use, while binding to privileged ports as a non-root service also requires appropriate permission such as `CAP_NET_BIND_SERVICE`.
- Corrected the `reset-failed` explanation. `systemctl reset-failed` clears failed state explicitly, but a successful restart can also clear the failed active state.

## Review Notes
The core troubleshooting flow and command examples are technically sound for RHEL 9. Some commands, such as `sealert`, `audit2allow`, and `ausearch`, require the relevant RHEL packages and sufficient privileges, and previous-boot journal queries depend on the availability of retained journal data.
