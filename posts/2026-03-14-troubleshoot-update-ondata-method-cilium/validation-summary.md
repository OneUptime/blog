# Validation Summary: Troubleshooting the OnData Method in Cilium Network Security

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium Envoy proxy
- Cilium proxylib Go extensions
- Kubernetes
- Go
- Envoy admin interface and metrics

## Sources Consulted
- Cilium Envoy and Go extensions documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for `cilium-dbg envoy admin listeners`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_listeners/
- Cilium command reference for `cilium-dbg envoy admin metrics`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_metrics.html
- Cilium command reference for `cilium-dbg envoy admin logging set global`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_logging_set_global/
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium proxy `ReaderParser` interface source: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/parserfactory.go
- Cilium proxy `Reader` source: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/reader.go
- Cilium proxy Kafka parser example: https://github.com/cilium/proxy/blob/main/proxylib/kafka/parser.go
- Cilium proxy `Connection` source: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/connection.go

## Issues Found
- The post used `reader.PeekSlice`, but the current Cilium proxylib `Reader` exposes `PeekFull`, `Read`, `Length`, `AdvanceInput`, and `Reset`; there is no `PeekSlice` method. I changed the examples to use `PeekFull` with fixed-size buffers.
- The post used `cilium bpf proxy list`, which is not present in the current Cilium command reference. I replaced those checks with `cilium-dbg envoy admin listeners`, which is the documented way to inspect configured Envoy listeners.
- The post used raw Envoy admin `curl` commands against port 9901 from the Cilium pod. I replaced them with the documented `cilium-dbg envoy admin metrics --filter ...` command.
- The post used `cilium monitor --type policy-verdict` inside the Cilium pod. Current in-agent troubleshooting commands use `cilium-dbg`, so I changed it to `cilium-dbg monitor --type policy-verdict`.
- The debug logging command used `cilium config set debug true` as if it were an in-pod proxy logging command. I replaced it with the documented `cilium-dbg envoy admin logging set global debug`.
- The policy matching example accessed non-existent or unexported connection fields such as `Rules`, `SrcIdentity`, and `DstIdentity`. I updated it to log exported connection metadata and call `p.connection.Matches(req)`, which Cilium's documentation recommends for L7 policy matching.
- The active policy inspection command used deprecated `cilium policy get` style output for policy resources. I changed it to inspect Kubernetes Cilium policy resources directly with `kubectl get ciliumnetworkpolicies,ciliumclusterwidenetworkpolicies -A -o yaml`.
- The prerequisites and panic-trace command referred generically to the `Parser` interface and Cilium agent logs. I adjusted them to the `ReaderParser` interface used by the examples and to the Envoy proxy log container for proxy panics.

## Review Notes
The examples remain illustrative and use a placeholder `MyProtocolRequest` type for protocol-specific policy matching. The post does not pin a Cilium version; the validation was performed against current stable Cilium documentation and the current `cilium/proxy` proxylib sources available on May 8, 2026.
