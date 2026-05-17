# Validation Summary: How to Configure etcd Listen and Advertise Addresses in Talos

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Talos Linux (machine configuration: `cluster.etcd.advertisedSubnets`, `cluster.etcd.listenSubnets`, `cluster.etcd.extraArgs`)
- etcd (listen / advertise client and peer URLs, ports 2379/2380/2381)
- Kubernetes control plane (etcd backing store for the API server)
- talosctl (`apply-config`, `get etcdmembers`, `etcd members`, `etcd status`, `logs`, `netstat`)

## Sources Consulted
- Talos production-clusters guide (etcd / `advertisedSubnets`, `listenSubnets`): https://docs.siderolabs.com/talos/v1.9/getting-started/prodnotes
- Talos v1.12 configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/v1alpha1/config/
- Talos `talosctl` CLI reference (etcd subcommands, `netstat`, `logs`): https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos source — `internal/app/machined/pkg/system/services/etcd.go` (`denyListArgs` for etcd `extraArgs`): https://github.com/siderolabs/talos/blob/main/internal/app/machined/pkg/system/services/etcd.go
- etcd clustering guide (port roles, advertise vs. listen semantics): https://etcd.io/docs/v3.3/op-guide/clustering/

## Issues Found
1. **`extraArgs` denylist violation — `listen-client-urls` / `listen-peer-urls`.** The original post repeatedly placed `listen-client-urls` and `listen-peer-urls` under `cluster.etcd.extraArgs` (in "Customizing etcd Addresses", "Multi-Network Configurations", and "Security Considerations"). Talos's etcd service uses a `denyListArgs` set that rejects these flags from `extraArgs`; the supported mechanism is the `listenSubnets` field. **Fix:** replaced those entries with `listenSubnets` blocks, and added a short note clarifying which etcd flags Talos manages internally.
2. **`extraArgs` denylist violation — `initial-cluster*` flags.** The "Configuring for High Availability" section showed users setting `initial-cluster`, `initial-cluster-state`, and `initial-cluster-token` through `extraArgs`. These are also on the Talos denylist; HA bootstrap is owned by `talosctl bootstrap` plus the discovery service. **Fix:** rewrote the section to explain that Talos manages cluster bootstrap automatically and to show the supported configuration (consistent `advertisedSubnets` / `listenSubnets` on every control-plane node).
3. **Summary paragraph wording.** Updated the closing paragraph to mention `listenSubnets` alongside `advertisedSubnets` so it matches the (now-corrected) body.

## Review Notes
- All `talosctl` subcommands used in the post (`apply-config`, `get etcdmembers`, `etcd members`, `etcd status`, `logs etcd`, `netstat`) are present in the current Talos CLI reference.
- The stated etcd defaults (2379 client, 2380 peer, 2381 metrics; `0.0.0.0` listen with per-node advertise) match Talos's documented behavior.
- `listenSubnets` defaults to `advertisedSubnets` when omitted; both examples set them explicitly for clarity, which mirrors the Talos production-cluster guide.
- The `listen-metrics-urls` flag is **not** on the denylist and remains a legitimate use of `extraArgs`, so it was left in place in the examples.
- Version-specific caveat: the denylist is current as of Talos v1.9–v1.12. If a future release relaxes any of these flags, the explanatory wording around the denylist would need a refresh, but the `listenSubnets` / `advertisedSubnets` approach will continue to be the recommended path.
