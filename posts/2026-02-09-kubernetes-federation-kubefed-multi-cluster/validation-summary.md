# Validation Summary: Set Up Kubernetes Federation v2 with KubeFed for Multi-Cluster Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- KubeFed / Kubernetes Federation v2
- kubefedctl
- Helm
- ExternalDNS
- Kubernetes Services, Deployments, ConfigMaps, Secrets, and Namespaces

## Sources Consulted
- KubeFed archived GitHub repository: https://github.com/kubernetes-retired/kubefed
- KubeFed user guide: https://github.com/kubernetes-sigs/kubefed/blob/master/docs/userguide.md
- KubeFed cluster registration documentation: https://github.com/kubernetes-sigs/kubefed/blob/master/docs/cluster-registration.md
- KubeFed Helm chart README: https://github.com/kubernetes-sigs/kubefed/blob/master/charts/kubefed/README.md
- KubeFed v0.10.0 release notes: https://github.com/kubernetes-retired/kubefed/releases/tag/v0.10.0
- ExternalDNS README: https://github.com/kubernetes-sigs/external-dns
- ExternalDNS FAQ: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/faq.md
- Bitnami ExternalDNS Helm chart values: https://artifacthub.io/packages/helm/bitnami/external-dns

## Issues Found
- KubeFed is archived and no longer under active development. Added a note clarifying that the tutorial is appropriate for legacy KubeFed environments or labs, and that current SIG Multicluster projects should be evaluated for new production deployments.
- The Helm value `controllermanager.replicaCount` was not the chart value documented by KubeFed. Changed it to `controllermanager.controller.replicaCount`.
- The CRD verification command used `grep federation`, which would miss CRDs named with `federated` or `kubefed`. Changed it to `grep -E 'federated|kubefed'`.
- The `kubefedctl join` examples used the host context as the member cluster context for `cluster-2` and `cluster-3`. Changed `--cluster-context` to the matching member contexts.
- The federated namespace example applied a namespaced `FederatedNamespace` to `production` without creating that namespace on the host cluster first. Added `kubectl create namespace production --context cluster-1`.
- The placement selector example specified both `spec.placement.clusters` and `spec.placement.clusterSelector`. KubeFed ignores `clusterSelector` when `clusters` is provided, so the selector would not behave as described. Removed the explicit cluster list from that example.
- The DNS section described seamless failover from KubeFed and ExternalDNS alone. Changed the wording to explain that KubeFed propagates ExternalDNS annotations and that DNS provider health checks or routing policies are still needed for automatic failover.
- Updated the ExternalDNS hostname annotation from the older `external-dns.alpha.kubernetes.io/hostname` form to `external-dns.kubernetes.io/hostname`.
- The ExternalDNS Helm commands did not add the Bitnami repository, did not target individual cluster contexts, and did not set distinct TXT owner IDs. Added the repository setup, `--kube-context` values, and per-cluster `txtOwnerId` values.
- The propagation status example showed `status: Synced` under each cluster, which is not how KubeFed documents successful propagation status. Removed those fields and added `lastUpdateTime` to match the documented status shape.

## Review Notes
KubeFed v0.10.0 exists as a pre-release, while the archived repository page still marks v0.9.2 as latest. The post uses v0.10.0 for `kubefedctl`, which is plausible because that release includes Kubernetes `networking.k8s.io/v1` Ingress propagation support, but the project archival status should be considered a major caveat for production use.
