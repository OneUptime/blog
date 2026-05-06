# Validation Summary: How to Configure IPv6 with CFEngine

## Status
validated

## Post Type
Guide

## Technologies Covered
- CFEngine policy language
- Linux `sysctl`
- Netplan
- `ip6tables` / `ip6tables-restore`
- systemd
- IPv6

## Sources Consulted
- CFEngine overview: https://docs.cfengine.com/docs/lts/overview/
- CFEngine promise types reference: https://docs.cfengine.com/docs/lts/reference/promise-types/
- CFEngine `commands` promise reference: https://docs.cfengine.com/docs/lts/reference/promise-types/commands/
- CFEngine `files` promise reference: https://docs.cfengine.com/docs/lts/reference/promise-types/files
- CFEngine `cf-agent` reference: https://docs.cfengine.com/docs/master/reference/components/cf-agent/
- CFEngine `cf-promises` reference: https://docs.cfengine.com/docs/master/reference/components/cf-promises/
- CFEngine `cf-execd` reference: https://docs.cfengine.com/docs/lts/reference/components/cf-execd/
- CFEngine functions reference, including `returnszero()`: https://docs.cfengine.com/docs/master/reference/functions/
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan tutorial examples: https://netplan.readthedocs.io/en/stable/netplan-tutorial/
- `ip6tables-restore` man page: https://man7.org/linux/man-pages/man8/iptables-restore.8.html
- `iptables-extensions` reference for state matching: https://ipset.netfilter.org/iptables-extensions.man.html

## Issues Found
- The description referred to the language as `CFScript/cf3`. Current CFEngine documentation describes it as the CFEngine policy language, so the terminology was corrected.
- The policy tree omitted `ipv6_netplan.cf` and `ipv6_commands.cf` even though the post later referenced both files. The structure block was updated so it matches the examples in the post.
- The comment above the class definitions said the classes were defined "based on role", but both example classes used `expression => "any"` and were therefore always defined. The comment was corrected to avoid implying role detection where none existed.
- The Netplan example only passed router-advertisement data. Netplan documents that `accept-ra` alone is not sufficient in IPv6-only stateless auto-configuration scenarios, so `dhcp6: true` was added to the template data to make the example operationally sound.
- The `returnszero()` examples used `"bash"` as the shell mode. CFEngine documents shell encapsulation modes such as `useshell` and `noshell`, so both calls were corrected to use `useshell`.
- The `ip6tables-restore` example used shell redirection inside a CFEngine `commands` promise. CFEngine commands do not run through a shell by default, and `ip6tables-restore` officially accepts a file argument, so the example was changed to pass the rules file via `args`.

## Review Notes
- The post is Linux-specific and assumes hosts use `sysctl.d`, Netplan, and `ip6tables` tooling.
- `ip6tables` remains valid, but some current distributions prefer `nftables` as the primary firewall interface.
