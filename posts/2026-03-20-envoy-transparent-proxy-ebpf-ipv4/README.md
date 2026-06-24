# How to Set Up Envoy as a Transparent Proxy with eBPF and IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, eBPF, Transparent Proxy, IPv4, Linux, Service Mesh, Networking

Description: Learn how to use eBPF-based traffic redirection instead of iptables to set up Envoy as a transparent IPv4 proxy with lower overhead and better observability.

---

Traditional transparent proxy deployments use iptables to redirect traffic to Envoy. eBPF (Extended Berkeley Packet Filter) provides another building block: attach BPF programs at cgroup socket-address hooks to rewrite `connect()` destinations in-kernel, avoiding iptables rule traversal and enabling custom policy or telemetry through BPF helpers and maps.

## Why eBPF Over iptables?

| Feature | iptables | eBPF |
|---------|---------|------|
| Interception point | Netfilter rule chains | Programmatic cgroup/socket hooks |
| Observability | Packet and conntrack counters | Custom telemetry via BPF helpers and maps |
| Policy model | Rule ordering matters | Program logic and BPF maps |
| Connection tracking | Common with REDIRECT/NAT | Can avoid the netfilter NAT path |

## Architecture Overview

```mermaid
graph TD
    A[Application connect()] -->|eBPF cgroup/connect4 program| B[Redirect to Envoy 127.0.0.1:15001]
    B --> C[Envoy Listener 15001]
    C --> D[Original Destination Metadata]
    D --> E[Original Destination Cluster]
    E --> F[Upstream Service]
```

## eBPF Connect Redirect Program

The following BPF C program rewrites IPv4 TCP `connect()` destinations to Envoy.

```c
/* transparent_redirect.bpf.c
 * Attach to BPF_PROG_TYPE_CGROUP_SOCK_ADDR at cgroup/connect4
 * to rewrite IPv4 TCP connect() destinations to Envoy. */
#include <linux/bpf.h>
#include <linux/in.h>
#include <linux/socket.h>

#include <bpf/bpf_endian.h>
#include <bpf/bpf_helpers.h>

/* Envoy listener port for transparent proxying */
#define ENVOY_PORT 15001
/* Mark used by Envoy to avoid re-interception */
#define ENVOY_MARK 100

SEC("cgroup/connect4")
int transparent_redirect(struct bpf_sock_addr *ctx) {
    __u32 mark = 0;

    /* Only act on IPv4 TCP connect() calls */
    if (ctx->user_family != AF_INET || ctx->type != SOCK_STREAM)
        return 1;

    /* Skip if this is Envoy's own traffic (marked) */
    if (bpf_getsockopt(ctx, SOL_SOCKET, SO_MARK, &mark, sizeof(mark)) == 0 &&
        mark == ENVOY_MARK)
        return 1;

    /* Rewrite the destination to Envoy's local listener */
    ctx->user_ip4 = bpf_htonl(0x7f000001); /* 127.0.0.1 */
    ctx->user_port = bpf_htons(ENVOY_PORT);
    return 1;
}

char _license[] SEC("license") = "GPL";
```

## Loading the eBPF Program

```bash
# Compile the BPF program
clang -O2 -g -target bpf -c transparent_redirect.bpf.c -o transparent_redirect.bpf.o

# Load it as a cgroup/connect4 program
bpftool prog load transparent_redirect.bpf.o /sys/fs/bpf/transparent_redirect type cgroup/connect4

# Attach at the cgroup root to affect processes in that hierarchy
bpftool cgroup attach /sys/fs/cgroup cgroup_inet4_connect pinned /sys/fs/bpf/transparent_redirect

# Verify the program is attached
bpftool cgroup tree /sys/fs/cgroup
```

## Envoy Configuration for Transparent Proxy

A `cgroup/connect4` rewrite changes where the socket connects, but it does not populate `SO_ORIGINAL_DST` for Envoy. On Linux, Envoy's `original_dst` listener filter expects original-destination metadata that it knows how to read directly: `SO_ORIGINAL_DST` from iptables `REDIRECT`, or from `TPROXY` when the listener is transparent, or metadata/filter state on internal listeners. If you pair eBPF interception with one of those supported metadata sources, the listener and cluster configuration looks like this:

```yaml
# envoy-config.yaml
static_resources:
  listeners:
    - name: transparent_listener
      address:
        socket_address: { address: 0.0.0.0, port_value: 15001 }
      listener_filters:
        - name: envoy.filters.listener.original_dst
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.listener.original_dst.v3.OriginalDst
      filter_chains:
        - filters:
            - name: envoy.filters.network.tcp_proxy
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
                stat_prefix: transparent
                cluster: original_dst

  clusters:
    - name: original_dst
      type: ORIGINAL_DST
      lb_policy: CLUSTER_PROVIDED
      connect_timeout: 5s
      upstream_bind_config:
        socket_options:
          - level: 1
            name: 36         # SO_MARK
            int_value: 100   # Envoy's bypass mark
            state: STATE_PREBIND
```

## Key Takeaways

- eBPF `cgroup/connect4` programs can rewrite IPv4 TCP `connect()` destinations before the connection is established.
- Use `SO_MARK` on Envoy's upstream sockets to prevent the BPF redirect from re-capturing Envoy's own traffic.
- On Linux, Envoy's `original_dst` listener filter reads `SO_ORIGINAL_DST` from iptables `REDIRECT`, or from `TPROXY` when the listener is transparent, or metadata/filter state on internal listeners; a `connect4` rewrite alone does not supply that metadata.
- eBPF-based interception can replace iptables rule traversal for the redirect step and can expose custom telemetry through BPF programs and maps.
