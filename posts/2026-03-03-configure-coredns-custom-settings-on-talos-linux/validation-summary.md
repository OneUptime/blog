# Validation Summary: How to Configure CoreDNS Custom Settings on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoreDNS (DNS server, plugin system, Corefile)
- Talos Linux (machine configuration, talosctl)
- Kubernetes (ConfigMaps, Deployments, kubectl)
- DNS forwarding, caching, and rewriting

## Sources Consulted
- CoreDNS health plugin: https://coredns.io/plugins/health/
- CoreDNS hosts plugin: https://coredns.io/plugins/hosts/
- CoreDNS cache plugin: https://coredns.io/plugins/cache/
- CoreDNS rewrite plugin: https://coredns.io/plugins/rewrite/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS import plugin: https://coredns.io/plugins/import/
- Talos v1alpha1 configuration reference: https://www.talos.dev/v1.8/reference/configuration/v1alpha1/config/
- Talos CoreDNS customization discussion: https://github.com/siderolabs/talos/discussions/10012
- K3s coredns manifest (for coredns-custom comparison): https://github.com/k3s-io/k3s/blob/main/manifests/coredns.yaml

## Issues Found
1. **Invalid `lazystart` directive in the health plugin block** — The post used `health { lazystart }` in five separate Corefile examples. This is not a valid CoreDNS health plugin option; the documented options are `ADDRESS` and `lameduck DURATION`. The actual Talos default Corefile uses `health { lameduck 5s }`. Fixed all five occurrences to use `lameduck 5s`.

2. **Missing prerequisite for the `coredns-custom` ConfigMap approach** — The post described the `coredns-custom` ConfigMap pattern as if it would work out of the box on Talos, but this auto-mounting behavior is specific to K3s. On standard Talos, the ConfigMap must be mounted into the CoreDNS Deployment at `/etc/coredns/custom` (matching the `import` path) for the `import` directives to resolve. Added a sentence noting this prerequisite so readers don't end up with a broken CoreDNS pod after applying the example.

## Review Notes
- All other CoreDNS plugin syntax (hosts, cache success/denial/prefetch, rewrite name regex with `{1}` capture groups, forward, import) was verified correct.
- Talos machine config fields (`machine.network.nameservers`, `machine.kubelet.clusterDNS`, `cluster.coreDNS.disabled`) are accurate against the v1alpha1 schema.
- The `k8s-app=kube-dns` label used in `kubectl logs` commands is correct — CoreDNS deployments retain this label for backward compatibility with kube-dns, including on Talos.
- The patch path (editing the live `coredns` ConfigMap) will be overwritten on Talos upgrades that ship a new CoreDNS template; the post correctly hints at this in the "Using ConfigMap for Custom Corefile" section. For long-lived customizations, the Talos-supported route is to override the CoreDNS Corefile via `cluster.extraManifests` or by managing CoreDNS outside the Talos-managed bootstrap (set `cluster.coreDNS.disabled: true` and deploy your own). Not added to the post since it would be a structural change.
