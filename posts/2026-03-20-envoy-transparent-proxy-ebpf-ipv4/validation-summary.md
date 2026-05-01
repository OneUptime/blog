# Validation Summary: How to Set Up Envoy as a Transparent Proxy with eBPF and IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Envoy
- eBPF
- Linux cgroups
- `bpftool`
- IPv4 networking
- Transparent proxying
- `SO_MARK`

## Sources Consulted
- Envoy Original Destination listener filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/original_dst_filter
- Envoy service discovery docs for `ORIGINAL_DST`: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy socket option proto docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/socket_option.proto.html
- Envoy cluster proto docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Linux kernel libbpf program type docs: https://docs.kernel.org/bpf/libbpf/program_types.html
- Local `bpftool cgroup help` output from the review environment
- Local Linux UAPI headers: `/usr/include/linux/bpf.h`, `/usr/include/asm-generic/socket.h`, `/usr/include/linux/netfilter_ipv4.h`

## Issues Found
- The post used a `sockops` program as if it could intercept and redirect `connect()` traffic. I replaced it with a `cgroup/connect4` (`BPF_PROG_TYPE_CGROUP_SOCK_ADDR`) example, which is the documented hook for rewriting IPv4 connect destinations.
- The original BPF code did not actually redirect anything; it only set sockops callback flags after the connection was already established. I changed the example to rewrite `ctx->user_ip4` and `ctx->user_port` before the connection is established.
- The original `bpftool cgroup attach` command used the wrong attach type (`sock_ops`). I corrected the load and attach commands to `type cgroup/connect4` and `cgroup_inet4_connect`, matching `bpftool`'s documented syntax.
- The post implied that Envoy's Linux `original_dst` listener filter would recover the original destination after a `cgroup/connect4` rewrite. I corrected this: Envoy documents support for `SO_ORIGINAL_DST` from iptables `REDIRECT`, or `TPROXY` with a transparent listener, or internal-listener metadata/filter state. A `connect4` rewrite alone does not provide that metadata. This conclusion is an inference from Envoy's documented supported metadata sources.
- The `ORIGINAL_DST` cluster snippet omitted the required cluster-specific load balancer selection. I added `lb_policy: CLUSTER_PROVIDED`, which Envoy documents as required when a cluster provides its own load balancer.
- The description overstated the example as a full iptables replacement for Envoy original-destination proxying. I narrowed it so it accurately describes eBPF interception plus the Linux-specific Envoy caveat.

## Review Notes
- The review was documentation-based. I could not run `clang` or `envoy` locally in this workspace because those binaries are not installed.
- The example assumes a unified cgroup v2 mount at `/sys/fs/cgroup`.
