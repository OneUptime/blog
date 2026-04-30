# Validation Summary: How to Limit SSH Brute Force Attacks with iptables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux `iptables`
- Netfilter match extensions: `hashlimit`, `recent`, `limit`, and `state`
- OpenSSH client testing
- Linux system logging

## Sources Consulted
- `iptables-extensions(8)` — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `iptables(8)` — https://man7.org/linux/man-pages/man8/iptables.8.html
- Linux stable kernel source, `xt_recent.c` — https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/plain/net/netfilter/xt_recent.c?h=v6.6
- OpenSSH `ssh_config(5)` — https://man.openbsd.org/OpenBSD-7.4/ssh_config
- Local `iptables v1.8.10 (nf_tables)` help output for `hashlimit`, `recent`, `limit`, and `state`

## Issues Found

1. **The `hashlimit` example comment overstated the limit.** The rule used `--hashlimit-upto 3/min` together with `--hashlimit-burst 5`, so it was not a strict maximum of 3 immediate attempts. Updated the comment to describe it as an average of 3 per minute with an initial burst of 5.

2. **The `recent` example updated match state more than intended.** The post used `--set` first and then `--update` in both the `LOG` and `DROP` rules. Per the kernel's `xt_recent.c` logic, a matching `--update` rule updates the entry again, so the tracked state could be modified multiple times for the same connection attempt. Changed the `LOG` and `DROP` rules to use `--rcheck` and adjusted the explanation to match the actual behavior.

3. **The log inspection commands were too broadly phrased.** `grep` against `/var/log/syslog` is valid on syslog-based systems, but not on all Linux distributions. Narrowed the comments so the commands are presented accurately.

4. **The SSH test loop was not safe for unattended use.** `ConnectTimeout` does not disable password prompts or host key confirmation by itself. Updated the test to assume an already-working key-based SSH login and added `BatchMode=yes` so the command behaves predictably in a loop.

## Review Notes
- The examples use the `state` matcher, which is still documented and valid. The broader `conntrack` matcher is more common in newer examples, but no change was required for correctness.
- The post covers IPv4 `iptables` rules only. Hosts that accept SSH over IPv6 need equivalent `ip6tables` or native `nftables` rules as well.
- The snippets focus on limiting new SSH attempts. On a default-deny firewall, they assume the broader ruleset already handles `ESTABLISHED,RELATED` traffic appropriately.
