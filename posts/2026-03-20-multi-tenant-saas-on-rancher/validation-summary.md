# Validation Summary: How to Set Up Multi-Tenant SaaS Platform on Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (multi-cluster management)
- Kubernetes (Namespaces, ResourceQuota, NetworkPolicy, Ingress, PersistentVolumeClaim, StorageClass)
- Pod Security Admission (PSA labels)
- nginx-ingress
- Longhorn (storage with encryption)
- Velero (backup / TTL)
- Prometheus / prometheus-operator (PrometheusRule CRD, cAdvisor metrics)
- Bash + Python (provisioning scripts)

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota reference: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Pod Security Admission labels: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Automatic `kubernetes.io/metadata.name` namespace label (Kubernetes 1.22+): https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Ingress / ingressClassName: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Longhorn StorageClass parameters (`numberOfReplicas`, `encrypted`): https://longhorn.io/docs/1.6.0/references/storage-class-parameters/
- Velero `backup create --ttl` (Go duration format `24h0m0s`): https://velero.io/docs/v1.13/how-velero-works/
- prometheus-operator PrometheusRule CRD: https://prometheus-operator.dev/docs/operator/api/
- cAdvisor metrics (`container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`): https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- **Velero `--ttl` units bug (Step 5).** The off-board script passed `--ttl "${retention_days}h"`, which treats the `retention_days` value as hours, not days (e.g., a 30-day retention would actually expire in 30 hours). Velero's `--ttl` uses Go duration format (`24h0m0s`) and does not accept a `d` suffix. Changed to `--ttl "$((retention_days * 24))h"` and added a short comment explaining the unit conversion.

## Review Notes
- The DNS egress rule in the NetworkPolicy only opens UDP/53. In practice TCP/53 is also used (large responses, DNS-over-TCP fallback); most production NetworkPolicies allow both. Left as-is since the post is illustrative and UDP-only DNS still works for typical CoreDNS lookups.
- The PVC in Step 4 references `storageClassName: tenant-storage` while the example StorageClass below it is named `tenant-storage-encrypted`. They are presented as two independent illustrative snippets (the comment marks each as a separate example), so the names don't have to match — left as-is.
- The NetworkPolicy ingress rule allows traffic from `ingress-nginx` to port 8080 on the tenant pods. This is just an example app port; real deployments should match whatever port the workload exposes.
- `pod-security.kubernetes.io/enforce: restricted` is the strictest PSA level and may break workloads that need privileges; tenants should test against `baseline` first if needed. Not an error, just a deployment caveat.
- Conclusion contains a hyphen where an em dash would read more naturally ("dedicated clusters-Rancher's"), but this is stylistic, not technical.
