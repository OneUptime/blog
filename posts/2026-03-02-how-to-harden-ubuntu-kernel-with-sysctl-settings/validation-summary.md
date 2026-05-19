# Validation Summary: How to Harden Ubuntu Kernel with sysctl Settings

## Status
validated

## Post Type
Tutorial / hardening guide

## Technologies Covered
- Ubuntu Linux
- Linux kernel sysctl parameters
- procps `sysctl`
- systemd `sysctl.d`
- IPv4 and IPv6 network stack hardening
- Kernel, filesystem, BPF, and virtual memory hardening settings

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel `/proc/sys/kernel/` sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/kernel.html
- Linux kernel `/proc/sys/fs/` sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/fs.html
- Linux kernel `/proc/sys/net/` sysctl documentation for BPF JIT hardening: https://docs.kernel.org/admin-guide/sysctl/net.html
- Linux kernel Yama LSM documentation: https://docs.kernel.org/admin-guide/LSM/Yama.html
- Linux kernel Magic SysRq documentation: https://docs.kernel.org/admin-guide/sysrq.html
- Linux kernel virtual memory sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel overcommit accounting documentation: https://docs.kernel.org/mm/overcommit-accounting.html
- systemd `sysctl.d` documentation: https://www.freedesktop.org/software/systemd/man/sysctl.d.html
- Local `sysctl --help`, `man sysctl`, and `man sysctl.conf` output from procps

## Issues Found
- IPv6 source routing was disabled with `net.ipv6.conf.*.accept_source_route = 0`. The kernel documentation states that IPv6 uses a negative value to reject routing extension headers, so this was changed to `-1`.
- The `ptrace_scope = 1` explanation said only parent processes can trace their children. The Yama documentation allows predefined tracer relationships and descendant tracing under classic ptrace checks, so the wording was corrected.
- The SysRq note said `4` allows only sync. The kernel SysRq bitmask uses `16` for the sync command, so the note was corrected.
- The `vm.overcommit_memory = 0` comment described disabling overcommit. Kernel documentation defines `0` as heuristic overcommit handling; the wording was corrected.
- The reboot persistence troubleshooting note implied `/etc/sysctl.conf` is overwritten by packages. systemd and procps documentation instead emphasize `.conf` files, ordering, and local administrator precedence, so the note was corrected.
- The complete hardening configuration omitted several settings introduced earlier in the article. The final block now includes the missing IPv6 source-route settings, default redirect/send-redirect settings, `tcp_syn_retries`, default martian logging, and `vm.overcommit_memory`.

## Review Notes
Some settings can affect hosts with asymmetric routing, IPv6 SLAAC requirements, debugging workflows, or workloads that depend on BPF or ptrace. The post already frames these as server hardening defaults, but readers should still test them against their network and operational requirements before broad deployment.
