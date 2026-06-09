# Validation Summary: How to Configure Fluent Bit Inputs

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Fluent Bit (input plugins: tail, systemd, forward, tcp, udp, http, cpu, mem, disk, netif, exec, kmsg)
- Kubernetes (container log collection, kubernetes filter, service account credentials)
- Linux systemd journal
- Container runtimes (Docker, containerd, CRI-O) and CRI log format
- Multiline parsers (Java stack traces, Python tracebacks)
- TLS and shared-key authentication for forward/HTTP inputs
- INI-style Fluent Bit configuration format

## Sources Consulted
- Fluent Bit tail input docs: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit TCP input docs: https://docs.fluentbit.io/manual/data-pipeline/inputs/tcp
- Fluent Bit UDP input docs: https://docs.fluentbit.io/manual/data-pipeline/inputs/udp
- Fluent Bit HTTP input docs: https://docs.fluentbit.io/manual/data-pipeline/inputs/http
- Fluent Bit CPU metrics input docs: https://docs.fluentbit.io/manual/data-pipeline/inputs/cpu-metrics
- Fluent Bit systemd input docs: https://docs.fluentbit.io/manual/data-pipeline/inputs/systemd
- Fluent Bit kernel logs input docs: https://docs.fluentbit.io/manual/data-pipeline/inputs/kernel-logs
- Fluent Bit forward input docs: https://docs.fluentbit.io/manual/data-pipeline/inputs/forward
- Fluent Bit Linux install docs: https://docs.fluentbit.io/manual/installation/linux
- Fluent Bit multiline parsing docs: https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/multiline-parsing
- Official `conf/parsers.conf` in the fluent/fluent-bit GitHub repository

## Issues Found
1. **Multiline Configuration section mixed legacy and new syntax** — The tail input used the legacy `Multiline On` + `Parser_Firstline java_multiline` pair, but `java_multiline` was defined as a `[MULTILINE_PARSER]`. The legacy `Parser_Firstline` directive expects a regular `[PARSER]` definition; the newer `[MULTILINE_PARSER]` definitions must be referenced via the `multiline.parser` directive. Fixed by replacing `Multiline On` and `Parser_Firstline java_multiline` with `multiline.parser java_multiline` and updating the comments accordingly.

2. **Incorrect comment on `Interval_NSec`** — The CPU input example commented `Interval_NSec` as "Include per-core CPU statistics", which is wrong. `Interval_NSec` is the nanosecond component of the polling interval (used together with `Interval_Sec` for sub-second precision). Per-core CPU statistics are emitted by default and not controlled by this option. Fixed the comment to describe the actual behavior.

## Review Notes
- All other configuration syntax, plugin names, and parameters were verified against the official Fluent Bit documentation and are correct.
- The TCP input `Parser syslog-rfc5424` line is valid: the TCP input plugin does accept `Parser` when `Format` is `none`.
- The CRI parser regex and time format match the standard parser shipped in `conf/parsers.conf`.
- The install script URL (`raw.githubusercontent.com/fluent/fluent-bit/master/install.sh`) is the canonical URL documented in Fluent Bit installation guides.
- Multiple `Systemd_Filter` lines do create an OR condition by default (controlled by `Systemd_Filter_Type`). The post's comment is correct.
- The legacy `Multiline On` + `Parser_Firstline` syntax used in the nginx Multi-File Tail example is still valid (since `nginx_access` would be a regular `[PARSER]`), though authors writing new configurations should prefer the `multiline.parser` directive going forward — Fluent Bit recommends the new multiline engine.
- The `apt-key add` step in the Ubuntu/Debian install snippet still works on the targeted releases but is deprecated on newer Debian/Ubuntu versions in favor of placing a keyring in `/etc/apt/keyrings/` and using `signed-by` in the sources list. Not changed because it remains functional and matches Fluent Bit's official quickstart at the time of writing.
