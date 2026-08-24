# Validation Summary: How to Receive SNMP Traps on Port 162 with Telegraf Without Running It as Root

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Telegraf and the `inputs.snmp_trap` service input
- SNMPv1, SNMPv2c, and SNMPv3 traps and inform requests
- SNMP MIB translation with `gosmi`
- Linux capabilities and `CAP_NET_BIND_SERVICE`
- systemd service drop-ins and capability controls
- UDP port binding, firewall forwarding, and Linux socket/process diagnostics

## Sources Consulted
- [Telegraf v1.39.3 release](https://github.com/influxdata/telegraf/releases/tag/v1.39.3)
- [Telegraf SNMP trap input plugin documentation](https://docs.influxdata.com/telegraf/v1/input-plugins/snmp_trap/)
- [Telegraf v1.39.3 SNMP trap input implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/snmp_trap/snmp_trap.go#L190-L336) and [tests](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/snmp_trap/snmp_trap_test.go#L1305-L1387)
- [Telegraf agent SNMP translator settings](https://docs.influxdata.com/telegraf/v1/configuration/agent/#snmp)
- [Telegraf secret references](https://docs.influxdata.com/telegraf/v1/configuration/secrets/)
- [Telegraf commands and flags](https://docs.influxdata.com/telegraf/v1/commands/), [service-input testing](https://docs.influxdata.com/telegraf/v1/configure_plugins/input_plugins/), and [troubleshooting](https://docs.influxdata.com/telegraf/v1/administer/troubleshoot/)
- [Current upstream Telegraf systemd service unit](https://github.com/influxdata/telegraf/blob/master/scripts/telegraf.service)
- [systemd execution environment and capability directives](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)
- [Linux capabilities manual](https://man7.org/linux/man-pages/man7/capabilities.7.html), [`setcap(8)`](https://man7.org/linux/man-pages/man8/setcap.8.html), and [`getcap(8)`](https://man7.org/linux/man-pages/man8/getcap.8.html)
- [Linux `ip_unprivileged_port_start` documentation](https://docs.kernel.org/networking/ip-sysctl.html#ip-variables)
- [RFC 3417: SNMP transport mappings and UDP port 162](https://www.rfc-editor.org/rfc/rfc3417.html)
- [RFC 3416: unconfirmed traps and confirmed inform requests](https://www.rfc-editor.org/rfc/rfc3416.html)
- [`ss(8)`](https://man7.org/linux/man-pages/man8/ss.8.html), [`ps(1)`](https://man7.org/linux/man-pages/man1/ps.1.html), [`systemctl(1)`](https://man7.org/linux/man-pages/man1/systemctl.1.html), and [`journalctl(1)`](https://man7.org/linux/man-pages/man1/journalctl.1.html)

## Issues Found
- The post incorrectly said numeric OIDs continue to work when textual MIB translation fails. Telegraf's trap handler deliberately does not fall back to numeric OIDs: a failed trap or varbind lookup is logged and that trap metric is not emitted. The text now describes the actual failure behavior and recommends using the logged numeric OID to distinguish translation failures from delivery failures.
- The systemd drop-in assigned capability lists without first clearing possible earlier assignments. Repeated positive `AmbientCapabilities=` and `CapabilityBoundingSet=` settings are merged, so the original snippet did not universally guarantee a one-capability set. Empty reset assignments were added before granting only `CAP_NET_BIND_SERVICE`.
- The socket check always inspected UDP port 162 even though Option 3 makes Telegraf listen on UDP port 1162. The verification text now directs Option 3 users to check port 1162 and uses the native `ss` source-port filter.
- `systemctl show ... -p User` reports the configured service user but does not verify the effective UID of the running process. A `ps` check against systemd's `MainPID` was added to verify the live process identity.
- The firewall guidance said to check both directions without distinguishing traps from inform requests. It now correctly identifies the sender-egress and receiver-ingress path for unconfirmed traps and reserves return-path verification for inform responses. The journal command also now uses `sudo` so it works for users without journal-group access.

## Review Notes
- Telegraf v1.39.3 was the latest release on the validation date. `netsnmp` remains the default translator in that release but is deprecated; the post correctly selects the recommended built-in `gosmi` translator explicitly.
- `AmbientCapabilities=` requires systemd 229 or later and Linux ambient-capability support, introduced in Linux 4.3. This is a legacy-system caveat rather than a current error.
- Linux can change the default privileged-port boundary with `net.ipv4.ip_unprivileged_port_start`; the post's wording correctly describes the default Linux configuration.
- A locally hardened unit with `NoNewPrivileges=yes` or a capability bounding set that excludes `CAP_NET_BIND_SERVICE` can block the binary file-capability method. The current upstream Telegraf unit has neither setting.
