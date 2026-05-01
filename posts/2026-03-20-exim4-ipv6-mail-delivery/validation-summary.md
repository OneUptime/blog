# Validation Summary: How to Configure Exim4 for IPv6 Mail Delivery

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Exim4
- IPv6
- SMTP
- Debian/Ubuntu Exim configuration
- DNS (MX and AAAA records)
- Linux networking tools (`ss`, `dig`)

## Sources Consulted
- Exim Specification, Chapter 13 - Starting the daemon and the use of network interfaces: https://www.exim.org/exim-html-current/doc/html/spec_html/ch-starting_the_daemon_and_the_use_of_network_interfaces.html
- Exim Specification, Chapter 17 - The dnslookup router: https://www.exim.org/exim-html-current/doc/html/spec_html/ch-the_dnslookup_router.html
- Exim Specification, Chapter 30 - The smtp transport: https://www.exim.org/exim-html-current/doc/html/spec_html/ch-the_smtp_transport.html
- Exim Specification, Chapter 5 - The Exim command line: https://www.exim.org/exim-html-current/doc/html/spec_html/ch-the_exim_command_line.html
- Debian `update-exim4.conf.conf(5)`: https://manpages.debian.org/testing/exim4-config/update-exim4.conf.conf.5.en.html
- Debian `update-exim4.conf(8)`: https://manpages.debian.org/testing/exim4-config/update-exim4.conf.8.en.html
- Debian Exim README: https://sources.debian.org/src/exim4/4.98.2-1/debian/README.Debian.xml/

## Issues Found
- The introduction overstated the need for manual IPv6 enablement. Upstream Exim listens on all interfaces by default when `local_interfaces` is unset, so I changed the wording to describe configuration changes as conditional rather than universally required.
- The listener example used `::` as the wildcard IPv6 listener. Exim documents `::0` as the special "all IPv6 interfaces" value, so I corrected the examples.
- The split-configuration macro example used invalid Exim list syntax. I changed `MAIN_LOCAL_INTERFACES` to use the required `<;` list-separator prefix for semicolon-separated values in the live Exim configuration.
- The `remote_smtp` transport example had an invalid `interface` line with a stray trailing `>` character. I fixed the syntax and clarified that `interface` binds the local source address for IPv6 deliveries rather than forcing Exim to choose IPv6 destinations.
- The post incorrectly described `dc_minimaldns='false'` as enabling IPv4 and IPv6 outbound delivery. That setting controls DNS lookup minimization, so I removed the misleading line.
- The testing section described verbose message submission as "built-in test mode" and included a debug command that would wait for message input on stdin. I corrected the wording and changed the examples to submit actual message content.
- Queue inspection and debug commands were missing `sudo` even though Exim restricts some of those operations to admin users. I updated those commands accordingly.
- The listener and log-verification examples were too specific about command output. I adjusted them to match documented Exim behavior more accurately.

## Review Notes
- Inbound IPv6 mail delivery also depends on working host IPv6 connectivity, firewall policy, and public DNS (`AAAA`, `MX`, and PTR records). The post remains focused on Exim configuration.
- Debian installations may use split or unsplit Exim configuration layouts. The corrected transport-edit instructions now reflect both cases.
