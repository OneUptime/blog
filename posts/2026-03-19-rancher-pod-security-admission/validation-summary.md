# Validation Summary: How to Configure Pod Security Admission in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Pod Security Admission (PSA)
- Pod Security Standards (PSS)
- RKE2
- kubectl
- jq
- YAML
- Bash

## Sources Consulted
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Admission labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes audit annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/
- Kubernetes Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes Enforce Pod Security Standards by Configuring the Built-in Admission Controller: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes Admission Controllers reference: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Rancher Pod Security Admission (PSA) Configuration Templates: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/psa-config-templates
- Rancher Pod Security Standards (PSS) & Pod Security Admission (PSA): https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/pod-security-standards
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher sample PodSecurityConfiguration exemptions: https://ranchermanager.docs.rancher.com/reference-guides/rancher-security/psa-restricted-exemptions
- Rancher project resource quotas guide for `field.cattle.io/projectId`: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- RKE2 Default Pod Security Standards: https://docs.rke2.io/security/pod_security_standards
- Rancher Enabling the API Audit Log in Downstream Clusters: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-api-audit-log-in-downstream-clusters

## Issues Found
- The introduction implied PSA only started in Kubernetes 1.25. I corrected this to say PSP was removed in Kubernetes 1.25 and PSA is the built-in replacement, which matches official Kubernetes documentation.
- The prerequisite said Rancher v2.7+. I updated it to Rancher v2.7.2+ because Rancher's PSA configuration templates are documented as available starting in v2.7.2.
- `kubectl version --short` is not in the current official `kubectl version` reference. I replaced it with `kubectl version`.
- The initial PSA check only looked for `enforce` labels and described this as verifying whether PSA was enabled. I changed it to list `enforce`, `audit`, and `warn` labels so it actually shows existing namespace PSA configuration.
- The Rancher UI section implied PSA was managed on both projects and namespaces through a dedicated PSA UI. I corrected it to the supported namespace label editing workflow in Rancher.
- The cluster-level Rancher guidance incorrectly suggested adding only a `kube-apiserver-arg` for an admission config file under `machineGlobalConfig`. I replaced this with Rancher's supported cluster-level PSA template workflow and the correct cluster YAML field `defaultPodSecurityAdmissionConfigurationTemplateName`.
- The project automation script used `PROJECT_NAMESPACE` for a value that is actually the Rancher cluster ID portion of `field.cattle.io/projectId`. I renamed it to `CLUSTER_ID` to match the documented annotation format.
- The compliant test pod used `nginx` with a non-root, no-capabilities security context. That can be admitted by PSA but may not run cleanly because the image normally expects to bind to port 80. I replaced it with a `busybox` sleep example that better fits the stated test.
- The system namespace exemption section used a short list of namespace labels, which was incomplete for Rancher and did not match Rancher's documented use of template exemptions. I updated it to explain `exemptions.namespaces` and note that the exact list depends on installed Rancher features and add-ons.
- The rollout section called Phase 1 "Audit only" while the command actually enabled both `audit` and `warn`. I corrected the phase name and replaced the review commands with a supported warning check and a server-side dry run preview.
- The monitoring section incorrectly tried to read `pod-security.kubernetes.io/audit-violations` from pod annotations and suggested scraping `kube-apiserver` logs via `kubectl logs`. I replaced it with an RKE2 audit-log check that matches the official PSA audit annotation behavior when API audit logging is enabled.
- The best-practices and conclusion text still reflected the original, inaccurate rollout and exemption guidance. I updated them to match the corrected PSA workflow.

## Review Notes
- The post still uses `latest` for PSA policy versions. That is valid, but pinning to a specific Kubernetes minor version such as `v1.35` can make behavior more predictable during upgrades.
- The Step 9 monitoring example assumes API audit logging is already enabled. Without audit logging, `warn` output and `kubectl label --dry-run=server` are the most portable ways to inspect likely PSA violations.
- The post targets Kubernetes 1.25+ only. That matters because `pod-security.admission.config.k8s.io/v1` applies to 1.25+, while 1.23 and 1.24 require `v1beta1`.
