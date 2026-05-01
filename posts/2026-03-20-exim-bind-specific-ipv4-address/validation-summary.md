# Validation Summary: How to Set Up Exim to Bind to a Specific IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- Exim
- SMTP
- IPv4
- IPv6
- Debian/Ubuntu Exim split configuration
- Linux mail server configuration

## Sources Consulted
- Exim Specification, Chapter 13: Starting the daemon and the use of network interfaces: https://www.exim.org/exim-html-current/doc/html/spec_html/ch-starting_the_daemon_and_the_use_of_network_interfaces.html
- Exim Specification, Chapter 30: The smtp transport: https://www.exim.org/exim-html-current/doc/html/spec_html/ch-the_smtp_transport.html
- Exim Specification, Chapter 14: Main configuration: https://www.exim.org/exim-html-current/doc/html/spec_html/ch-main_configuration.html
- Exim Specification, Chapter 5: The Exim command line: https://www.exim.org/exim-html-current/doc/html/spec_html/ch-the_exim_command_line.html
- Debian `update-exim4.conf(8)` man page: https://manpages.debian.org/trixie-backports/exim4-config/update-exim4.conf.8.en.html
- Debian `exim4-daemon-light.exim4.service` source: https://sources.debian.org/src/exim4/4.98.2-1/debian/exim4-daemon-light.exim4.service
- Debian `README.Debian.xml` for Exim4: https://sources.debian.org/src/exim4/4.98.2-1/debian/README.Debian.xml
- Debian bug log showing packaged `remote_smtp` and `remote_smtp_smarthost` transport definitions and `REMOTE_SMTP_INTERFACE`: https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1081253

## Issues Found
- The post used `smtp_bind_address`, which is a Postfix parameter, not an Exim directive. I replaced it with Exim's actual outbound bind mechanism: the `interface` option on the `smtp` transport, shown in the `remote_smtp` transport block.
- The `local_interfaces` examples used `192.168.1.10:25` style syntax, which is not the documented Exim syntax for attaching ports to interface entries. Because the examples only needed the default SMTP port, I corrected them to valid address-only `local_interfaces` values.
- The Debian split-config example placed the outbound bind setting in `main/02_exim4-config_options`, but outbound source binding belongs on the SMTP transport, not in main options. I moved that setting to `/etc/exim4/conf.d/transport/30_exim4-config_remote_smtp` and noted the corresponding smarthost transport caveat.
- The IPv6 section claimed that `dns_ipv4_lookup = *` disables outbound IPv6. Exim documents `disable_ipv6 = true` as the actual switch for disabling IPv6 entirely, so I replaced that guidance and updated the takeaways.
- The Debian workflow was adjusted to use `update-exim4.conf --check` before restart, then `systemctl restart exim4`, which matches the documented Debian packaging behavior more closely than editing split config and treating `exim -bV` alone as the primary validation step.

## Review Notes
`exim -bV` is a valid syntax check, but Exim documents it as a static check only; it does not catch all runtime expansion errors. Also, `dns_ipv4_lookup` is still useful when you want to suppress AAAA lookups for selected domains, but it is not a full replacement for `disable_ipv6`.
