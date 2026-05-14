# Validation Summary: How to Troubleshoot HAProxy Connection Timeout Issues on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- HAProxy
- SELinux
- firewalld
- Linux networking tools (`journalctl`, `nc`, `ss`, `socat`, `sysctl`)

## Sources Consulted
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy 3.1 Management Guide: https://docs.haproxy.org/3.1/management.html
- Red Hat Enterprise Linux Load Balancer Administration, Default Settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/load_balancer_administration/s1-haproxy-setup-defaults
- OpenBSD netcat local help output (`nc -h`)

## Issues Found
- The post said a `-1` HAProxy timing field means a timeout occurred at that stage. HAProxy log timers use `-1` to indicate that a phase did not complete; the termination state identifies the reason. Updated the logging guidance, timeout headings, troubleshooting flow, and wrap-up to use documented termination states such as `sC`, `sH`, `sD`, `cD`, `cH`, `cR`, and `sQ`.
- The post described the HTTP log timing format as `Tw/Tc/Tr/Tt`. Updated it to the documented HTTP timing fields `Tq/Tw/Tc/Tr/Ta`.

## Review Notes
The HAProxy timeout directives, stats socket commands, CSV field positions used by the `awk` examples, SELinux boolean command, firewalld check, netcat scan command, and Linux networking diagnostics are technically reasonable. The stats socket path `/var/lib/haproxy/stats` is deployment-specific and requires a matching `stats socket` setting in HAProxy configuration.
