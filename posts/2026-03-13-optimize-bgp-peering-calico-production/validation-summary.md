# Validation Summary: How to Optimize BGP Peering in Calico for Production

## Status
validated

## Post Type
Tutorial / Production-tuning guide

## Technologies Covered
- Calico (v3.26+ / v3.27+)
- Kubernetes
- BGP (Border Gateway Protocol)
- BIRD (the BGP daemon used by Calico under the hood)
- `calicoctl` and `kubectl`
- Calico CRDs: `BGPConfiguration`, `BGPPeer`, `BGPFilter`

## Sources Consulted
- [Calico BGP configuration resource reference](https://docs.tigera.io/calico/latest/reference/resources/bgpconfig)
- [Calico BGP peer resource reference](https://docs.tigera.io/calico/latest/reference/resources/bgppeer)
- [Calico BGP filter resource reference](https://docs.tigera.io/calico/latest/reference/resources/bgpfilter)
- [Calico "Configure BGP peering" docs](https://docs.tigera.io/calico/latest/networking/configuring/bgp)

## Issues Found

1. **"Enable Graceful Restart" used a non-existent API path.** The original post patched `spec.gracefulRestart.enabled` / `spec.gracefulRestart.restartTime` on `BGPConfiguration`. Those fields do not exist on Calico's `BGPConfiguration` CRD. Per the Calico reference, graceful restart timing for the node-to-node mesh is controlled by `spec.nodeMeshMaxRestartTime`, and per-peer graceful restart is configured via `spec.maxRestartTime` on `BGPPeer`. Replaced the patch with `nodeMeshMaxRestartTime: "120s"` and added a separate `BGPPeer` example showing `maxRestartTime: 120s` for explicit peers.

2. **"Set Prefix Limits" example was completely unrelated to prefix limits.** The original YAML defined a `BGPPeer` with `maxRestartTime: 10s`, which is a graceful-restart parameter, not a prefix-count limit. Calico's `BGPPeer` has no max-prefix counter field. The Calico-native way to constrain accepted prefixes is the `BGPFilter` resource (v3.27+), using `prefixLength.min`/`max` and `cidr` matchers, then attaching the filter to a `BGPPeer` via `spec.filters`. Replaced the example with a correct `BGPFilter` + `BGPPeer` pair.

3. **"Tune BGP Timers" claimed to reduce BGP hold/keepalive timers, but the YAML showed no timer fields and none exist on the BGPPeer/BGPConfiguration CRDs.** Calico's CRDs do not expose hold-time or keepalive-interval fields; the underlying BIRD defaults apply. Renamed the section to "Configure Production BGP Settings" and rewrote the lead paragraph to make the limitation explicit. Also replaced the deprecated `keepOriginalNextHop: false` (the field is documented as deprecated in favor of `nextHopMode`) on the external `BGPPeer` example with `nextHopMode: Self`, and removed it from the `BGPConfiguration` block where it does not apply.

## Review Notes

- The cluster ID `244.0.0.1` used in the route reflector example is in the Class E reserved IPv4 space. It still functions as a 32-bit BGP cluster ID (BGP cluster IDs do not need to be routable IPs), so I left it as-is — but real deployments typically use the reflector's loopback IP. Worth a future cleanup, not a technical error.
- The Mermaid diagram uses `\n` inside node labels (e.g. `RR1[RR Node 1\nCluster ID 244.0.0.1]`). This renders as a literal `\n` in some Mermaid versions and as a line break in others; using `<br/>` is more portable. Not a correctness issue for this post's purpose, left as-is.
- The introduction and conclusion still reference "tuning timer values for failure detection." This is now slightly aspirational given Calico's CRDs do not expose hold/keepalive timers; I kept the wording because the section now explicitly explains the limitation, and rewriting the intro/conclusion would exceed the scope of "fix technical errors."
- The label/selector convention used (`calico-route-reflector=true` + `has(calico-route-reflector)`) is valid Calico selector syntax and matches the patterns in the official BGP configuration docs.
- The `O(n²)` characterization of full-mesh BGP scaling is correct: a full mesh of N speakers requires N*(N-1)/2 sessions.
