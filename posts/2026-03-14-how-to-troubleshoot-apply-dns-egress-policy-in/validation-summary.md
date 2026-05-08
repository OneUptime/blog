# Validation Summary: Troubleshooting DNS Egress Policies in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- DNS/FQDN egress policy
- `kubectl`, `cilium`, `cilium-dbg`, `jq`

## Sources Consulted
- Cilium DNS-based policies documentation: https://docs.cilium.io/en/stable/security/dns.html
- Cilium Layer 3 DNS/FQDN policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3.html
- Cilium policy language documentation for `toFQDNs` and DNS proxy behavior: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium `cilium-dbg fqdn cache list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_fqdn_cache_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium troubleshooting documentation for `cilium-dbg status --verbose` and Hubble: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli.html
- Cilium Kubernetes policy selector documentation: https://docs.cilium.io/en/stable/security/policy/kubernetes/

## Issues Found
- Replaced several top-level `cilium` agent-debug commands with `cilium-dbg` executed inside the Cilium agent pod. Current Cilium documentation exposes FQDN cache, endpoint, metrics, and detailed local agent commands through `cilium-dbg`, while the top-level `cilium` CLI is primarily the Kubernetes-facing CLI.
- Corrected the DNS/FQDN policy guidance. The original text said DNS and FQDN rules "MUST" be in the same policy. Cilium requires a separate DNS L7 policy rule so the DNS proxy can intercept DNS responses for the same selected endpoints; keeping both rules in one policy is a simple documented pattern, but the same-policy requirement was overstated.
- Updated the kube-dns `toEndpoints` selector labels in the YAML example to use the documented Cilium Kubernetes label source prefix: `"k8s:io.kubernetes.pod.namespace"` and `"k8s:k8s-app"`.
- Updated the conclusion to refer to missing DNS proxy rules and `cilium-dbg` cache inspection instead of "split DNS/FQDN policies" and top-level Cilium CLI cache inspection.

## Review Notes
The Hubble commands and CiliumNetworkPolicy structure are consistent with current Cilium documentation. The examples assume the standard kube-dns/CoreDNS labels in `kube-system`; OpenShift and custom DNS deployments may require different namespace, labels, or DNS port values.
