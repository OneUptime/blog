# Validation Summary: How to Set Up Rancher for Healthcare Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes audit policies, RBAC, and NetworkPolicy
- NeuVector
- Longhorn
- Active Directory / LDAP
- Helm

## Sources Consulted
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 Default Pod Security Standards: https://docs.rke2.io/security/pod_security_standards
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 Secrets Encryption: https://docs.rke2.io/security/secrets_encryption
- Kubernetes Auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Rancher: Enabling the API Audit Log to Record System Events: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-api-audit-log
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher: Configure Active Directory (AD): https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-active-directory
- NeuVector Kubernetes deployment docs: https://open-docs.neuvector.com/deploying/kubernetes/
- NeuVector Helm chart repository: https://github.com/neuvector/neuvector-helm
- Longhorn Volume Encryption: https://longhorn.io/docs/latest/advanced-resources/security/volume-encryption/
- Longhorn Recurring Snapshots and Backups: https://longhorn.io/docs/latest/snapshots-and-backups/scheduling-backups-and-snapshots/

## Issues Found
- The post used `profile: cis-1.23` as the default RKE2 CIS profile. Current RKE2 documentation marks `cis-1.23` as deprecated for newer releases and recommends the generic `cis` profile; I updated the example and noted when `cis-1.23` is still appropriate.
- The RKE2 example implied that a custom `pod-security-admission-config-file` was required. RKE2 already applies a restricted Pod Security Admission configuration automatically when the CIS profile is enabled, so I removed that override from the example.
- The Kubernetes audit policy logged Secrets at `RequestResponse`, which would log request and response bodies. I changed the Secrets rule to `Metadata` and moved `omitStages` to the policy root so the example aligns with Kubernetes auditing guidance for sensitive resources.
- The step titled "Configure etcd Encryption at Rest" described `secrets-encryption: true`, which encrypts Kubernetes Secrets at rest rather than the entire datastore. I corrected the step title, explanatory text, and checklist wording.
- The NeuVector installation example omitted the privileged Pod Security Admission label required on PSA-enabled clusters. I added the namespace creation and labeling commands and removed the inaccurate claim that NeuVector runtime monitoring is itself HIPAA-required.
- The Longhorn encrypted StorageClass omitted additional CSI secret parameters that Longhorn documents for encrypted volumes. I added the provisioner, node-stage, and node-expand secret references and noted that the Secret must exist before the StorageClass is used.
- The Longhorn backup step implied that creating the `RecurringJob` alone was sufficient. I clarified that the S3 backup target must already be configured and that the recurring-job group must be associated with the intended healthcare volumes.
- The Rancher audit logging example used unsupported `audit-level` and `audit-log-*` keys under a ConfigMap. Rancher documents this feature via environment variables or Helm chart values, so I replaced the example with valid `auditLog` Helm values and set `destination: hostPath` so `maxAge` applies.
- The Rancher Active Directory setup path and field names were inaccurate. I updated the UI path to `Users & Authentication -> Auth Provider -> ActiveDirectory` and replaced the example fields with documented AD settings such as `Hostname`, `Port`, `User Search Base`, and `Group Search Base`.

## Review Notes
- `profile: cis` is the forward-compatible RKE2 choice on current releases; older clusters pinned to Kubernetes 1.24/1.23 may still require `cis-1.23`.
- Rancher audit-log retention settings such as `maxAge` only apply when `auditLog.destination` is set to `hostPath`; the chart default remains `sidecar`.
- HIPAA alignment still depends on administrative, physical, and procedural safeguards in addition to the platform configuration covered by this post.
