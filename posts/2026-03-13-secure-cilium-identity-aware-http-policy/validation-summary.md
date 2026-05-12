# Validation Summary: How to Secure Cilium Identity-Aware and HTTP-Aware Policy Enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium (CNI, eBPF-based networking)
- Kubernetes
- CiliumNetworkPolicy (CRD, cilium.io/v2)
- Envoy (L7 proxy)
- Hubble (network observability)
- `cilium-dbg` (in-pod debugging CLI)

## Sources Consulted
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- `cilium-dbg policy` subcommands: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy/
- `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- `cilium-dbg monitor`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_monitor/
- Cilium Layer 7 Protocol Visibility: https://docs.cilium.io/en/stable/observability/visibility/
- Hubble observe documentation and Cilium Hubble cheat sheet (Isovalent)
- Cilium Troubleshooting docs: https://docs.cilium.io/en/latest/security/policy/troubleshooting/

## Issues Found

1. **`cilium-dbg policy trace` does not exist.** The post recommended running `cilium-dbg policy trace --src-label ... --dst-label ... --dport ...` to verify policy. The `policy trace` subcommand has been removed from Cilium — the current `cilium-dbg policy` subcommands are only `get` (deprecated), `selectors`, `subject-selectors`, and `wait`, and the docs URL for `policy_trace` returns 404. I replaced the section with two supported alternatives: `cilium-dbg policy selectors` to inspect selector → identity mapping, and `hubble observe --verdict DROPPED --to-label app=api-server` to observe live policy verdicts. Section heading updated to "Verify Selector to Identity Mapping" to match.

2. **"Cryptographic identity" claim was inaccurate.** Cilium security identities are numeric IDs derived from pod labels (stored via CRD or kvstore); they are not cryptographic. Cryptographic identity in Cilium is a separate, opt-in feature based on SPIFFE/SPIRE for mutual authentication. Reworded to "label-derived security identity" so the introduction matches the actual mechanism described in the rest of the post (which correctly says identities are derived from labels).

## Review Notes

- `cilium-dbg endpoint list`, `cilium-dbg monitor --type l7`, and `hubble observe --protocol http --to-label ... --follow` are all valid commands in current Cilium (1.18/1.19/1.20 series). `--type` accepts `agent`, `capture`, `debug`, `drop`, `l7`, `policy-verdict`, `trace`, `trace-sock`.
- The `CiliumNetworkPolicy` manifest uses `apiVersion: cilium.io/v2`, which is the current GA version. The `endpointSelector`, `fromEndpoints`, `toPorts` (with `port` as a string, `protocol` uppercase), and `rules.http` with `method` + `path` (regex) fields all match the upstream CRD schema.
- `cilium-dbg policy get` is marked deprecated upstream; future revisions could mention this if the post is expanded to cover policy inspection.
- The Mermaid architecture diagram is illustrative; in practice L7 verdicts (403) and L3/L4 drops are produced by Envoy and the eBPF datapath respectively, not a single decision point — but the simplification is acceptable for an introductory post.
