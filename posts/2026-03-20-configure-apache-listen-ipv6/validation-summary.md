# Validation Summary: How to Configure Apache to Listen on IPv6 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- IPv6
- Apache `Listen` directive
- Apache `VirtualHost` configuration
- Linux networking tools (`ss`, `netstat`)
- `curl`
- `systemd`

## Sources Consulted
- Apache HTTP Server 2.4, Binding to Addresses and Ports: https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server 2.4, `apachectl` control interface: https://httpd.apache.org/docs/current/en/programs/apachectl.html
- Apache HTTP Server 2.4, `httpd` program options: https://httpd.apache.org/docs/current/programs/httpd.html
- Apache HTTP Server 2.4, `<VirtualHost>` directive: https://httpd.apache.org/docs/current/en/mod/core.html#virtualhost
- Apache HTTP Server 2.4, VirtualHost examples: https://httpd.apache.org/docs/current/en/vhosts/examples.html
- Apache HTTP Server 2.4, In-Depth Discussion of Virtual Host Matching: https://httpd.apache.org/docs/current/en/vhosts/details.html
- Local CLI help checked against the command examples: `ss --help`, `curl --help all`, `netstat --help`

## Issues Found
- The post described `Listen 80` as IPv4-only (`0.0.0.0:80`). Apache’s documentation says a port-only `Listen` directive listens on all interfaces, and IPv4/IPv6 behavior depends on platform and v4-mapped socket support. I corrected the explanation and removed the misleading inline comment.
- The dual-stack example presented `Listen 0.0.0.0:80` and `Listen [::]:80` as a universal pattern. Apache documents that these can overlap on platforms where an IPv6 socket also accepts IPv4 via mapped addresses. I updated the section to explain that this explicit pair is for builds using separate IPv4 and IPv6 sockets.
- The post implied that `Listen [::]:80` is always IPv6-only. That is not universally true on common Linux builds with IPv4-mapped IPv6 sockets enabled. I corrected the IPv6-only explanation to note the build/platform dependency.
- The `VirtualHost` section labeled `<VirtualHost [::]:80>` as an IPv6-only virtual host. I changed the example to a specific IPv6 address and clarified that `<VirtualHost *:80>` matches any address Apache is listening on for port 80.
- The section title `Enable IPv6 Module` was inaccurate because Apache does not have a separate IPv6 module to enable. I changed the section to `Verify IPv6 Support` and replaced the unsupported output expectation with build/configuration verification steps.
- The verification commands used process-name filters and expected output that were too narrow or inaccurate for `ss`. I updated the filters to match both `apache2` and `httpd`, and changed the expected result to a generic IPv6 `LISTEN` entry instead of a hard-coded `tcp6` line.
- The grep example for finding IPv6 `Listen` directives needed a correct literal `[` escape in basic regex syntax. I fixed the pattern so the command works as written.

## Review Notes
- Apache’s IPv4/IPv6 listener behavior is platform- and build-dependent because of IPv4-mapped IPv6 sockets (`--enable-v4-mapped` vs. `--disable-v4-mapped`). The post now reflects that portability caveat.
- The IPv6 examples use the documentation prefix `2001:db8::/32`; readers must replace those addresses with real assigned IPv6 addresses when applying the configuration.
- The post mixes Debian/Ubuntu examples (`apache2ctl`, `/etc/apache2/`) with RHEL/CentOS examples (`httpd`, `/etc/httpd/`). That is acceptable for a cross-distro guide, but readers need to use the command/path set appropriate for their distribution.
