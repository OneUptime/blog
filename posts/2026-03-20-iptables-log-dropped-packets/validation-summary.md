# Validation Summary: How to Log Dropped Packets in iptables for Security Auditing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- iptables / Netfilter
- Linux kernel packet logging
- rsyslog
- NFLOG
- ulogd2

## Sources Consulted
- iptables-extensions(8) man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- iptables(8) man page: https://man7.org/linux/man-pages/man8/iptables.8.html
- rsyslog Configuration Formats: https://docs.rsyslog.com/doc/configuration/conf_formats.html
- rsyslog Basic Structure: https://docs.rsyslog.com/doc/configuration/basic_structure.html
- rsyslog Control Structures: https://docs.rsyslog.com/doc/rainerscript/control_structures.html
- Local `iptables v1.8.10 (nf_tables)` help output via `iptables -j LOG -h`, `iptables -j NFLOG -h`, `iptables -m recent -h`, and `iptables -m limit -h`

## Issues Found
- The `recent`-based port-scan and SSH brute-force examples used `--update` without a preceding `--set`, so the address lists would never be populated. I changed both to working two-rule patterns using `--set` plus `--rcheck`, and inserted them before broader chain rules.
- The "Log SYN floods" example only rate-limited logging of TCP SYN packets; it did not actually identify a flood condition. I relabeled it to rate-limited SYN traffic logging so the description matches the rule behavior.
- The rsyslog example was shown as commented legacy syntax inside a shell block, which was not a good copyable configuration example for a new setup. I replaced it with an executable `tee` example that writes a current RainerScript rule using `action(type="omfile" ...)` and `stop`.
- The NFLOG section did not make clear that `NFLOG` is also non-terminating in the same way as `LOG`. I clarified that it replaces the `LOG` rule before the separate `DROP` rule.

## Review Notes
- `iptables` is still valid, but many current Linux distributions ship it with the `nf_tables` backend. The documented commands remain valid through that compatibility layer.
- Kernel log destinations are distro-dependent. `/var/log/syslog` and `/var/log/kern.log` are common, but some systems expose these messages primarily through `journalctl -k`.
- The `ulogd2` install command shown in the post is appropriate for Debian/Ubuntu systems; other distributions use different package managers and package names.
