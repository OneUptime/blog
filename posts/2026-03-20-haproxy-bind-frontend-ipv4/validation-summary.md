# Validation Summary: How to Configure HAProxy to Bind a Frontend to a Specific IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- IPv4 networking
- Linux service management
- TLS/SSL termination

## Sources Consulted
- HAProxy Configuration Manual: https://docs.haproxy.org/3.2/configuration.html
- HAProxy Management Guide: https://docs.haproxy.org/3.2/management.html
- HAProxy Frontends tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/frontends/
- HAProxy TLS tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/basics-enable-tls/
- HAProxy Statistics dashboard tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/statistics/

## Issues Found
- The "Binding to All IPv4 Interfaces" example defined both `bind 0.0.0.0:80` and `bind *:80` in the same frontend even though they are equivalent listeners. I changed the second line to a commented alternative so the example no longer implies binding the same socket twice.
- The "Setting TCP Options on Bind" snippet used shell-style line continuations and inline comments that do not match HAProxy configuration syntax. I rewrote it as a single valid `bind` line with bind options on the same statement.
- The "SSL Bind Configuration" snippet claimed to redirect HTTP to HTTPS inside a frontend that only listened on `:443`. I removed the redirect lines because an HTTPS-only frontend does not receive port 80 traffic to redirect.
- The "Verifying Bind Configuration" section used `echo "reload" | ... /var/run/haproxy/admin.sock`, which is not the standard documented way to do a seamless reload through the regular runtime/admin socket. I replaced it with a documented soft reload command using `haproxy -sf` and the pid file.

## Review Notes
- `defer-accept` is supported only on certain operating systems and kernel combinations, so it is valid as an example bind option but not universally portable.
- `systemctl reload haproxy` depends on the distribution's service unit configuration. The direct `haproxy -sf` example is the clearer portable reference for seamless reload behavior.
