# Validation Summary: How to List All iptables Rules on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- iptables
- iptables-save
- Linux firewall rule inspection
- Netfilter tables and chains

## Sources Consulted
- `iptables(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-save(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-save.8.html
- `iptables-extensions(8)` local manual page, checked for the `state` match semantics
- Local CLI help from `iptables v1.8.10 (nf_tables)` via `iptables --help`

## Issues Found
- The verbose `iptables -L -n -v` sample output omitted the `pkts` and `bytes` columns even though the section described verbose counters. I updated the sample so it matches verbose listing behavior documented in `iptables(8)`.
- The note saying line numbers are "required" to delete specific rules was too strong because `iptables -D` accepts either a rule number or a full rule specification. I changed the wording to say line numbers are useful when deleting by number.
- The `--line-numbers` sample output showed packet/byte counters without `-v` and included a literal `(loopback)` marker that does not appear in standard `iptables -L` output. I corrected the sample output to match normal non-verbose listing behavior.
- The "List ALL tables at once" loop omitted the `security` table even though `iptables(8)` documents five tables: `filter`, `nat`, `mangle`, `raw`, and `security`. I added the missing table and clarified that table availability depends on kernel configuration and loaded modules.
- The command `sudo iptables-save > /etc/iptables/rules.v4` was incorrect for privileged destinations because shell redirection is not performed under `sudo`. I replaced it with `sudo iptables-save -f /etc/iptables/rules.v4` and likewise switched the single-table example to the documented `-f` form.
- The claim that zero counters mean a rule was "never matched" was too absolute. I revised it to say the rule has not matched since the counters were last reset or the rule was added.

## Review Notes
- The commands are still valid on modern systems where `iptables` is provided by the `nf_tables` backend, such as `iptables v1.8.x (nf_tables)`.
- The `security` table may be unavailable on systems where the corresponding kernel or module support is not present.
- `/etc/iptables/rules.v4` is a common save path on Debian/Ubuntu-style setups, but persistence from that file depends on distro-specific tooling and configuration.
