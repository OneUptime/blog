# Validation Summary: How to Implement GitOps Best Practices with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Fleet
- RKE2 cluster provisioning
- Kubernetes namespaces, ResourceQuota, LimitRange, NetworkPolicy, PodDisruptionBudget, Pod Security Standards
- Prometheus Operator / PrometheusRule
- `kubectl`
- `jq`

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Projects workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher About RKE1 Templates: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates
- Fleet Mapping to Downstream Clusters: https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes PodDisruptionBudget task: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes `kubectl annotate` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The RKE2 cluster example used `AWSNodeTemplate` for `machineConfigRef.kind`, which is not the current RKE2 provisioning kind in Rancher YAML examples. Updated both machine pools to `Amazonec2Config`.
- The namespace/project example used `field.cattle.io/projectId` as a label. Rancher documents this as a namespace annotation in `<cluster ID>:<project ID>` format. Split the example into `kubectl label` for normal labels and `kubectl annotate --overwrite` for the Rancher project mapping.
- The NetworkPolicy example targeted namespaces using ad hoc `app` labels that were never created in the post. Updated the selectors to use the standardized `kubernetes.io/metadata.name` namespace label so the example matches current Kubernetes guidance for exact namespace targeting.
- The pod security section referenced `pod-security-policy.yaml`, which is misleading because the example resource is a `PodDisruptionBudget`, and PodSecurityPolicy has been removed from Kubernetes. Updated the wording and filename comment to describe Pod Security Standards plus availability correctly.
- The audit script iterated over `kubectl get namespaces` without `--no-headers`, so it would treat the table header as a namespace. Updated the command to use `-o custom-columns=NAME:.metadata.name --no-headers` and added safe shell quoting.
- The privileged-pod `jq` filter only inspected `.spec.containers` and could behave poorly with missing fields or multiple privileged containers. Updated it to check standard, init, and ephemeral containers using `any(...)`.
- The final audit command used `kubectl top nodes`; changed it to the documented `kubectl top node` form.

## Review Notes
- The Pod Security Standards example is valid as written, but Kubernetes now also supports optional `pod-security.kubernetes.io/*-version` labels when you want policy behavior pinned across cluster upgrades.
- The `kubernetesVersion` in the Rancher cluster example is illustrative; in practice it should match the Rancher release's supported Kubernetes/RKE2 matrix.
- The monitoring example assumes Rancher Monitoring / Prometheus Operator is installed, and the Fleet example assumes Fleet is already configured in the management cluster.
