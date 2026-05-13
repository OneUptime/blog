# Validation Summary: How to Configure SOPS Audit Logging for Secret Access in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SOPS
- Flux
- Kubernetes audit logging
- Kubernetes Events and RBAC
- Git and GitHub Actions
- AWS EKS, AWS KMS, and CloudTrail
- GKE, Google Cloud Logging, and Cloud KMS
- Azure Key Vault diagnostics
- Fluent Bit

## Sources Consulted
- SOPS README, Auditing: https://github.com/getsops/sops#218-auditing
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification Controller Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Amazon EKS control plane logging documentation: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- AWS KMS CloudTrail logging documentation: https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html
- GKE audit logging documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/audit-logging
- Google Cloud KMS audit logging documentation: https://cloud.google.com/kms/docs/audit-logging
- Azure Key Vault logging documentation: https://learn.microsoft.com/en-us/azure/key-vault/general/howto-logging

## Issues Found
- The SOPS audit logging example used an unsupported file backend and a `SOPS_AUDIT_LOG` environment variable. SOPS audit logging uses `/etc/sops/audit.yaml` and PostgreSQL backends, so the configuration and explanation were corrected.
- The SOPS audit log contents were described as including encryption keys used. Official SOPS documentation says audit records include timestamp, username, and decrypted file, so the text was corrected.
- The GKE example used `--enable-master-global-access`, which configures control plane access and does not enable audit logging. The example was replaced with a Cloud Logging query, and the text now notes that Data Access audit logs must be explicitly enabled.
- Flux events were described as including secret decryption events. Flux reconciliation events can show Kustomization activity but are not per-secret decrypt audit records, so the wording was corrected.
- The custom audit sidecar example modified the `kustomize-controller` Deployment and lacked RBAC. It was replaced with a separate read-only collector Deployment, ServiceAccount, Role, and RoleBinding.
- The Fluent Bit nested field filter used `objectRef.resource`, which is not the correct record accessor style for nested audit log fields. It was changed to `$objectRef['resource']`.
- The GCP Cloud KMS section omitted that Decrypt is a Data Access audit log. A note was added to enable Data Access audit logging for Cloud KMS.

## Review Notes
The remaining examples are operational patterns rather than a complete compliance solution. Kubernetes audit policy deployment differs by cluster distribution and managed provider, so operators should adapt the examples to their control plane and log retention requirements.
