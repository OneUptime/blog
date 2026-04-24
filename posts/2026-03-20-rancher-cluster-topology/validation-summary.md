# Validation Summary: How to Plan Cluster Topology in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2 cluster provisioning
- Fleet GitOps
- Kubernetes namespaces
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes NetworkPolicy
- Pod Security Standards
- PodDisruptionBudget
- Prometheus Operator
- cert-manager

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher native CAPI provisioning examples for `provisioning.cattle.io/v1` clusters: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/capi-infrastructure-providers
- Rancher Projects API workflow, including namespace project assignment with `field.cattle.io/projectId`: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher project resource quota behavior for namespaces created via `kubectl`: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher Continuous Delivery / Fleet overview: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/fleet/overview
- Fleet GitRepo resource reference: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet target selection for downstream clusters: https://fleet.rancher.io/0.13/gitrepo-targets
- Kubernetes namespaces and the built-in `kubernetes.io/metadata.name` label: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes ResourceQuota reference: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange reference: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes NetworkPolicy concepts and examples: https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/ and https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Standards via namespace labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- Rancher monitoring architecture and PrometheusRule usage: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- cert-manager Certificate resource reference: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The Rancher cluster manifest mixed an RKE2 `provisioning.cattle.io/v1` cluster with the deprecated RKE1-era `AWSNodeTemplate` kind. I replaced those references with `Amazonec2Config`, added the required Rancher cloud credential reference, and updated the explicit RKE2 version to a current Rancher example version so the manifest matches current Rancher provisioning docs.
- The namespace example attempted to assign a Rancher project by label. I split that into standard Kubernetes labels plus the correct `field.cattle.io/projectId` annotation, which is the supported Rancher mechanism for project assignment.
- The NetworkPolicy example relied on ad hoc namespace labels and would have broken common name resolution once default-deny egress was applied. I changed the namespace selectors to use the built-in `kubernetes.io/metadata.name` label, added explicit protocols, and added DNS egress to `kube-dns`.
- The Pod Security section used the filename `pod-security-policy.yaml` even though the manifest was not a PodSecurityPolicy and PSP has been removed since Kubernetes v1.25. I renamed the example file comment to avoid that incorrect implication.
- The audit script used `kubectl get namespaces` table output in a loop, which would read the header and mis-handle empty namespaces. I changed it to JSONPath-based namespace enumeration and switched the pod count to `-o name` so empty namespaces are counted correctly.
- The audit script assumed cert-manager resources were always present and used a brittle certificate status column. I changed the check to explicitly query `certificates.cert-manager.io` and added a fallback message when cert-manager is not installed.
- The `jq` filter for privileged containers was unsafe when `securityContext` was absent. I updated it to use `any(...[]?; .securityContext?.privileged == true)` and added a fallback message when `jq` is unavailable.

## Review Notes
- NetworkPolicy enforcement depends on using a CNI plugin that implements Kubernetes NetworkPolicy semantics.
- The `PrometheusRule` example is syntactically valid, but real deployments should scope alert expressions to specific jobs, services, or namespaces rather than using cluster-wide aggregates.
- The certificate audit step is cert-manager-specific; clusters using a different certificate automation stack need a different check.
- Explicit Rancher and RKE2 version strings in provisioning examples should be revalidated periodically against currently supported releases.
