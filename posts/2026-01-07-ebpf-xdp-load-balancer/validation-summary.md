# Validation Summary: How to Build a Load Balancer with eBPF and XDP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- eBPF
- XDP
- libbpf
- BPF maps
- C
- Linux networking
- bpftool
- pktgen
- keepalived / VRRP
- Prometheus metrics

## Sources Consulted
- Linux kernel BPF documentation: https://docs.kernel.org/bpf/
- Linux kernel AF_XDP documentation: https://docs.kernel.org/networking/af_xdp.html
- Linux manual page for bpf(2): https://man7.org/linux/man-pages/man2/bpf.2.html
- Linux manual page for bpf-helpers(7): https://man7.org/linux/man-pages/man7/bpf-helpers.7.html
- libbpf API documentation: https://libbpf.readthedocs.io/en/latest/api.html
- eBPF Docs for bpf_xdp_attach / bpf_xdp_detach / bpf_object__pin_maps: https://docs.ebpf.io/
- Local bpftool 7.7.0 help output for prog/map command syntax.
- keepalived.conf manual page: https://manpages.debian.org/testing/keepalived/keepalived.conf.5.en.html
- XDP tutorial project: https://github.com/xdp-project/xdp-tutorial
- Cilium BPF and XDP reference: https://docs.cilium.io/en/stable/bpf/

## Issues Found
- The introduction overstated that all traditional load balancers operate in user space and that the post builds a fully functional production Layer 4 load balancer. Changed the wording to distinguish user-space software load balancers from kernel/hardware approaches and to describe the implementation as a core foundation.
- The XDP component description implied XDP always runs at the NIC driver level. Updated it to say XDP runs at the XDP hook and ideally uses native driver mode, while generic/SKB mode is also possible.
- `STAT_*` constants were defined only in `xdp_lb.c`, but the userspace loader used them too. Moved the constants into the shared `lb_types.h` snippet.
- Several eBPF loops used `config->backend_count` directly, which can be verifier-hostile and can divide by zero when used in modulo operations. Bounded backend selection loops by `MAX_BACKENDS`, clamped `backend_count`, and handled zero backends.
- The IPv4 parser used `ip->ihl` without validating the full variable-length IPv4 header. Added an `ihl` minimum and bounds check before L4 parsing.
- The userspace snippets included `../include/lb_types.h`, which does not match the documented project layout from `src/userspace`. Changed includes to `lb_types.h`, consistent with the Makefile include path.
- The health checker expected pinned maps under `/sys/fs/bpf/xdp_lb`, but the loader did not pin maps. Added `bpf_object__pin_maps()` and cleanup with `bpf_object__unpin_maps()`.
- The loader's per-CPU stats reader used a fixed 256-element array without guarding `libbpf_num_possible_cpus()`. Added a cap before summing.
- The DNAT example implied the kernel would forward traffic and the reverse path would work automatically. Added notes that IP forwarding/routes plus DSR, SNAT/reverse NAT, or an equivalent topology-specific return path are required.
- The connection tracking section claimed the same 5-tuple correlated packets in both directions. Clarified that the shown key tracks the client-to-VIP direction and reverse direction needs a reverse key or DSR topology.
- The Makefile `install` target copied to `/usr/local/share/xdp-lb/` without creating the directory. Added `install -d`.
- The `bpftool` JSON example placed `--json` after the subcommand. Changed it to `bpftool -j prog show ...`, matching bpftool option syntax.
- The RPS tuning snippet wrote `0-3` to `rps_cpus`, but that sysfs file expects a CPU bitmask. Changed it to `f` and clarified that RPS affects generic/SKB processing, while native XDP is controlled through RX queues and IRQ affinity.
- The future extension bullet suggested SSL/TLS termination using kTLS in this XDP load balancer. Replaced it with TLS passthrough or integration with a separate TLS termination proxy.

## Review Notes
- The benchmark numbers are presented as environment-specific sample results; they should not be treated as universal performance guarantees.
- The Prometheus exporter remains a simplified skeleton and explicitly notes that real BPF map reads still need implementation.
- The XDP program is still illustrative and omits production details such as reverse NAT implementation, DSR backend configuration, connection cleanup/decrement logic, ARP/neighbor handling, and comprehensive verifier/build testing across kernel versions.
