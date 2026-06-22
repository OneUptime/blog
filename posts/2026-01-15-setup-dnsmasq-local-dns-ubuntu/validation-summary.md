# Validation Summary: How to Set Up dnsmasq as a Local DNS Server on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- dnsmasq
- DNS
- DHCP
- systemd-resolved
- resolvconf integration
- Stubby / DNS-over-TLS
- systemd services

## Sources Consulted
- dnsmasq official man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- systemd resolved.conf man page: https://man7.org/linux/man-pages/man5/resolved.conf.5.html
- systemd-resolved.service local man page on Ubuntu 24.04
- dnsmasq local man page on Ubuntu 24.04
- RFC 8375, Special-Use Domain `home.arpa.`: https://datatracker.ietf.org/doc/html/rfc8375
- RFC 6762, Multicast DNS and `.local.` behavior: https://datatracker.ietf.org/doc/html/rfc6762
- IANA `.arpa` registry: https://www.iana.org/domains/arpa
- Stubby man page: https://getdnsapi.net/documentation/manpages/stubby/
- Ubuntu package metadata for `dnsmasq`, `systemd-resolved`, `resolvconf`, and `stubby`

## Issues Found
- The post used `home.local`, `dev.local`, and other `.local` examples for conventional unicast DNS. RFC 6762 reserves `.local.` for Multicast DNS link-local resolution, and RFC 8375 designates `home.arpa.` for residential home networks. Replaced the local DNS examples with `home.arpa` and development examples with `.test`.
- The systemd-resolved conflict explanation said systemd-resolved listens on port 53 generally. Updated it to state that the default stub listener uses loopback addresses such as `127.0.0.53:53`, which is the precise conflict relevant to dnsmasq binding.
- The `local-ttl` comment incorrectly described it as overriding upstream cache TTLs. Changed it to say it applies to local answers from `/etc/hosts`, dnsmasq config, and DHCP leases.
- The `neg-ttl` comment implied it controls all negative caching. Updated it to reflect dnsmasq behavior: it provides a default TTL only when upstream negative responses do not include SOA TTL information.
- The Stubby DNS-over-TLS example assumed `127.0.0.1#5353` without noting that Stubby must be configured to listen on the same port. Added that caveat.
- The troubleshooting section used `netstat`, which is not installed by default on many current Ubuntu systems. Replaced it with `ss`.
- The slow DNS troubleshooting comment said disabling `strict-order` allows parallel queries. Corrected it to say dnsmasq can choose upstream servers based on responsiveness; `all-servers` is the option that queries all upstreams.
- The resolvconf troubleshooting section recommended replacing `systemd-resolvconf` with the traditional `resolvconf` package, but that package path is not valid for current Ubuntu 24.04 repositories. Replaced it with a systemd drop-in override that clears the dnsmasq resolvconf hook commands if `IGNORE_RESOLVCONF=yes` is insufficient.

## Review Notes
The dnsmasq directives, DHCP option names, upstream server syntax, blocklist `address=/domain/IP` syntax, `conf-file`, `conf-dir`, logging options, cache-size settings, SIGUSR1 cache statistics behavior, and systemd-resolved `DNSStubListener=no` usage were checked against official or local man pages and are technically valid after the corrections above.
