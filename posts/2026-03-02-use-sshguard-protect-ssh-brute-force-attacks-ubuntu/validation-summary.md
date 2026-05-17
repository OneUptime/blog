# Validation Summary: How to Use sshguard to Protect SSH from Brute Force Attacks on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- sshguard
- Ubuntu (apt, systemd, journalctl)
- nftables (`nft`)
- iptables
- UFW
- OpenSSH
- fail2ban (comparison only)

## Sources Consulted
- Official sshguard upstream config sample: https://github.com/SSHGuard/sshguard/blob/master/examples/sshguard.conf.sample
- Official sshguard docs (sshguard.net): https://www.sshguard.net/docs/sshguard.html
- Ubuntu sshguard manpage (Focal): https://manpages.ubuntu.com/manpages/focal/en/man8/sshguard.8.html
- sshguard nftables backend script (`sshg-fw-nft-sets`): https://fossies.org/linux/sshguard/src/fw/sshg-fw-nft-sets.sh
- Gentoo wiki sshguard page (for nftables backend inspection commands): https://wiki.gentoo.org/wiki/Sshguard
- sshguard blocker source for block-time multiplier formula

## Issues Found

1. **`BLACKLIST_FILE` threshold semantics were wrong.** The post described the number in `BLACKLIST_FILE=N:/path` as "blocks" (e.g., "IPs that accumulate this many blocks get permanently listed", "Blacklist after 5 blocks"). Per the official docs the value is a cumulative **danger score**, not a block count. With SSH failures scoring 10 points each, the examples (`=10` and `=5`) would have blacklisted IPs after a single SSH attack or even half of one — far more aggressive than the descriptive text suggested. Fixed the wording to say "cumulative danger points" and corrected the example values to sensible thresholds (`120` for the documentary default; `60` ≈ six SSH failures for the "aggressive" example).

2. **`BLACKLIST_FILE` shown as a default when it is not.** Upstream sample and the Debian/Ubuntu package both ship `BLACKLIST_FILE` unset/commented; it has no default. The "default configuration" code block presented it as an active setting. Changed to a commented-out line and labelled it as optional with no default.

3. **`BLACKLIST_FILE` path was non-standard.** The post used `/etc/sshguard/blacklist.db`. The Debian/Ubuntu convention (and the upstream example) is `/var/lib/sshguard/blacklist.db`. Replaced all occurrences (in the config example, the Aggressive example, the "Monitoring sshguard Activity" `cat` command, and the "Managing the Blacklist" section).

4. **UFW backend chain comment was inaccurate.** The post said "(sshguard creates its own chain)" for the UFW backend. The UFW backend actually uses `ufw insert` / `ufw delete`, which adds rules to UFW's existing user chains rather than creating a dedicated `sshguard` chain (the iptables backend is the one that creates its own chain). Reworded to "sshguard inserts rules into UFW's user chain".

## Review Notes

- The nftables commands (`nft list table ip sshguard`, `nft list set ip sshguard attackers`) are correct for the `sshg-fw-nft-sets` backend, which creates a table named `sshguard` in the `ip` (and a parallel one in `ip6`) family with a set named `attackers`. The post only shows IPv4 inspection — for completeness operators may want to also check `ip6 sshguard`, but the IPv4-only examples are not incorrect.
- The `BLOCK_TIME` doubling claim is correct per the official sshguard.net documentation ("Subsequent blocks increase in duration by a factor of 2"). The multiplier is configurable in source via `block_time_multiplier`, but the documented default is 2.
- `/etc/sshguard/whitelist` is the conventional Ubuntu/Debian whitelist file path. It only takes effect because the shipped `sshguard.conf` sets `WHITELIST_FILE=/etc/sshguard/whitelist`; if a future package change drops that line, simply editing the file would no longer suffice. Not flagged as an error because it matches current Ubuntu packaging.
- The systemd drop-in example (`systemctl edit sshguard` with overriding `ExecStart=`) is the correct idiom for adding `-l` log file arguments to the upstream-provided unit on Ubuntu.
- The example log output uses the older "1 attacks in 30 seconds, 30 danger" phrasing; modern sshguard wording is similar but minor format variation between versions is expected — not corrected.
