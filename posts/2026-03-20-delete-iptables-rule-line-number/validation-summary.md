# Validation Summary: How to Delete a Specific iptables Rule by Line Number

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- iptables (Linux netfilter administration tool)
- iptables-save / iptables-restore utilities
- Linux firewall chains (INPUT, OUTPUT, FORWARD, PREROUTING)
- NAT table and DNAT target

## Sources Consulted
- iptables(8) man page (iptables 1.8.10)
- iptables-extensions(8) man page (DNAT target documentation)
- Official netfilter documentation: https://netfilter.org/documentation/

## Issues Found
- **DNAT option flag**: The post used `--to 192.168.1.100:80` for the DNAT target. While some iptables versions accept `--to` as an abbreviation due to GNU long-option matching, the canonical and documented option per `iptables-extensions(8)` is `--to-destination`. Updated the example to use `--to-destination` for correctness and portability across iptables versions.

## Review Notes
- The `-D`, `-L`, `-I`, and `--line-numbers` flags are correctly used and match the iptables(8) manpage syntax.
- The example output format for `iptables -L INPUT -n --line-numbers` is plausible and consistent with real iptables output.
- The advice to delete from highest-to-lowest line number when removing multiple rules is technically correct because rule numbers are renumbered after each deletion.
- The "Delete the DROP all rule" example (`sudo iptables -D INPUT -j DROP`) is valid syntactically; in practice, a catch-all DROP is typically set via the chain policy (`-P INPUT DROP`) rather than as an explicit rule, but the syntax is correct.
- The `state` match module shown in the sample output is still supported, though modern best practice is to use `-m conntrack --ctstate` instead. This is a minor stylistic note and not an error.
- Backup recommendations using `iptables-save` and restoration via `iptables-restore < /etc/iptables/rules.v4` follow standard practice on Debian/Ubuntu systems (where iptables-persistent stores rules at that path).
