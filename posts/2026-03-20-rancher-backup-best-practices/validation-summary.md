# Validation Summary: How to Implement Backup Best Practices in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE2 cluster provisioning
- Fleet GitOps
- NetworkPolicy
- Pod Security Standards
- PodDisruptionBudget
- Prometheus Operator
- cert-manager
- `kubectl`
- `jq`

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Projects workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher Node Template Configuration: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/downstream-cluster-configuration/node-template-configuration
- Fleet GitRepo Resource reference: https://fleet.rancher.io/0.10/ref-gitrepo
- Fleet Mapping to Downstream Clusters: https://fleet.rancher.io/0.10/gitrepo-targets
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Standards via namespace labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes PodDisruptionBudget configuration: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Annotations: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- Rancher cluster backup documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher-launched-kubernetes-clusters

## Issues Found
- The cluster provisioning example used `AWSNodeTemplate` inside a `provisioning.cattle.io/v1` cluster spec. I changed both machine pool references to `Amazonec2Config`, which is the current machine configuration kind used in Rancher provisioning examples for RKE2 clusters.
- The namespace example incorrectly used `field.cattle.io/projectId` as a label. I changed it to a separate `kubectl annotate namespace ... field.cattle.io/projectId=YOUR_CLUSTER_ID:YOUR_PROJECT_ID` command because Rancher documents project assignment as a namespace annotation, and the documented value format contains a colon that does not belong in a label value.
- The pod security section used the filename comment `pod-security-policy.yaml`, which is misleading because the example is not a `PodSecurityPolicy` resource. I renamed the section heading and filename comment to reflect that the example actually combines Pod Security Standards namespace labels with a PodDisruptionBudget for availability.
- The audit script iterated over `kubectl get namespaces` human-readable output. That would include the header row and can try to query a namespace literally named `NAME`. I changed it to use a JSONPath list of namespace names and quoted the namespace variable in the pod query.
- The certificate audit command assumed the cert-manager `Certificate` CRD exists everywhere. I kept the check but added a graceful fallback message when cert-manager is not installed.
- The `jq` filter for privileged pods could emit duplicate pod names when multiple containers matched and did not inspect init or ephemeral containers. I replaced it with a single filter that checks regular, init, and ephemeral containers without duplicating results.

## Review Notes
- The corrected code and manifests are technically valid, but the body of the post is mostly about general Rancher and Kubernetes operational governance, not backup-specific procedures. Rancher's official backup documentation covers etcd snapshots and Rancher backup/restore workflows separately.
