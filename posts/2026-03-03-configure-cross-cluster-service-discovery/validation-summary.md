# Validation Summary: How to Configure Cross-Cluster Service Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- ExternalDNS (with AWS Route53)
- CoreDNS (Corefile / forwarding plugin)
- Cilium ClusterMesh
- Istio multi-cluster (IstioOperator API)
- kubectl
- Helm

## Sources Consulted
- Cilium ClusterMesh services docs: https://docs.cilium.io/en/stable/network/clustermesh/services/
- Cilium ClusterMesh affinity docs: https://docs.cilium.io/en/stable/network/clustermesh/affinity/
- Cilium ClusterMesh setup: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- ExternalDNS docs and Bitnami chart values (annotation `external-dns.alpha.kubernetes.io/hostname`)
- CoreDNS plugin docs: https://coredns.io/plugins/kubernetes/ and https://coredns.io/plugins/forward/
- Talos Linux machine/cluster config reference (`cluster.coreDNS.disabled`, `cluster.inlineManifests`)
- Istio multi-cluster install docs: https://istio.io/latest/docs/setup/install/multicluster/ (IstioOperator `install.istio.io/v1alpha1`, `istioctl create-remote-secret`)
- kubectl run reference (`--rm -it` for ephemeral pods)

## Issues Found
1. **Cilium global-service annotation mislabeled.** The post used `service.cilium.io/shared: "true"` with the comment "only use remote endpoints as backup". That is incorrect — `service.cilium.io/shared` only controls whether the local cluster's endpoints are exposed to remote clusters (default `"true"`), and `"true"` does not make remote endpoints a fallback. The annotation that produces local-first / remote-fallback behavior is `service.cilium.io/affinity: "local"`. Changed the example annotation to `service.cilium.io/affinity: "local"` and updated the inline comment accordingly.

## Review Notes
- The Option 2 CoreDNS example uses the kubernetes-plugin cluster zone `cluster-a.local`. Using a custom cluster domain (i.e. anything other than the default `cluster.local`) also requires the kubelet `clusterDomain` to be set to match across all nodes — this is implicit in the example but not called out. Acceptable for a high-level overview.
- The CoreDNS forward target `10.96.0.10` is cluster-b's CoreDNS ClusterIP and is only reachable when a VPN/tunnel routes cluster-b's service CIDR into cluster-a. The post does mention the VPN/tunnel requirement.
- `IstioOperator` (`install.istio.io/v1alpha1`) is being phased out in newer Istio releases (the in-cluster operator was deprecated; the Sail operator is the new direction), but `istioctl install -f` still accepts the IstioOperator schema in current Istio versions, so the example is functional today.
- For Istio multi-primary across networks, a real deployment usually also requires an east-west gateway; the post covers the high-level install flow only.
- Bitnami's Helm chart distribution has shifted toward the `oci://registry-1.docker.io/bitnamicharts/external-dns` OCI registry — users following the `bitnami/external-dns` repo path may need to add/update the Bitnami repo or switch to the OCI chart depending on chart version.
