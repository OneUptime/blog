# Validation Summary: How to Set Up SOC 2 Controls with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- SOC 2 / Trust Services Criteria
- Prometheus Operator
- External Secrets Operator
- Helm
- RBAC
- Kubernetes audit logging

## Sources Consulted
- AICPA SOC 2 Trust Services Criteria overview: https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2
- Rancher authentication and global settings: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration
- Rancher API reference for `management.cattle.io/v3` resources such as `GlobalRole`: https://ranchermanager.docs.rancher.com/api/api-reference
- Rancher compliance scans overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans
- Rancher compliance scan configuration reference: https://ranchermanager.docs.rancher.com/v2.12/integrations-in-rancher/compliance-scans/configuration-reference
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes auditing docs: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- RKE2 backup and restore docs: https://docs.rke2.io/datastore/backup_restore
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 secrets encryption docs: https://docs.rke2.io/security/secrets_encryption
- RKE2 CIS hardening guide: https://docs.rke2.io/security/hardening_guide
- External Secrets Operator getting started: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator `ClusterSecretStore` reference: https://external-secrets.io/v1.0.0/api/clustersecretstore/

## Issues Found
- The post mixed current Rancher guidance with legacy CIS scan resources. Current Rancher uses Compliance scans and `compliance.cattle.io` resources in the supported docs, so I updated the prerequisite version guidance to Rancher `v2.12+`, changed the evidence collection command to use `clusterscanreports.compliance.cattle.io`, and updated the conclusion wording from CIS scanning to Compliance scans.
- The authentication comments described an outdated Rancher UI path and implied Rancher-native MFA configuration. I corrected this to the current `Users & Authentication > Auth Provider` flow and clarified that MFA is typically enforced by the external identity provider.
- The `kubectl get clusterrolebindings -A` example used `--all-namespaces` for a cluster-scoped resource. I removed `-A` so the command matches Kubernetes RBAC behavior.
- The audit logging example used a generic Kubernetes file path and did not show how to wire the policy into RKE2. I updated the policy path to `/etc/rancher/rke2/audit-policy.yaml` and added the corresponding RKE2 `config.yaml` guidance.
- The HA backup verification example would not work as written because `kubectl exec` does not support selecting a pod with `-l` in that form, and `etcdctl snapshot status` expects a snapshot file rather than a directory. I replaced it with the documented `rke2 etcd-snapshot ls` command and added the default snapshot directory path.
- The secrets-at-rest verification command did not actually verify encryption. I replaced it with `rke2 secrets-encrypt status` and documented the generated RKE2 encryption config location.
- The External Secrets example used the outdated `external-secrets.io/v1beta1` API, omitted an explicit service account reference for the cluster-scoped store, and had a broken heredoc terminator in the rendered command. I updated it to `external-secrets.io/v1`, added `serviceAccountRef`, and fixed the heredoc so the command is runnable.
- The evidence collection script used ambiguous short resource names for Prometheus Operator CRDs. I replaced them with fully qualified resource names to make the commands explicit and current.

## Review Notes
- The alerting examples are syntactically valid, but they assume `kube-state-metrics` and kube-apiserver metrics are already being scraped by Prometheus.
- The `GlobalRole` example is now intentionally scoped to Rancher management-plane resources. A fuller follow-up post could separately show how to delegate downstream-cluster access to Compliance scan CRDs.
- SOC 2 alignment is broader than the technical controls shown here; auditors will also expect documented policies, approvals, evidence retention, and control operation history.
