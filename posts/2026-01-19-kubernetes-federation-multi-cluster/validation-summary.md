# Validation Summary: How to Set Up Kubernetes Federation Across Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KubeFed / Kubernetes Federation v2
- kubefedctl
- Helm
- Submariner / subctl
- Kubernetes Multi-Cluster Services API
- ExternalDNS
- AWS Route 53
- Prometheus federation
- Fluent Bit

## Sources Consulted
- KubeFed user guide: https://github.com/kubernetes-retired/kubefed/blob/master/docs/userguide.md
- KubeFed Helm chart documentation: https://github.com/kubernetes-retired/kubefed/blob/master/charts/kubefed/README.md
- KubeFed release artifacts: https://github.com/kubernetes-retired/kubefed/releases
- SIG Multicluster KubeFed archival notice: https://multicluster.sigs.k8s.io/blog/2022/2022-11-16_archiving-kubefed-on-jan-3-2023/
- Submariner subctl documentation: https://submariner.io/operations/deployment/subctl/
- Submariner deployment documentation: https://submariner.io/operations/deployment/
- SIG Multicluster Services API overview: https://multicluster.sigs.k8s.io/concepts/multicluster-services-api/
- SIG Multicluster ServiceExport reference: https://multicluster.sigs.k8s.io/api-types/service-export/
- MCS API ServiceExport and ServiceImport CRDs: https://github.com/kubernetes-sigs/mcs-api/tree/master/config/crd
- ExternalDNS CRD source documentation: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/sources/crd.md
- ExternalDNS AWS provider source for Route 53 provider-specific fields: https://github.com/kubernetes-sigs/external-dns/blob/master/provider/aws/aws.go
- AWS Route 53 geolocation record documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-geo.html
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Fluent Bit record_modifier filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/record-modifier

## Issues Found
- KubeFed was presented as current full-federation tooling. Updated the option table and added an explicit archival warning because SIG Multicluster archived KubeFed in 2023.
- The KubeFed Helm install did not pin the chart version and used the old repository path. Updated the chart repository to the retired project path and added `--version ${VERSION}`.
- The macOS install command used `brew install kubefedctl`, but no current Homebrew formula is documented. Replaced it with the official release tarball pattern for macOS Intel.
- The FederatedConfigMap override attempted to add a new `REGION` key without an explicit JSON patch `add` operation. Added `op: add` to each cluster override.
- The Multi-Cluster Services examples used the older `multicluster.x-k8s.io/v1alpha1` API. Updated ServiceExport and ServiceImport examples to `v1beta1`, matching the current storage version in the MCS API CRDs.
- The ServiceImport section implied users manually import services. Clarified that ServiceImport is normally created by the multi-cluster service controller.
- The active-passive failover script patched two override entries, but the preceding FederatedDeployment only defined one override. Added an explicit primary-cluster override so the patch paths match the example resource.

## Review Notes
KubeFed remains technically usable for legacy or experimental deployments, but it is archived and should not be recommended as the default choice for new production multi-cluster platforms. Some examples are necessarily illustrative and still require environment-specific values such as kubeconfig paths, cluster IDs, DNS targets, Route 53 zone IDs, and cloud networking settings.
