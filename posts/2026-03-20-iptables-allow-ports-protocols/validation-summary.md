# Validation Summary: How to Allow Specific Ports and Protocols in iptables

## Status
validated

## Post Type
Guide

## Technologies Covered
- `iptables`
- Linux IPv4 firewalling
- TCP
- UDP
- ICMP
- Common network services and ports

## Sources Consulted
- Netfilter/iptables match documentation: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- DNS transport details (UDP/TCP port 53): https://www.rfc-editor.org/rfc/rfc1035
- IANA Service Name and Transport Protocol Port Number Registry: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
- Kubernetes ports and protocols reference: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Prometheus installation docs: https://prometheus.io/docs/prometheus/latest/installation/
- WireGuard quick start: https://www.wireguard.com/quickstart/
- PostgreSQL server documentation: https://www.postgresql.org/docs/current/app-postgres.html
- MySQL port reference: https://dev.mysql.com/doc/mysql-port-reference/en/mysql-port-reference-tables.html
- MongoDB default port reference: https://www.mongodb.com/docs/manual/reference/default-mongodb-port/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found
- The post used the older `-m state --state ...` match in the stateful examples. I replaced it with `-m conntrack --ctstate ...`, which is the current match documented by iptables and avoids relying on the older state alias.
- The DNS UDP example labeled inbound and outbound UDP/53 rules as a single generic "Allow DNS" case. I clarified the comments so one rule is explicitly for inbound queries to a local DNS server and the other is for outbound queries from the host.
- The stateful OUTPUT example was described as allowing all established responses, but the rule only matched packets with source port `22`. I corrected the comment so it accurately describes SSH responses only.
- The common-services comment grouped port `993` under an `SMTP` heading even though `993/tcp` is IMAPS, not SMTP. I changed that heading to `Email services`.

## Review Notes
The examples are technically correct after the fixes, but the article assumes the reader already has a baseline default-deny ruleset in place with loopback and established/related handling. On systems using the `iptables-nft` backend, the commands remain valid iptables syntax, but nftables is the newer underlying framework.
