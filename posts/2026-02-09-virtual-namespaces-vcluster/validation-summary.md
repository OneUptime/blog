# Validation Summary: How to Use Virtual Namespaces with vcluster for Strong Isolation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes namespaces and RBAC
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota and LimitRange
- Kubernetes Pod Security Standards
- vCluster CLI
- vCluster configuration (`vcluster.yaml` / Helm values)
- Prometheus Kubernetes service discovery
- Go client-go

## Sources Consulted
- vCluster quick start and CLI installation docs: https://www.vcluster.com/docs/vcluster
- vCluster CLI help from vcluster 0.34.1 (`vcluster create`, `vcluster connect`, `vcluster list`, `vcluster disconnect`)
- vCluster configuration reference: https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/
- vCluster sync configuration docs: https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/
- vCluster Pod Security Standard policy docs: https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies/pod-security-standard
- vCluster ResourceQuota policy docs: https://www.vcluster.com/docs/vcluster/0.20.0/configure/vcluster-yaml/policies/resource-quota
- vCluster chart values and JSON schema: https://github.com/loft-sh/vcluster/tree/main/chart
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange docs: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Pod Security Standards docs: https://kubernetes.io/docs/concepts/security/pod-security-standards/

## Issues Found
- The installation command scraped the GitHub release page HTML, which is brittle and not the official documented Linux install path. Replaced it with the official direct `releases/latest/download/vcluster-linux-amd64` command using `sudo install`.
- The namespace/RBAC explanation overstated what a namespace administrator can do by default. Updated it to clarify that broad cluster-scoped RBAC or misconfigured permissions are what allow listing namespaces and seeing cluster-wide resources.
- The custom vCluster configuration used outdated/incorrect keys such as `syncer`, top-level `vcluster`, `isolation`, top-level `coredns`, top-level `networkPolicies`, and `sync.services`. Updated the example to current `controlPlane`, `policies`, and `sync.toHost` paths.
- The CoreDNS, persistence, resource, and TLS SAN settings were under old paths. Moved them to `controlPlane.coredns`, `controlPlane.statefulSet.persistence.volumeClaim`, `controlPlane.statefulSet.resources`, and `controlPlane.proxy.extraSANs`.
- The network policy used `namespaceSelector.matchLabels.name`, which is not the standard automatic namespace-name label. Replaced it with `kubernetes.io/metadata.name`.
- The network policy's "external services" egress rule used `namespaceSelector: {}`, which selects pods in namespaces rather than external IP destinations. Replaced it with an `ipBlock` rule for public HTTPS egress while excluding common private CIDR ranges.
- The DNS egress rule only allowed UDP/53. Added TCP/53 because Kubernetes DNS clients may use TCP for some DNS responses.

## Review Notes
The vCluster CLI commands and flags used in the post (`create`, `list`, `connect`, `disconnect`, `--namespace`, `--values`, `--expose`, and `--connect=false`) are valid in vcluster 0.34.1. The Go provisioner is illustrative and syntactically reasonable, but a production controller should handle already-existing namespaces, avoid shelling out where possible, and use a reconciler pattern with explicit RBAC and error handling.
