# Validation Summary: How to Set Up a Transparent Squid Proxy for IPv4 on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Squid forward proxy and intercept mode
- Squid ACLs and `http_access` rules
- Squid Cache Manager
- Linux IPv4 forwarding
- iptables NAT `PREROUTING`, `REDIRECT`, `POSTROUTING`, and `MASQUERADE`
- Debian/Ubuntu `iptables-persistent` and `netfilter-persistent`
- `curl`, `tail`, `awk`, and Squid access logs

## Sources Consulted
- Squid `http_port` configuration directive: https://www.squid-cache.org/Doc/config/http_port/
- Squid `acl` configuration directive: https://www.squid-cache.org/Doc/config/acl/
- Squid `http_access` configuration directive: https://www.squid-cache.org/Doc/config/http_access/
- Squid Linux traffic interception with REDIRECT example: https://wiki.squid-cache.org/ConfigExamples/Intercept/LinuxRedirect
- Squid `ssl_bump` configuration directive: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid HTTPS feature documentation: https://wiki.squid-cache.org/Features/HTTPS
- Squid Cache Manager documentation: https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid `squidclient` tool documentation: https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool
- Squid release information: https://www.squid-cache.org/Versions/
- Linux iptables extensions man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html
- procps `sysctl.conf(5)` man page: https://manpages.debian.org/testing/procps/sysctl.conf.5.en.html
- Debian `netfilter-persistent(8)` man page: https://manpages.debian.org/buster/netfilter-persistent/netfilter-persistent.8.en.html
- Local command help/output for `iptables`, `iptables-translate`, `sysctl`, `curl`, and `awk`

## Issues Found
- The architecture diagram showed the client sending an HTTP request to `0.0.0.0:80`. Clients send traffic to the destination server's IP/host on port 80; iptables redirects that traffic on the gateway. Changed the diagram to `destination server:80`.
- The introduction described HTTPS as `HTTPS (CONNECT)` in the transparent case. Squid documentation distinguishes direct TLS connections from CONNECT tunnels; browsers use CONNECT when explicitly configured to use a proxy. Updated the HTTPS wording to refer to direct HTTPS traffic.
- The Squid ACL snippet defined `CONNECT` but did not restrict CONNECT requests to SSL ports, and it did not allow localhost Cache Manager access before denying manager access elsewhere. Added `SSL_ports`, `http_access deny CONNECT !SSL_ports`, `http_access allow localhost manager`, and `http_access deny manager`. Added `3128` to `Safe_ports` so the Cache Manager URL on the local Squid port is not blocked by the safe-port check.
- The iptables REDIRECT command used `--to-port`. The local tool accepted it as an abbreviation, but the documented REDIRECT option is `--to-ports`. Updated the command to the documented form.
- The "avoid loops" rule used `-m owner --uid-owner proxy` in the `nat` table `PREROUTING` chain and appeared after the REDIRECT rule. The owner match is documented for locally generated packets in `OUTPUT` and `POSTROUTING`; forwarded client packets do not have a socket owner. Removed the invalid rule and replaced it with a note explaining that Squid's own outbound traffic is not redirected by the shown `PREROUTING` rule.
- The verification command used plain `curl`, which may choose IPv6 on dual-stack clients. Since the guide is explicitly IPv4, changed it to `curl -4`.
- The HTTPS bypass example implied the HTTP-only redirect affected HTTPS traffic and was not scoped to the local subnet. Updated the comment to make the rule optional for broader redirect rules and added the same `10.0.1.0/24` source scope.
- The Cache Manager command used `squidclient`, which Squid documents as removed from Squid 7. Replaced it with the current HTTP Cache Manager URL accessed with `curl`.

## Review Notes
Squid was not installed in the local environment, so `squid -k parse` could not be run. The Squid directives and access-control order were checked against the official Squid configuration documentation instead. The updated iptables examples were syntax-checked with `iptables-translate` on iptables v1.8.10 using the nf_tables backend. The persistence commands are Debian/Ubuntu-specific; other Linux distributions may prefer native nftables, firewalld, or distro-specific persistence tooling.
