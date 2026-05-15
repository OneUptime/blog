# Validation Summary: How to Use eBPF for Security Monitoring with Tetragon on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- Linux eBPF
- Cilium Tetragon
- Tetragon TracingPolicy
- tetra CLI
- systemd
- rsyslog
- bpftool

## Sources Consulted
- Tetragon package installation documentation: https://tetragon.io/docs/installation/package/
- Tetragon tetra CLI installation documentation: https://tetragon.io/docs/installation/tetra-cli/
- Tetragon daemon configuration reference: https://tetragon.io/docs/reference/daemon-configuration/
- Tetragon TracingPolicy API reference: https://tetragon.io/docs/reference/tracing-policy/
- Tetragon TracingPolicy selector documentation: https://tetragon.io/docs/concepts/tracing-policy/selectors/
- Tetragon TracingPolicy example documentation: https://tetragon.io/docs/concepts/tracing-policy/example/
- Tetragon network observability documentation: https://tetragon.io/docs/use-cases/network-observability/
- Cilium Tetragon v1.7.0 release assets and examples: https://github.com/cilium/tetragon/releases/tag/v1.7.0
- Linux bpftool program documentation: https://kernel.googlesource.com/pub/scm/linux/kernel/git/jolsa/perf/+/refs/heads/bpf/license/tools/bpf/bpftool/Documentation/bpftool-prog.rst

## Issues Found
- The installation section used a non-documented Cilium RPM repository and `dnf install tetragon` / `tetragon-cli`. The official package installation path uses GitHub release tarballs, and the tetra CLI is installed from Tetragon release assets. Updated the commands to use the current v1.7.0 tarball and official tetra CLI archive.
- The post said Tetragon immediately captures "basic security events." Official documentation describes process lifecycle events as the default behavior. Changed the wording to "process lifecycle events."
- The privilege escalation policy used the architecture-specific syscall symbol `__x64_sys_setuid` with `syscall: true`. Official Tetragon syscall examples use the portable syscall name `sys_setuid`. Updated the policy to use `sys_setuid`.
- The SIEM forwarding section configured `/etc/tetragon/tetragon.yaml` with export settings. While YAML config is supported, the documented and recommended package configuration method is `/etc/tetragon/tetragon.conf.d/` drop-in files where each filename maps to a controlling setting. Updated the example to use documented drop-ins for `export-filename`, rotation, backup count, and compression.
- The `bpftool prog list` note assumed `run_cnt` and `run_time_ns` are always visible. These runtime statistics require BPF stats collection support and enablement, so I added `sudo sysctl kernel.bpf_stats_enabled=1` and qualified the note.

## Review Notes
- The TracingPolicy examples for `fd_install`, `tcp_connect`, `commit_creds`, `Prefix`, `DPort`, `Post`, and `Sigkill` match Tetragon's documented policy model.
- The network and file examples may generate high event volume on busy hosts; production deployments should add narrower selectors or rate limiting as needed.
