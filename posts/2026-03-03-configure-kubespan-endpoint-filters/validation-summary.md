# Validation Summary: How to Configure KubeSpan Endpoint Filters

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Talos Linux (KubeSpan feature)
- WireGuard (underlying mesh tunnel protocol)
- talosctl CLI
- YAML machine configuration
- CIDR notation (IPv4 and IPv6)

## Sources Consulted
- Talos KubeSpan guide (v1.12): https://docs.siderolabs.com/talos/v1.12/networking/kubespan/
- Talos KubeSpan guide (v1.6): https://docs.siderolabs.com/talos/v1.6/networking/kubespan/
- Talos v1alpha1 configuration source (`KubeSpanFilters` struct): https://github.com/siderolabs/talos/blob/main/pkg/machinery/config/types/v1alpha1/v1alpha1_types.go
- Talos KubeSpan resource definitions: https://github.com/siderolabs/talos/tree/main/pkg/machinery/resources/kubespan (`Endpoint`, type `KubeSpanEndpoints.kubespan.talos.dev`)
- Talos cluster resource definitions: https://github.com/siderolabs/talos/tree/main/pkg/machinery/resources/cluster (`Member`, type `Members.cluster.talos.dev`; `Affiliate`, type `Affiliates.cluster.talos.dev`)
- Talos troubleshooting guide: https://docs.siderolabs.com/talos/v1.9/troubleshooting/troubleshooting

## Issues Found
1. **Invalid resource name `discoveredmembers`.** The post used `talosctl get discoveredmembers` in two places (the "Verifying Filter Results" section and Step 4 of the "Debugging Filter Issues" section). Talos has no resource called `discoveredmembers` — the cluster resource for discovered cluster members is `Members.cluster.talos.dev`, accessed via `talosctl get members`. Verified against the Talos source (`pkg/machinery/resources/cluster/member.go`) and the official troubleshooting documentation, which uses `talosctl -n <IP> get members`. Replaced both occurrences with `talosctl get members`.
2. **Inconsistent singular `kubespanendpoint` resource name.** The post referred to `talosctl get kubespanendpoint` in three places. While talosctl typically accepts both singular and plural forms, the Talos resource type is `KubeSpanEndpoints.kubespan.talos.dev` and the official v1.12 KubeSpan documentation uses the plural `kubespanendpoints`. Normalized all three occurrences to `kubespanendpoints` so readers can copy/paste directly against the documented form.

## Review Notes
- The `!CIDR` negation prefix used throughout the post is correct. Verified directly against the Talos source for `KubeSpanFilters.KubeSpanFiltersEndpoints` in `pkg/machinery/config/types/v1alpha1/v1alpha1_types.go`, which documents the example `[]string{"0.0.0.0/0", "!192.168.0.0/16", "::/0"}`. The "first match wins" evaluation semantics described in the post match the field's behaviour.
- The configuration path `machine.network.kubespan.filters.endpoints` is correct for the v1alpha1 `MachineConfig` document. Note that newer Talos versions are gradually moving KubeSpan settings to a separate `KubeSpanConfig` multi-document type (see siderolabs/talos issue #12437); the v1alpha1 path used in this post still works and remains documented for v1.12, but readers on future major versions may need to migrate.
- The post does not mention the sibling `filters.excludeAdvertisedNetworks` field (used for filtering advertised networks rather than endpoints). That is outside the scope of "endpoint filters" so not an issue, but worth noting for any future companion post.
- `talosctl patch machineconfig --patch @<file>` syntax used in the "Applying Filter Changes" section is correct.
- IPv6 example using `!fe80::/10` for link-local exclusion and `::/0` for include-all is correct.
