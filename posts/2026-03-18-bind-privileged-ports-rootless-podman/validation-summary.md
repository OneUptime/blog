# Validation Summary: How to Bind Privileged Ports with Rootless Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman rootless containers
- Linux privileged ports and `net.ipv4.ip_unprivileged_port_start`
- Linux capabilities and `CAP_NET_BIND_SERVICE`
- nginx reverse proxying
- iptables NAT redirection
- sysctl configuration

## Sources Consulted
- Podman rootless limitations: https://github.com/containers/podman/blob/main/rootless.md
- Podman `podman run --publish` documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman rootless tutorial and networking notes: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux `ip(7)` manual page: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux capabilities manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html

## Issues Found
- The post description said it covered socket activation, but the article did not include a socket activation method. I changed the description to list the methods the post actually covers.
- The introduction claimed the guide covered "every method". Podman's own rootless documentation lists additional approaches such as redirection tools, so I changed this to "several common methods".
- The sample Podman error text contained a typo in the higher-port guidance. I corrected it to say to choose a larger port number.
- Method 4 was titled "Set Ambient Capabilities" even though `setcap` sets file capabilities, not ambient capabilities. I renamed it to "Set File Capabilities".
- Method 4 said the capability was being granted to the Podman binary, but the command targeted the `rootlessport` helper. I corrected the explanation.
- Method 4 implied the `rootlessport` `setcap` approach works universally. Podman 5 defaults to `pasta`, and the helper path/backend can vary, so I added a backend and distribution caveat.
- Method 4 mapped `443:443` to the default nginx image and tested with HTTPS, but the default nginx image serves HTTP on port 80 unless separately configured for TLS. I changed the example to `80:80` and `curl http://localhost:80`.

## Review Notes
The sysctl, reverse proxy, and firewall-forwarding approaches match Podman's documented rootless limitations and Linux kernel behavior. The iptables persistence commands are Debian/Ubuntu-specific as labeled; systems using nftables or firewalld may prefer native persistent rules.
