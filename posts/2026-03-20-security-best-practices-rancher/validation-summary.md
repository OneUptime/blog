# Validation Summary: How to Implement Security Best Practices in Rancher - A Practical Guide

## Status
validated

## Post Type
Practical guide / Tutorial

## Technologies Covered
- Rancher Manager RBAC and RoleTemplate custom resources
- Kubernetes RBAC, Pod Security Admission, NetworkPolicy, audit policy, and encryption at rest
- RKE2 server configuration, secrets encryption, and audit logging
- Trivy Operator and Helm
- Rancher Compliance / Compliance Operator
- Falco, Harbor, and external secrets management as checklist items

## Sources Consulted
- Rancher Custom Roles documentation: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/custom-roles
- Rancher API reference for `management.cattle.io/v3` `RoleTemplate`: https://ranchermanager.docs.rancher.com/v2.12/api/api-reference
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- RKE2 Secrets Encryption documentation: https://documentation.suse.com/cloudnative/rke2/latest/en/security/secrets_encryption.html
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- Trivy Operator Helm installation documentation: https://aquasecurity.github.io/trivy-operator/latest/getting-started/installation/helm/
- Trivy Operator static manifest documentation: https://aquasecurity.github.io/trivy-operator/latest/getting-started/installation/kubectl/
- Rancher Compliance scan run guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan
- Rancher Compliance scan configuration reference: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans/configuration-reference
- Rancher Compliance chart profile templates: https://github.com/rancher/charts/tree/dev-v2.14/charts/rancher-compliance

## Issues Found
1. **Invalid Rancher `RoleTemplate` manifest shape.** The post placed `displayName`, `rules`, and related fields under `spec`, but Rancher `RoleTemplate` fields are top-level fields in the `management.cattle.io/v3` API. Moved them to the top level and added `context: project` so the role is actually a project/namespace role.
2. **Over-broad RBAC rule grouping.** The original `RoleTemplate` grouped core, `apps`, and `batch` API groups into one rule. Split the rule by API group so pods/services, deployments, and jobs are granted precisely.
3. **Duplicate and misleading Trivy Operator install instructions.** The post installed Trivy Operator with a static manifest and then with Helm, and described this as scanning "on image push." Replaced it with a single Helm-based install, added the required Aqua Helm repository commands, and described the behavior as in-cluster workload scanning.
4. **Non-native RKE2 secrets encryption configuration.** The post manually wrote a Kubernetes encryption provider config and passed it via `kube-apiserver-arg`. Current RKE2 manages the encryption config automatically and exposes `rke2 secrets-encrypt` plus `secrets-encryption-provider`. Updated the snippet to verify encryption status and optionally set the provider.
5. **Audit log path and policy coverage.** Updated the RKE2 audit log path to the documented RKE2 location, moved the `system:kube-proxy` suppression rule before broader rules, and added `clusterrolebindings` to the RBAC audit resources.
6. **Outdated Rancher compliance scan API and profile name.** The post used the older `cis.cattle.io/v1` API group and `rke2-cis-1.24-profile`, which are not current for the latest Rancher Compliance app. Updated the example to `compliance.cattle.io/v1`, `clusterscanprofiles.compliance.cattle.io`, and the current `rke2-cis-1.11-profile`.
7. **Imprecise Rancher UI path and conclusion wording.** Updated the scan UI path to `Compliance > Scan` and changed "CIS Rancher Benchmark profile" to "Rancher Compliance profiles" to match current Rancher terminology.

## Review Notes
- The Pod Security Admission namespace labels, restricted-compatible pod security context, and NetworkPolicy examples are technically valid for current Kubernetes.
- The audit policy is intentionally selective; production environments should tune audit volume and forward the resulting log to their SIEM as the checklist already recommends.
- The CIS profile in the kubectl example is current for recent RKE2/Rancher Compliance charts, but operators should use the added `kubectl get clusterscanprofiles.compliance.cattle.io` command to select the profile that matches their installed chart and Kubernetes/RKE2 version.
