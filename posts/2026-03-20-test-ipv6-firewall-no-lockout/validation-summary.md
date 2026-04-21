# Validation Summary: How to Test IPv6 Firewall Rules Without Locking Yourself Out

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6
- ip6tables, ip6tables-save, and ip6tables-restore
- nftables and the nft CLI
- at, atq, and atrm scheduled jobs
- Netfilter conntrack
- ICMPv6 troubleshooting checks

## Sources Consulted
- Netfilter / iptables project man page for iptables-restore and ip6tables-restore: https://man7.org/linux/man-pages/man8/iptables-restore.8.html
- Netfilter nftables man page: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki on atomic rule replacement: https://wiki.nftables.org/wiki-nftables/index.php/Atomic_rule_replacement
- Netfilter conntrack-tools man page: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- POSIX at(1p) manual page for at job submission and job ID output: https://man7.org/linux/man-pages/man1/at.1p.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://datatracker.ietf.org/doc/rfc4890/
- Local CLI help output for `ip6tables-restore --help`, `ip6tables --help`, `nft --help`, and `ping6 -h`

## Issues Found
- The safety timer examples identified the scheduled `at` job with `atq | tail -1`, which can select the wrong job if other jobs are queued. Changed the examples to capture the job ID from `at` submission output, parse it under `LC_ALL=C`, and abort if no safety job was scheduled.
- The "Testing Without a Second Connection" example applied rules before scheduling a rollback and treated conntrack output as a stronger signal than it really is. Added the safety timer before applying rules and changed the message to describe conntrack as a weak local sanity check.
- The example prefix `2001:db8:test::/48` was not valid IPv6 syntax because `test` is not a hexadecimal hextet. Replaced it with `2001:db8:100::/48`, which remains inside the RFC 3849 documentation prefix.
- The nftables rollback example flushed the live ruleset as a separate command before loading the backup. Changed it to save a rollback file that starts with `flush ruleset` and restore it with a single `nft -f` load, matching nftables' atomic replacement model.
- The nftables dry-run comment said `nft -c -f` reports "syntax errors only." Updated it to say it validates commands without applying changes, which matches the nft man page.

## Review Notes
- The examples assume the commands are run with sufficient privileges, typically root or `CAP_NET_ADMIN`.
- The `at`-based rollback pattern requires the `at` package and a working at daemon.
- The conntrack check is useful only as a local sanity check; the post correctly continues to recommend a second SSH connection or terminal for real access testing.
- The large `ping6` check is a reasonable smoke test for path MTU behavior, but it may not trigger an ICMPv6 Packet Too Big response on every path.
