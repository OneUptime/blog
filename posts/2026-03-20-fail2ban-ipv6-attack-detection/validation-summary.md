# Validation Summary: How to Configure Fail2Ban for IPv6 Attack Detection

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fail2Ban
- IPv6
- iptables and ip6tables
- nftables
- OpenSSH
- Nginx

## Sources Consulted
- Fail2Ban upstream repository: https://github.com/fail2ban/fail2ban
- Fail2Ban `iptables.conf`: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/action.d/iptables.conf
- Fail2Ban `iptables-multiport.conf`: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/action.d/iptables-multiport.conf
- Fail2Ban `nftables.conf`: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/action.d/nftables.conf
- Fail2Ban `nftables-multiport.conf`: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/action.d/nftables-multiport.conf
- Fail2Ban `sshd.conf` filter: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/filter.d/sshd.conf
- Fail2Ban `nginx-http-auth.conf` filter: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/filter.d/nginx-http-auth.conf
- Fail2Ban `nginx-botsearch.conf` filter: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/filter.d/nginx-botsearch.conf
- Fail2Ban `fail2ban.conf`: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/fail2ban.conf
- Fail2Ban `jail.conf(5)` man page: https://raw.githubusercontent.com/fail2ban/fail2ban/master/man/jail.conf.5
- Fail2Ban `fail2ban-client(1)` man page: https://raw.githubusercontent.com/fail2ban/fail2ban/master/man/fail2ban-client.1
- Fail2Ban `fail2ban-regex(1)` man page: https://raw.githubusercontent.com/fail2ban/fail2ban/master/man/fail2ban-regex.1
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The post claimed that IPv6 support required a separate `ip6tables-multiport` action and referenced `/etc/fail2ban/action.d/ip6tables-multiport.conf`. Upstream Fail2Ban does not ship that action file; current `iptables` actions handle IPv6 through `[Init?family=inet6]`, so I corrected the explanation and verification commands.
- The post used legacy wrapper action names such as `iptables-multiport` and `nftables-multiport`. Upstream marks those wrappers as obsolete in favor of `iptables[type=multiport]`, `iptables[type=allports]`, `nftables[type=multiport]`, and `nftables[type=allports]`, so I updated the configuration snippets.
- The readiness check used `fail2ban-client version`, which queries the server version. I changed it to `fail2ban-client -V`, which is the documented client version command and works even when the server is not running.
- The custom `sshd-ipv6.conf` example was incomplete because it used `%(__prefix_line)s` without including `common.conf`, and it implied that separate IPv6 regex logic was required. I fixed the example to include `common.conf` and clarified that `<HOST>` already handles IPv4 and IPv6.
- The custom filter guidance said IPv6 addresses “need updating” because they contain colons. That is only true for filters that hard-code IPv4 dotted-decimal patterns, so I corrected the explanation.
- The sample whitelist contained `2001:db8:admin::/48`, which is not a valid IPv6 prefix because `admin` is not hexadecimal. I replaced it with the valid documentation prefix `2001:db8:100::/48`.
- The `fail2ban-regex` examples tested `/etc/fail2ban/filter.d/sshd.conf` directly even though the article’s guidance depends on Fail2Ban’s built-in sshd filter behavior. I changed the examples to use the documented filter name form, `sshd`.

## Review Notes
- The `nginx-botsearch` example uses `/var/log/nginx/access.log`. Upstream `jail.conf` defaults that jail to `%(nginx_error_log)s`, but the shipped `nginx-botsearch` filter also contains an access-log regex, so the example can still work if the log format matches.
- The post now aligns with current upstream behavior as of the review date, including Fail2Ban’s `allowipv6 = auto` default and the current `iptables`/`nftables` action model.
