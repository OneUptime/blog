# Validation Summary: How to Use IPv6 for Home Lab Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux networking
- Netplan
- OpenSSH
- NGINX
- Docker Engine
- Docker Compose
- nftables
- dnsmasq
- Local DNS and host-based name resolution

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh.1
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config.5
- NGINX `listen` directive reference: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Docker Engine IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Netfilter `nft(8)` man page: https://netfilter.org/projects/nftables/manpage.html
- RFC 4864, Local Network Protection for IPv6: https://www.rfc-editor.org/rfc/rfc4864.html
- RFC 6092, Recommended Simple Security Capabilities in Customer Premises Equipment (CPE) for Providing Residential IPv6 Internet Service: https://www.rfc-editor.org/rfc/rfc6092.html
- RFC 8375, Special-Use Domain `home.arpa.`: https://www.rfc-editor.org/rfc/rfc8375.html

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8:home::10` and `2001:db8:home:docker::/64`. These are not syntactically valid IPv6 addresses because hextets must be hexadecimal. I replaced them with valid documentation-prefix examples under `2001:db8:100::/64` and `2001:db8:101::/64`.
- The Netplan snippet said `dhcp6: false` disables SLAAC. That is incorrect in Netplan; `dhcp6` controls DHCPv6, while router advertisements/SLAAC are controlled by `accept-ra`. I corrected the comment and added `accept-ra: false`.
- The local naming section described `/etc/hosts` as local DNS. `/etc/hosts` is host-based name resolution, not DNS. I updated the wording to cover local name resolution accurately.
- The post used the `.home` suffix for local names. RFC 8375 deprecated `.home` for homenets and reserves `home.arpa.` for this purpose. I changed the examples to `lab.home.arpa`.
- The Docker Compose example used the top-level `version: "3"` field. Current Docker Compose documentation marks that field as obsolete and only informative. I removed it.
- The nftables example used `ip6 nexthdr icmpv6 accept`. The official `nft(8)` documentation cautions that `ip6 nexthdr` only matches the immediate next header and can miss packets when IPv6 extension headers are present. I changed the rule to `meta l4proto ipv6-icmp accept` and aligned the loopback match to `iifname "lo"`.
- The remote-access and security wording overstated what IPv6 changes by itself. IPv6 removes the need for NAT for globally addressed hosts, but inbound reachability still depends on firewall policy, including common residential CPE defaults described in RFC 6092. I adjusted the wording to reflect that.

## Review Notes
- Static addresses taken from an ISP-delegated IPv6 prefix are only effectively "static" if the delegated prefix itself remains stable. If the ISP renumbers the prefix, host addresses, DNS records, and firewall rules must be updated.
