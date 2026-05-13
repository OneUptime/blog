# Validation Summary: How to Deploy Kubernetes Network Policy Controller with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Flux CD HelmRepository and HelmRelease
- Cilium CNI
- Calico / Tigera Operator
- Helm
- kubectl and Cilium CLI
- Kustomize

## Sources Consulted
- Kubernetes Network Policies concept documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Calico Helm installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api

## Issues Found
- Flux HelmRelease examples referenced HelmRepository objects in `flux-system` from releases in other namespaces without setting `sourceRef.namespace`. Added `namespace: flux-system` so Flux resolves the correct source.
- The Cilium chart version was pinned to the old `1.15.x` series. Updated it to `1.19.x`, matching the current stable Cilium Helm documentation reviewed.
- The Cilium pod check used a label selector that is not the standard Cilium agent label. Changed it to `k8s-app=cilium`.
- The Cilium monitor command used `cilium monitor`; current Cilium docs document `cilium-dbg monitor`. Updated the command and changed the comment from Hubble flow logs to Cilium drop events.
- The Calico HelmRelease installed only the Tigera operator chart. Current Calico Helm documentation installs CRDs separately before the operator, so the example now includes a `calico-crds` HelmRelease and a `dependsOn` relationship.
- The Calico values used `installation.cniType`, which is not the current Installation API shape. Changed it to `installation.cni.type`.
- The Calico version was updated from `v3.27.x` to `v3.32.x`, matching the current Calico documentation reviewed.
- The NetworkPolicy `from` and `to` examples split `namespaceSelector` and `podSelector` into separate list items, which makes them OR conditions. Combined them into single peer entries so the policies select pods with the specified labels inside the specified namespaces, matching the text.

## Review Notes
- The Cilium Helm values are still intentionally generic. Real production clusters may need IPAM, kube-proxy replacement, routing, cloud-provider, or node-taint settings based on the cluster environment.
- The DNS egress example allows TCP/UDP port 53 to any destination. This is syntactically valid and commonly used for compact examples, but production policies often restrict DNS egress to kube-dns/CoreDNS or NodeLocal DNSCache.
