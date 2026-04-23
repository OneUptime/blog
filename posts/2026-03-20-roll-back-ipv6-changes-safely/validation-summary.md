# Validation Summary: How to Roll Back IPv6 Changes Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 rollback and dual-stack migration
- DNS AAAA records, TTLs, `dig`, and BIND `nsupdate`
- Bash scripting
- Docker CLI
- Kubernetes `kubectl`
- Linux `ip6tables`, `iptables-save`, and `ip6tables-restore`

## Sources Consulted
- BIND 9 manual pages for `dig` and `nsupdate`: https://bind9.readthedocs.io/en/latest/manpages.html
- RFC 1035, Domain Names - Implementation and Specification: https://datatracker.ietf.org/doc/html/rfc1035
- RFC 2181, Clarifications to the DNS Specification: https://www.rfc-editor.org/rfc/rfc2181
- Docker CLI reference for `docker run`, `docker stop`, `docker rm`, and `docker inspect`: https://docs.docker.com/reference/cli/docker/
- Kubernetes `kubectl` generated reference for `rollout undo`, `rollout status`, `set image`, and `get`: https://kubernetes.io/docs/reference/kubectl/
- Netfilter `iptables`/`ip6tables` manual page: https://ipset.netfilter.org/iptables.man.html
- Linux `ipv6(7)` manual page for `IPV6_V6ONLY` and IPv4-mapped IPv6 socket behavior: https://www.man7.org/linux/man-pages/man7/ipv6.7.html

## Issues Found
- The DNS rollback used `del ${hostname} AAAA ${CURRENT_AAAA}` in `nsupdate`. The documented BIND input format is `update delete`, and expanding multiple AAAA records into one here-doc line can produce invalid input. Changed it to `update delete ${hostname} AAAA`, which deletes the AAAA RRset for the owner name.
- Normalized `dig` examples to the documented `dig name type +short` order for consistency with the BIND manual page.
- The DNS rollback wording said removing AAAA records stops all new IPv6 connections within the TTL window. Tightened this to DNS-based IPv6 connection attempts after cached answers expire, because DNS TTL controls cached answers and does not terminate existing connections.
- The Docker rollback stopped the container and immediately reused the same `--name`. Docker keeps stopped containers until removal, so the new `docker run --name "$APP_NAME"` could fail. Added `docker rm "$APP_NAME"` after `docker stop`.
- The Kubernetes rollback example executed both `kubectl rollout undo` and `kubectl set image` even though the text described them as alternatives. Commented out the `kubectl set image` command so the snippet does not perform two rollback methods in one run.
- The firewall rollback flushed IPv6 filter rules, set default policies to ACCEPT, and described that as neutral. This is not a safe rollback because it opens IPv6 traffic. Replaced it with `ip6tables-restore` from the saved backup and a warning when no backup exists.
- The pre-change backup saved `ip6tables` rules only under the timestamped backup directory, while the rollback script and runbook used `/etc/ip6tables.backup`. Added `IP6TABLES_BACKUP` and copied the saved rules there.
- The introductory and concluding wording implied `::` listeners are always simply additive. Clarified that IPv6 listeners should be added alongside existing IPv4 listeners, since IPv6 socket dual-stack behavior depends on platform and `IPV6_V6ONLY` settings.

## Review Notes
- The corrected examples are technically valid for BIND dynamic DNS, Docker, Kubernetes, and Linux `ip6tables`, but production environments may require provider-specific DNS APIs, TSIG credentials for `nsupdate`, cloud firewall/security group rollbacks, or `nftables`/firewalld equivalents.
