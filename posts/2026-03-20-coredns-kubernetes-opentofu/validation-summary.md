# Validation Summary: How to Configure CoreDNS with OpenTofu on Kubernetes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- CoreDNS (DNS server)
- Kubernetes
- OpenTofu (Terraform fork)
- HashiCorp Kubernetes provider
- HashiCorp Helm provider
- CoreDNS Helm chart
- kubectl

## Sources Consulted
- CoreDNS plugin index — https://coredns.io/plugins/
- CoreDNS `forward` plugin docs — https://coredns.io/plugins/forward/
- CoreDNS `kubernetes` plugin docs — https://coredns.io/plugins/kubernetes/
- CoreDNS `health`, `ready`, `cache`, `loop`, `reload`, `loadbalance` plugin docs — https://coredns.io/plugins/
- CoreDNS Helm chart repository — https://github.com/coredns/helm
- CoreDNS Helm chart values schema — https://github.com/coredns/helm/blob/master/charts/coredns/values.yaml
- CoreDNS Helm index (live) — https://coredns.github.io/helm/index.yaml (verified `1.29.0` is a real published version)
- HashiCorp Kubernetes provider (`kubernetes_config_map_v1`) — https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- HashiCorp Helm provider (`helm_release`) — https://registry.terraform.io/providers/hashicorp/helm/latest/docs

## Issues Found
1. **Invalid `stub` plugin in the Corefile.** The original Corefile included a `stub internal.example.com { forward . 192.168.1.1 }` block. CoreDNS does not have a `stub` plugin (the SkyDNS-era `stubzones` was superseded by the `forward` plugin). Loading this Corefile would cause CoreDNS to fail with an unknown directive error.
   - **Fix:** Replaced the `stub` block with an equivalent `forward internal.example.com 192.168.1.1` directive (matching the pattern already used a few lines above for `corporate.example.com`) and updated the comment accordingly.

## Review Notes
- The CoreDNS Helm chart version `1.29.0` referenced in the post is a real published release, but it is significantly older than the current 1.45.x line (verified via `https://coredns.github.io/helm/index.yaml`). Readers may want to pin to a more current version when adopting this configuration.
- The `Custom Hosts Entry` section defines a `locals` block (`custom_hosts`) but does not show the local being consumed by the CoreDNS configuration. This is intentional as a snippet illustrating the entry format, but future revisions could show how to wire it into the Corefile (e.g., via the `hosts` plugin pointing at a mounted file or inline entries).
- The `lifecycle.ignore_changes = [metadata[0].annotations]` block uses the correct nested-block index syntax for the Kubernetes provider's `metadata` block.
- Inside the main `.:53` server block, ordering matters for `forward` directives — more specific (longer) zones should appear before broader catch-alls, which the corrected configuration respects (specific domains forwarded before the catch-all `forward . /etc/resolv.conf`).
