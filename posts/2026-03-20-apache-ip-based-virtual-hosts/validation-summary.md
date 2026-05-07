# Validation Summary: How to Configure Apache IP-Based Virtual Hosts on IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server virtual hosts
- Apache `Listen` and `<VirtualHost>` configuration
- Debian/Ubuntu Apache site and module management (`a2ensite`, `a2enmod`, `apache2ctl`)
- Linux IPv4 interface configuration with `ip`
- HTTP testing with `curl`
- Socket inspection with `ss`
- TLS/SSL with Apache `mod_ssl`

## Sources Consulted
- Apache HTTP Server 2.4: IP-based Virtual Host Support - https://httpd.apache.org/docs/current/vhosts/ip-based.html
- Apache HTTP Server 2.4: Name-based Virtual Host Support - https://httpd.apache.org/docs/current/vhosts/name-based.html
- Apache HTTP Server 2.4: Binding to Addresses and Ports - https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server 2.4: VirtualHost Examples - https://httpd.apache.org/docs/current/en/vhosts/examples.html
- Apache HTTP Server 2.4: An In-Depth Discussion of Virtual Host Matching - https://httpd.apache.org/docs/current/en/vhosts/details.html
- Apache HTTP Server 2.4: `mod_ssl` documentation - https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Debian Manpages: `apache2ctl(8)` - https://manpages.debian.org/testing/apache2/apache2ctl.8.en.html
- Debian Manpages: `a2ensite(8)` - https://manpages.debian.org/bookworm/apache2/a2ensite.8.en.html
- Debian Manpages: `a2enmod(8)` - https://manpages.debian.org/unstable/apache2/a2enmod.8.en.html
- Local command help: `ip address help`
- Local command help: `curl --help`
- Local command help: `ss --help`

## Issues Found
- The `ports.conf` example only configured `:80`, but the post later defined HTTPS virtual hosts on `:443`. I updated the `Listen` example to include `:443` bindings for the SSL examples and to avoid leaving overlapping wildcard `Listen` directives enabled, because Apache documents overlapping `Listen` directives as a fatal startup error.
- The SSL section defined `SSLEngine on` virtual hosts but did not include the Debian/Ubuntu steps to enable `mod_ssl` and the HTTPS site configs. I added the missing `a2enmod ssl` and `a2ensite` commands after the SSL vhost files are defined so the walkthrough remains executable in order.
- The post instructed readers to reload Apache after changing `Listen` directives. Apache documents that listen-socket changes can conflict on reload/restart unless the old bindings are fully released, so I changed the command to `systemctl restart apache2`, which performs a stop/start style restart under systemd.
- The verification section used `curl -H "Host: ..."` as the primary routing test even though IP-based virtual-host selection is based on the destination IP and port. I changed the primary test to plain IP requests and kept the hostname override as an optional note for applications that expect it.
- The comparison table overstated a few behaviors. I clarified that IP-based virtual hosting can still host multiple sites on one IP when different ports are used, and I narrowed the SSL/SNI and Host-header rows so they match Apache’s documented virtual-host matching model more closely.
- I standardized `apachectl -S` to `apache2ctl -S` to match the Debian/Ubuntu-oriented paths and commands used throughout the post.

## Review Notes
- The article is Debian/Ubuntu-oriented because it uses `/etc/apache2`, `a2ensite`, `a2enmod`, and `apache2ctl`. Those commands are not portable to all Apache distributions.
- The placeholder addresses `203.0.113.10` and `203.0.113.11` are documentation-only IPv4 examples from TEST-NET-3, which is appropriate for a tutorial.
- The networking persistence example is intentionally simplified for Netplan-based systems; production network configuration still depends on the distribution, cloud platform, and interface management stack.
