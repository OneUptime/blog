# Validation Summary: How to Use SO_MARK Socket Option in Envoy for IPv4 Transparent Proxying

## Status
validated

## Post Type
Guide / Configuration tutorial

## Technologies Covered
- Envoy Proxy
- Linux socket options (`SO_MARK`)
- Linux `iptables`
- Linux policy routing (`ip rule`, `ip route`)
- Linux capabilities (`setcap`, `CAP_NET_ADMIN`, `CAP_NET_RAW`)
- YAML configuration

## Sources Consulted
- Envoy socket option proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/socket_option.proto.html
- Envoy cluster configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy network addresses / `BindConfig` proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/address.proto.html
- Envoy original destination listener filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/original_dst_filter
- Envoy service discovery overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Linux `socket(7)` manual: https://man7.org/linux/man-pages/man7/socket.7.html
- Linux `iptables-extensions(8)` manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux `ip-rule(8)` manual: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- Linux `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
1. The Envoy cluster example omitted the required original-destination load balancer selection. Envoy documents that original destination service discovery must be used with the original destination load balancer, and cluster-specific load balancers require `lb_policy: CLUSTER_PROVIDED`. I added that field to the `ORIGINAL_DST` cluster.
2. The `iptables` examples used `--to-port`, but the documented REDIRECT target option is `--to-ports`. I corrected both redirect commands.
3. The post incorrectly stated that policy routing bypasses the `iptables` redirect and presented it as the loop-prevention mechanism. In this configuration, loop prevention comes from the `iptables` mark exemption; policy routing is optional and only needed if marked traffic should follow a different routing table. I corrected the introduction, the explanation, the section heading, and the key takeaways.
4. The capability note was outdated. Current Linux `socket(7)` documentation states that setting `SO_MARK` requires `CAP_NET_ADMIN`, or `CAP_NET_RAW` starting with Linux 5.17. I updated the wording while keeping the existing `NET_ADMIN` example, which remains valid.

## Review Notes
- The numeric socket option values in the Envoy example are Linux-specific: `level: 1` is `SOL_SOCKET` and `name: 36` is `SO_MARK`. Envoy's socket option API expects numeric values and explicitly notes that these numbers can differ across platforms.
- The `envoy` binary is not installed in this workspace, so I validated the configuration shape and field semantics against the current Envoy v3 API documentation rather than `envoy --mode validate`.
- Local CLI help for `iptables`, `ip rule`, `ip route`, and `setcap` was also checked and matched the documentation used above.
