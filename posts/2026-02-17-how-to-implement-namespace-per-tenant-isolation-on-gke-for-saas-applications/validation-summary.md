# Validation Summary: How to Implement Namespace-Per-Tenant Isolation on GKE for SaaS Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Kubernetes namespaces
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota and LimitRange
- Kubernetes RBAC
- Workload Identity Federation for GKE
- IAM service accounts
- Pod Security Standards
- Prometheus alerting rules and kube-state-metrics
- Google Cloud Managed Service for Prometheus
- Cloud Monitoring
- Kubernetes Python client

## Sources Consulted
- GKE Dataplane V2 docs: https://cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- GKE network policy docs: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Workload Identity Federation for GKE concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Authenticate to Google Cloud APIs from GKE workloads: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE service accounts docs: https://cloud.google.com/kubernetes-engine/docs/how-to/service-accounts
- GKE system metrics docs: https://cloud.google.com/monitoring/api/metrics_kubernetes
- GKE metrics collection configuration docs: https://cloud.google.com/kubernetes-engine/docs/how-to/configure-metrics
- Managed Service for Prometheus rule evaluation docs: https://cloud.google.com/stackdriver/docs/managed-prometheus/rules-managed
- Kubernetes namespaces docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange docs: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes NetworkPolicy docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes RBAC docs: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod Security Admission docs: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Python client README: https://github.com/kubernetes-client/python
- kube-state-metrics README: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The cluster creation command combined `--enable-network-policy` with `--enable-dataplane-v2`. GKE Dataplane V2 includes network policy enforcement, and GKE rejects explicit network policy enablement on Dataplane V2 clusters. Removed `--enable-network-policy` and clarified the explanation.
- The cluster creation command used `--monitoring=SYSTEM,WORKLOAD`. Current GKE monitoring component values include `SYSTEM` and observability packages such as `POD`, `DEPLOYMENT`, and `CADVISOR`, but not `WORKLOAD`. Changed this to `--monitoring=SYSTEM` and added `--enable-managed-prometheus` for Prometheus collection.
- The post used older "Workload Identity" and "GCP service account" phrasing. Updated the section to "Workload Identity Federation for GKE" and "IAM service account" to match current Google Cloud terminology.
- The Workload Identity Federation example created an IAM service account and allowed impersonation, but did not grant the IAM service account any Google Cloud resource roles. Added a placeholder `gcloud projects add-iam-policy-binding` command for the tenant-specific role grant.
- The namespace template recommended Pod Security Standards later in the post but did not show the namespace labels used by Pod Security Admission. Added baseline enforcement with restricted audit and warn labels.
- The monitoring text said Cloud Monitoring metrics can be filtered by `namespace`. GKE system metrics use the `namespace_name` resource label in Cloud Monitoring, while Prometheus metrics commonly use `namespace`. Updated the wording.
- The Prometheus alert compared live CPU usage to the hard CPU request quota but described quota usage. Replaced the expression with a `kube_resourcequota` used-to-hard ratio for `requests.cpu` and renamed the alert to `TenantHighCPUQuotaUsage`.
- The alert-rule manifest used the Prometheus Operator `PrometheusRule` resource while the cluster command now enables Google Cloud Managed Service for Prometheus. Changed the manifest to the GKE-managed `monitoring.googleapis.com/v1` `ClusterRules` resource.
- The closing paragraph still referred to Workload Identity for GCP service isolation. Updated it to Workload Identity Federation for GKE and Google Cloud service access.

## Review Notes
The YAML snippets and Python snippet were syntax-checked locally. The local environment did not have `gcloud` or the Kubernetes Python package installed, so CLI/API behavior was verified against official documentation rather than live command help. The quota alert assumes `kube_resourcequota` is being collected, for example from kube-state-metrics into Prometheus.
