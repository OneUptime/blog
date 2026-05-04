# Validation Summary: How to Configure Connection Tracking Limits in iptables

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- iptables (Linux netfilter firewall)
- nf_conntrack (Linux kernel connection tracking)
- conntrack-tools (userspace utility)
- sysctl / /proc/sys/net/netfilter
- Bash scripting
- iptables connlimit and state modules

## Sources Consulted
- [Netfilter Conntrack Sysfs variables — The Linux Kernel documentation](https://docs.kernel.org/networking/nf_conntrack-sysctl.html)
- [nf_conntrack-sysctl.rst (kernel.org)](https://www.kernel.org/doc/Documentation/networking/nf_conntrack-sysctl.rst)
- [iptables-extensions man page (netfilter.org)](https://ipset.netfilter.org/iptables-extensions.man.html)
- [Ubuntu iptables-extensions manpage](https://manpages.ubuntu.com/manpages/xenial/man8/iptables-extensions.8.html)
- [Red Hat KB: limit connections per IP/port](https://access.redhat.com/solutions/396273)

## Issues Found
No technical issues found. Verified:
- `/proc/sys/net/netfilter/nf_conntrack_count` and `nf_conntrack_max` paths are correct.
- `nf_conntrack_tcp_timeout_established` default of 432000s (5 days) is accurate per kernel docs.
- The recommended `nf_conntrack_buckets = nf_conntrack_max / 4` is the commonly-cited tuning rule and is writable as a sysctl on modern (4.9+) kernels.
- The `connlimit` module options `--connlimit-above` and `--connlimit-mask` are correct, and the per-port / per-subnet examples match the documented usage.
- `conntrack -L`, `-D -s <ip>`, and the `-p tcp` filter flags match the conntrack-tools manpage.
- The `-m state --state INVALID` syntax remains valid (legacy state module, still supported as an alias for the newer conntrack module).

## Review Notes
- The line `sudo sysctl -w net.netfilter.nf_conntrack_udp_timeout=30` is functionally a no-op on stock kernels because the default value of `nf_conntrack_udp_timeout` is already 30 seconds. The command itself is valid and harmless (and useful as a defensive reassertion if something else has changed it), but readers looking to actually reduce UDP-related conntrack pressure may want to also tune `nf_conntrack_udp_timeout_stream` (default 120s) for assured/streamed UDP flows. Left unchanged since the command is not technically incorrect.
- The post uses the older `-m state --state INVALID` syntax. Modern netfilter recommends `-m conntrack --ctstate INVALID`. Both work; the legacy form is preserved as an alias and many production iptables rule sets still use it.
- The "typically 65536" default for `nf_conntrack_max` is a reasonable rule of thumb, though modern kernels compute it dynamically based on system memory (roughly RAM/16384, capped between 32 and a memory-dependent ceiling), so observed defaults can be higher on large-memory systems.
