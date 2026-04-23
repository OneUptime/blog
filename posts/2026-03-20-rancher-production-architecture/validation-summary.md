# Validation Summary: How to Design Rancher Architecture for Production - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Fleet
- RKE2
- Kubernetes
- NetworkPolicy
- Pod Security Admission / Pod Security Standards
- PodDisruptionBudget
- Prometheus Operator / PrometheusRule
- cert-manager
- `kubectl`
- `jq`

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Machine Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/downstream-cluster-configuration/machine-configuration
- Rancher EC2 Machine Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/downstream-cluster-configuration/machine-configuration/amazon-ec2
- Rancher How Resource Quotas Work in Rancher Projects: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher Webhook Reference: https://ranchermanager.docs.rancher.com/v2.8/reference-guides/rancher-webhook
- Fleet GitRepo Resource: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Well-Known Labels, Annotations and Taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes Pod Security Policies: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Specifying a PodDisruptionBudget for your Application: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes JSONPath Support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Prometheus Operator API Reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator Alerting Routes: https://prometheus-operator.dev/docs/developer/alerting/
- cert-manager API Reference: https://cert-manager.io/docs/reference/api-docs/

## Issues Found
- The Rancher cluster provisioning example used `AWSNodeTemplate`, which is not the current machine config kind for Rancher-provisioned RKE2 machine pools. I changed both machine config references to `Amazonec2Config` and added `cloudCredentialSecretName`, which Rancher documents in its cluster config examples for machine-provisioned clusters.
- The namespace section used `field.cattle.io/projectId` as a label and omitted the required `clusterID:projectID` format. I changed this to a separate `kubectl annotate namespace ... field.cattle.io/projectId=YOUR_CLUSTER_ID:YOUR_PROJECT_ID` command, which matches Rancher’s documented project-assignment workflow for namespaces created with `kubectl`.
- The section title `Namespace Hierarchy` was technically misleading because Kubernetes namespaces are flat and cannot be nested. I changed the heading to `Namespace Organization`.
- The NetworkPolicy example depended on ad hoc namespace labels and would break typical name resolution under a default-deny egress policy. I changed the namespace selectors to use the built-in `kubernetes.io/metadata.name` label and added explicit DNS egress on TCP/UDP 53 to `kube-system`.
- The pod security snippet comment referred to `pod-security-policy.yaml`, which is misleading because PodSecurityPolicy was removed in Kubernetes v1.25 and the manifest actually contains a PodDisruptionBudget plus namespace-level Pod Security Admission labels. I renamed the example file comment to `pod-security-and-availability.yaml`.
- The monthly audit script iterated over the header row from `kubectl get namespaces`, which could produce a bogus namespace lookup. I changed it to JSONPath-based namespace enumeration with safe shell quoting.
- The privileged-pod audit used a fragile `jq` selector that could duplicate matches and ignored init and ephemeral containers. I replaced it with a safe `any(...)`-based query across regular, init, and ephemeral containers.
- The certificate audit assumed cert-manager CRDs were always installed. I added a fallback message so the script remains usable when the `Certificate` CRD is absent.

## Review Notes
- The `Amazonec2Config` names and the `cloudCredentialSecretName` in the Rancher provisioning example are still placeholders; they must refer to real objects in the target Rancher environment.
- The PrometheusRule manifest is valid for the `monitoring.coreos.com/v1` API, but whether Rancher Monitoring evaluates it depends on the Prometheus instance’s `ruleSelector` configuration.
- The NetworkPolicy examples assume a CNI that enforces Kubernetes NetworkPolicy semantics.
- The `kubectl get certificates` check is only applicable when cert-manager is installed; the post now handles that case gracefully.
