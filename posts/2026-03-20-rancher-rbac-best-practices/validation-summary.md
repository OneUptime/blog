# Validation Summary: How to Implement RBAC Best Practices in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- Fleet
- RBAC and project-scoped access control in Rancher
- ResourceQuota and LimitRange
- NetworkPolicy
- Pod Security Standards / Pod Security Admission
- PodDisruptionBudget
- PrometheusRule / Rancher Monitoring
- cert-manager
- Bash, `kubectl`, and `jq`

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Projects workflow: https://ranchermanager.docs.rancher.com/api/workflows/projects
- Rancher Namespaces: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-namespaces
- Rancher Project Resource Quotas: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Fleet GitRepo Resource: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet Create a GitRepo Resource: https://fleet.rancher.io/how-tos-for-users/gitrepo-add
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Disruptions / PodDisruptionBudget: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Pod Security Standards with namespace labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes JSONPath Support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- cert-manager Certificate resource: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The RKE2 provisioning example used `AWSNodeTemplate`, which is not the machine config reference kind shown in current Rancher RKE2 cluster YAML examples. I changed both `machineConfigRef.kind` values to `Amazonec2Config` and updated the referenced names accordingly.
- The namespace-to-project example used `field.cattle.io/projectId` as a label. Rancher documents this as a namespace annotation for `kubectl`-managed project assignment, so I split the example into a normal `kubectl label` command and a `kubectl annotate` command using the required `CLUSTER_ID:PROJECT_ID` format.
- The Pod Security section described a `PodDisruptionBudget` example as if it were a pod security policy. A PDB is an availability control, so I corrected the wording and the filename comment to reflect that the snippet combines availability and pod security configuration.
- The audit script parsed `kubectl get namespaces` tabular output directly, which includes a header row and can report a false namespace named `NAME`. I changed the loop to consume JSONPath output and quote the namespace variable.
- The certificate audit command assumed the `certificates` CRD exists everywhere and used brittle column selection. I changed it to JSONPath output and added a fallback message when cert-manager is not installed.
- The privileged-pod audit query could emit duplicate results and ignored init and ephemeral containers. I updated the `jq` expression to use `any(...)` across all container lists.

## Review Notes
- The post is technically correct after the fixes above.
- The `NetworkPolicy` examples still assume the cluster uses a CNI implementation that enforces Kubernetes `NetworkPolicy` objects.
- The `PrometheusRule` example assumes Rancher Monitoring / Prometheus Operator CRDs are installed in the cluster.
- The article title is RBAC-focused, but several sections are broader Rancher and Kubernetes hardening practices rather than RBAC-specific controls.
