# Validation Summary: How to Set Up Storage Quotas in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- ResourceQuota
- LimitRange
- PersistentVolumeClaim
- StorageClass
- Prometheus Operator
- kube-state-metrics
- OPA Gatekeeper

## Sources Consulted
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Limit Storage Consumption: https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/
- Kubernetes Configure Quotas for API Objects: https://kubernetes.io/docs/tasks/administer-cluster/quota-api-object/
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/
- Kubernetes CEL reference: https://kubernetes.io/docs/reference/using-api/cel/
- Rancher Project Resource Quotas: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas
- Rancher Resource Quota Type Reference: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/resource-quota-types
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Gatekeeper Constraint Templates: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper integration with Kubernetes Validating Admission Policy: https://open-policy-agent.github.io/gatekeeper/website/docs/validating-admission-policy/
- kube-state-metrics ResourceQuota metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md

## Issues Found
- The LimitRange example claimed PVC sizes could default via `default` and `defaultRequest`. I removed those fields and corrected the explanation because the official Kubernetes storage quota guidance documents PVC min/max enforcement, not default PVC sizing.
- The Rancher UI instructions used the wrong storage quota label and overstated how project quotas are applied. I corrected the UI path and terminology to match Rancher's current `Storage Reservation`, `Project Limit`, and `Namespace Default Limit` behavior.
- The Gatekeeper example was incorrect as written because the Rego never compared the requested size to the configured maximum and would not enforce the intended rule. I replaced it with a current CEL-based Gatekeeper template that performs quantity comparison and added the relevant version caveat.
- The quota-exceeded troubleshooting step told readers to describe a PVC that would not exist after an admission-time quota rejection. I changed it to show the error returned by `kubectl apply`, then review the quota directly.
- The reporting script only read the first `ResourceQuota` in each namespace, which is incorrect when multiple quota objects exist. I changed the script to report each quota object explicitly.
- The PrometheusRule example depends on Rancher Monitoring or another Prometheus Operator installation. I clarified that prerequisite in the step text.

## Review Notes
- Rancher UI labels and navigation can vary slightly by release, but the corrected flow matches the current Rancher Manager documentation reviewed on 2026-05-07.
- The Gatekeeper example now depends on Gatekeeper v3.18+ and Kubernetes v1.30+ because it uses Gatekeeper's CEL-based native validation path and Kubernetes quantity functions.
- The alert expressions rely on `kube_resourcequota` metrics from kube-state-metrics.
