# How to Use SO_MARK Socket Option in Envoy for IPv4 Transparent Proxying

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, SO_MARK, IPv4, Transparent Proxy, iptables, Linux, Networking

Description: Learn how to configure Envoy's SO_MARK socket option to mark outbound IPv4 packets for policy-based routing in transparent proxy deployments.

---

`SO_MARK` sets a mark (an integer tag) on packets originating from a socket. Combined with `iptables` mark matches and, when needed, Linux policy routing (`ip rule`), this allows Envoy to handle its own outbound packets differently from other processes - a key technique for transparent proxy deployments.

## Why SO_MARK Matters for Transparent Proxying

In a transparent proxy, intercepted traffic must not be re-intercepted by the same iptables rules that captured it in the first place (causing an infinite loop). `SO_MARK` solves this:

1. `iptables` redirects all traffic to Envoy.
2. Envoy sets `SO_MARK` on its outbound sockets.
3. `iptables` can exclude marked packets from `REDIRECT`, and `ip rule` can optionally steer them via a separate routing table.

## Configuring SO_MARK in Envoy

```yaml
# envoy-config.yaml

static_resources:
  clusters:
    - name: original_dst_cluster
      type: ORIGINAL_DST       # Use the original destination IP (before interception)
      lb_policy: CLUSTER_PROVIDED
      connect_timeout: 5s
      upstream_bind_config:
        socket_options:
          - description: "SO_MARK for transparent proxy bypass"
            level: 1           # SOL_SOCKET = 1
            name: 36           # SO_MARK = 36
            int_value: 100     # Mark value (must match ip rule fwmark)
            state: STATE_PREBIND

  listeners:
    - name: transparent_listener
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 15001
      listener_filters:
        # Recover the original destination address before interception
        - name: envoy.filters.listener.original_dst
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.listener.original_dst.v3.OriginalDst
      filter_chains:
        - filters:
            - name: envoy.filters.network.tcp_proxy
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
                stat_prefix: transparent
                cluster: original_dst_cluster

admin:
  address:
    socket_address: { address: 127.0.0.1, port_value: 9901 }
```

## iptables Rules to Redirect Traffic to Envoy

```bash
# Redirect all outbound IPv4 TCP traffic to Envoy's listener port
# except packets already marked with fwmark 100 (Envoy's own traffic)
iptables -t nat -A OUTPUT -p tcp -m mark ! --mark 100 -j REDIRECT --to-ports 15001

# For inbound traffic interception (in-pod transparent proxy like Istio)
iptables -t nat -A PREROUTING -p tcp -m mark ! --mark 100 -j REDIRECT --to-ports 15001
```

## Optional Policy Routing for Marked Traffic

```bash
# Route packets marked with 100 via a different routing table (table 100)
ip rule add fwmark 100 table 100

# Example table 100 entry: send marked packets via a specific gateway
ip route add default via 192.168.1.1 table 100
```

This `ip rule` is optional for loop prevention when the `iptables` redirect rules already exempt the mark; use it only if marked traffic should follow a different route than the main routing table.

## Granting Envoy the NET_ADMIN Capability

`SO_MARK` requires the `CAP_NET_ADMIN` capability on older Linux kernels; Linux 5.17 and later also allow `CAP_NET_RAW`.

```bash
# For a system Envoy binary
setcap cap_net_admin+ep /usr/local/bin/envoy

# For Kubernetes (add to the pod's securityContext)
# securityContext:
#   capabilities:
#     add: ["NET_ADMIN"]
```

## Key Takeaways

- `SO_MARK` sets a per-socket packet mark; use mark value `100` (or any non-zero integer) consistently in `iptables` and, if needed, `ip rule`.
- Use the mark in `iptables` redirect exemptions to keep Envoy's own outbound connections from being re-intercepted.
- `ip rule` is optional here and is only needed if marked traffic should follow a separate routing table.
- Use `ORIGINAL_DST` with `lb_policy: CLUSTER_PROVIDED` and the `original_dst` listener filter to forward to the true destination.
- Setting `SO_MARK` requires `CAP_NET_ADMIN` on older kernels; Linux 5.17+ also accepts `CAP_NET_RAW`.
