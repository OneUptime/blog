# Validation Summary: How to Create Ephemeral Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments, RBAC, CustomResourceDefinitions, Namespaces, Ingress, Jobs, CronJobs, ResourceQuota, LimitRange
- Go Kubernetes controllers and controller-runtime reconciliation patterns
- GitHub pull request webhooks and GitHub Actions
- Google Cloud SDK authentication in GitHub Actions
- GitLab CI review environments and dotenv artifacts
- PrometheusRule alerts and kube-state-metrics
- Docker Buildx and container registry publishing

## Sources Consulted
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Jobs and TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/ and https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- kube-state-metrics namespace metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/namespace-metrics.md
- Google GitHub Actions setup-gcloud documentation: https://github.com/google-github-actions/setup-gcloud
- Google GitHub Actions auth documentation: https://github.com/google-github-actions/auth
- Docker build-push-action documentation: https://github.com/docker/build-push-action
- GitLab CI environments documentation: https://docs.gitlab.com/ci/environments/
- GitLab dotenv artifacts documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/#artifactsreportsdotenv

## Issues Found
- The CRD schema omitted `spec.commitSHA`, even though the Go and CI examples set that field. Added it so Kubernetes structural schema pruning does not drop the value.
- The CRD status schema omitted `status.prClosed`, even though the cleanup controller reads it. Added the boolean field.
- The CRD timestamp fields were plain strings while later examples use them as timestamps. Added `format: date-time` to `createdAt` and `expiresAt`.
- The controller reconcile snippet returned an error for deleted custom resources. Updated it to ignore Kubernetes `NotFound` errors, which is the standard controller-runtime reconciliation behavior.
- The Ingress example used the legacy `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName`, which is the current Kubernetes field.
- The cleanup controller snippet used `log.Printf` without importing `log` and imported `metav1` without using it. Fixed the imports.
- The cleanup resource list used the `pvc` short name in generic cleanup code. Changed it to `persistentvolumeclaims` for the full Kubernetes resource name.
- The cost calculator divided by `hours` without guarding against newly created environments with near-zero duration. Added a minimum duration guard before calculating hourly cost.
- The GitHub Actions workflow used the obsolete `service_account_key` input on `google-github-actions/setup-gcloud`. Updated it to authenticate with `google-github-actions/auth@v3` using `credentials_json`, then run `setup-gcloud@v3`.
- The Prometheus cost recording rule multiplied a cumulative CPU counter directly. Changed it to use `rate(container_cpu_usage_seconds_total[1h])` and memory working set gauges.
- The namespace stuck alert filtered labels directly on `kube_namespace_created` and `kube_namespace_status_phase`, but kube-state-metrics exposes custom namespace labels on `kube_namespace_labels`. Updated the PromQL to join against `kube_namespace_labels{label_ephemeral="true"}`.

## Review Notes
The Go snippets are still illustrative and omit local project types such as `EphemeralEnvironment`, `K8sClient`, `Config`, and helper methods. That is acceptable for the guide, but a production implementation would need generated CRD client types, idempotent create/update handling, webhook signature verification, and tighter secret handling.
