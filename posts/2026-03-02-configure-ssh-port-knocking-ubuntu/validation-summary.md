# Validation Summary: How to Configure SSH Port Knocking on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- SSH
- knockd and knock
- UFW
- nftables
- Bash scripting
- cron

## Sources Consulted
- Ubuntu manpage for `knock`: https://manpages.ubuntu.com/manpages/stonking/man1/knock.1.html
- Ubuntu manpage for `knockd`: https://manpages.ubuntu.com/manpages/oracular/en/man1/knockd.1.html
- Debian package source for `/etc/default/knockd` and `knockd.service`: https://sources.debian.org/src/knockd/0.8-2/debian/default and https://sources.debian.org/src/knockd/0.8-2/debian/knockd.service
- Local `ufw(8)` manpage and `ufw --help`
- Local `nft(8)` manpage and `nft --help`
- nftables wiki rule management documentation: https://wiki.nftables.org/wiki-nftables/index.php/Simple_rule_management
- Debian `nft(8)` manpage: https://manpages.debian.org/nftables/nft.8

## Issues Found
- The firewall warning said blocking port 22 would immediately terminate an existing SSH session. UFW normally keeps established connections through its stateful rules, but deleting SSH allow rules can lock the user out of new sessions. Updated the warning to describe the actual risk.
- The mixed UDP/TCP knock client example used multiple separate `knock` invocations. The official `knock` syntax supports per-port protocols in a single sequence, so the example was changed to `knock -v server.example.com 7000:udp 8000:tcp 9000:udp`.
- The nftables section was titled "One-Time Sequences," but the shown knockd config used `start_command`, `stop_command`, and `cmd_timeout`, not knockd's `one_time_sequences` feature. Renamed the section to "Auto-Closing Rules with nftables."
- The nftables example did not state that the referenced `inet filter input` table and chain must already exist. Added a comment to avoid implying that `nft add rule inet filter input ...` creates them automatically.
- The dynamic-IP cleanup snippet used `cmd_timeout` with `command`, but knockd's timeout behavior is tied to `start_command` and `stop_command`. Changed it to use `start_command` and `stop_command`.
- The cron cleanup script extracted UFW rule numbers with `awk '{print $2}'`, which is unreliable for `ufw status numbered` output. Replaced it with a `sed` expression that extracts the number inside the leading brackets before deleting rules in descending order.

## Review Notes
The tutorial is technically relevant and accurate after the fixes. The nftables example is still intentionally advanced and assumes the administrator has an existing nftables ruleset with a suitable table, chain, and default policy.
