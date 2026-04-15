# Validation Summary: How to Use Dapr with DNS-Based Service Discovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (name resolution / service discovery)
- DNS (BIND zone files, CoreDNS)
- Kubernetes (CoreDNS ConfigMap)
- Python (Dapr Python SDK)
- Dapr CLI

## Sources Consulted
- Dapr supported name resolution components reference: https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr Kubernetes DNS name resolution spec: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/
- Dapr mDNS name resolution spec: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-mdns/
- Dapr GitHub components-contrib repository (nameresolution directory): https://github.com/dapr/components-contrib/tree/master/nameresolution
- Dapr Python SDK source and examples: https://github.com/dapr/python-sdk
- Dapr CLI reference documentation: https://docs.dapr.io/reference/cli/

## Issues Found

### CRITICAL: Non-existent `component: "dns"` name resolution provider
The entire blog post is built around `component: "dns"` in the Dapr Configuration spec. **This component does not exist in Dapr.** The supported name resolution components are:
- `kubernetes` (Stable, v1) — uses Kubernetes DNS
- `mdns` (Stable, v1) — multicast DNS for self-hosted/local
- `consul` (Alpha, v1) — HashiCorp Consul
- `sqlite` (Alpha, v1) — SQLite-based
- `nameformat` (Alpha, v1) — custom name formatting
- `aws/cloudmap` — AWS Cloud Map

A GitHub issue (#6084) requesting DNS-based name resolution was closed as "not planned," with maintainers recommending Consul instead. This means the Configuration YAML, the `resolutionTimeout` field, and the `{appId}.{dnsSuffix}` hostname construction pattern described in the post are all fabricated. **This issue was not fixed because correcting it would require a complete rewrite of the post**, which goes beyond the scope of error correction.

### Fixed: Deprecated `--components-path` CLI flag
The `dapr run` command used `--components-path`, which is deprecated in favor of `--resources-path`. Updated to `--resources-path`.

### Minor: Python SDK `response.data` usage
The Python code uses `response.data` to access the response body. This works (returns `bytes`, and `json.loads` accepts bytes), but the official Dapr Python SDK examples use `response.text()` as the more idiomatic approach. Not changed since it is technically functional.

### Minor: CoreDNS `coredns-custom` ConfigMap
The CoreDNS ConfigMap named `coredns-custom` with a `dapr.server` key is a pattern specific to managed Kubernetes providers (Azure AKS, DigitalOcean, Akamai/Linode). It is not universally available on all Kubernetes distributions. On vanilla Kubernetes (kubeadm, etc.), you would edit the main `coredns` ConfigMap directly. The `.server` suffix convention for adding new server blocks is correct for environments that support it. Not changed since it is technically correct for managed K8s.

## Review Notes
This post has a fundamental accuracy problem: it describes a Dapr name resolution component (`"dns"`) that does not exist. Readers who follow this tutorial will encounter errors when Dapr fails to find the "dns" component. The closest real alternatives for the use case described (custom DNS infrastructure outside Kubernetes) would be HashiCorp Consul for cross-environment service discovery, or the `nameformat` component for custom address formatting. The Python SDK code, CLI usage, and CoreDNS configuration sections are individually correct in isolation, but they are framed around a non-existent feature. This post should be rewritten to use an actual Dapr name resolution component, or removed.
