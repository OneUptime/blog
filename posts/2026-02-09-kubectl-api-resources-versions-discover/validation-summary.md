# Validation Summary: Use kubectl api-resources and api-versions to Discover Cluster Capabilities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes API discovery
- CustomResourceDefinitions
- Admission webhooks
- Metrics Server / Metrics API
- RBAC and policy resources

## Sources Consulted
- Kubernetes kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes kubectl api-versions reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-versions/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes Admission Control reference: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes Resource metrics pipeline: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes API reference v1.36: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/

## Issues Found
- `kubectl api-resources` was described as listing every resource type by default. Current kubectl documentation shows the default `--namespaced` behavior returns namespaced resources, so the post now says it lists namespaced resources and notes `--namespaced=false` for cluster-scoped resources.
- Several examples tried to discover cluster-scoped resources using default `kubectl api-resources` output. Updated examples for nodes, webhook configurations, storage resources, RBAC resources, and policy resources to use `--namespaced=false` where needed.
- The cluster comparison script only captured default namespaced resource names. Updated it to capture both namespaced and cluster-scoped resources before sorting and comparing.
- `kubectl version --short` is not listed in the current generated kubectl version reference. Replaced it with `kubectl version`.
- The post suggested `grep beta` checks for deprecated API versions. Changed the wording to say beta APIs should be reviewed for deprecation risk, because beta does not always mean currently deprecated.
- The CronJob compatibility script fell back to `batch/v1beta1`, which the Kubernetes deprecation guide says is no longer served as of Kubernetes v1.25. Updated the example to require stable `batch/v1` and fail clearly if it is unavailable.
- The webhook section implied webhook API resources reveal active admission controllers. Updated it to distinguish registered webhook configuration objects from enabled API server admission plugins.
- The policy section referred to Pod Security Standards as a resource. Updated it to reference ValidatingAdmissionPolicy instead.
- Example output comments used comma-separated formatting that does not match kubectl table output. Adjusted the affected examples to space-separated table-style output.

## Review Notes
Local `kubectl` was not installed in the review environment, so command validation was performed against the current official generated Kubernetes kubectl reference and related official Kubernetes documentation.
