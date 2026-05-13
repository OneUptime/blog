# Validation Summary: CoreDNS Custom Config with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CoreDNS
- Kubernetes ConfigMaps
- Kubernetes DNS configuration
- Flux CD Kustomizations
- Kustomize patches
- DNS zone files

## Sources Consulted
- Kubernetes documentation: Customizing DNS Service, https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Flux documentation: Kustomization CRD, https://fluxcd.io/flux/components/kustomize/kustomizations/
- CoreDNS forward plugin documentation, https://coredns.io/plugins/forward/
- CoreDNS file plugin documentation, https://coredns.io/plugins/file/
- CoreDNS reload plugin documentation, https://coredns.io/plugins/reload/
- CoreDNS rewrite plugin documentation, https://coredns.io/plugins/rewrite/
- CoreDNS prometheus plugin documentation, https://coredns.io/plugins/metrics/
- Azure AKS documentation: Customize CoreDNS, https://learn.microsoft.com/en-us/azure/aks/coredns-custom

## Issues Found
- The prerequisites listed AKS alongside clusters where the main `kube-system/coredns` ConfigMap can be managed directly. AKS documents customization through the provider-supported `coredns-custom` ConfigMap instead, so the prerequisite was narrowed to clusters/providers that allow direct management of `kube-system/coredns`.
- The custom zone file example created a separate `coredns-custom-zones` ConfigMap, but the CoreDNS Corefile referenced `/etc/coredns/internal.db`. The default CoreDNS Deployment mounts the `coredns` ConfigMap at `/etc/coredns`, so a separate ConfigMap would not be available unless the Deployment were also changed. The example now adds `internal.db` to the same `coredns` ConfigMap.
- The custom zone used the `file` plugin but did not configure zone-file reloading. The `reload` plugin watches the Corefile, while the `file` plugin has its own reload option for zone files. Added `reload 30s` to the `file` block and noted that the SOA serial must change when zone data changes.
- The Flux Kustomization example used `prune: true` while the best practices warned against pruning when managing only the CoreDNS ConfigMap. Changed the example to `prune: false`.
- The Flux Kustomization included a static `config-hash: "placeholder"` Deployment patch described as forcing CoreDNS reloads. A static annotation would not change on ConfigMap updates, and Flux Kustomization patches only patch resources in the rendered Kustomize output. Removed the patch and aligned the reload guidance with CoreDNS plugin behavior.

## Review Notes
- The CoreDNS `forward`, `rewrite`, `reload`, `file`, `health`, `ready`, `cache`, `loop`, and `loadbalance` examples are consistent with current CoreDNS plugin documentation after the fixes.
- The verification commands use common `kubectl` and Flux CLI forms. The CoreDNS pod label may vary by distribution, but `k8s-app=kube-dns` is common in Kubernetes CoreDNS deployments.
