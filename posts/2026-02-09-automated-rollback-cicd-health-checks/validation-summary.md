# Validation Summary: Use Automated Rollback in CI/CD When Kubernetes Health Checks Fail Post-Deploy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes startup, readiness, and liveness probes
- kubectl rollout and image update commands
- GitHub Actions CI/CD workflows
- Tekton Tasks
- Prometheus HTTP API and PromQL
- Shell scripting with curl, jq, and bc

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes probe configuration documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions checkout Marketplace page: https://github.com/marketplace/actions/checkout
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus histogram and query function documentation: https://prometheus.io/docs/practices/histograms/ and https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Kubernetes Deployment manifest omitted `.spec.selector` and `.spec.template.metadata.labels`. In `apps/v1`, the selector is required and must match the pod template labels, so those fields were added.
- The GitHub Actions workflow used `actions/checkout@v3`. Updated it to the current `actions/checkout@v6` shown by the official action page.
- The `kubectl set image` examples used `--record`, which is no longer listed in the current official `kubectl set image` reference. Removed the flag.
- The Tekton Task used `tekton.dev/v1beta1`. Updated it to `tekton.dev/v1`, which is the current stable API version documented by Tekton.
- The Tekton rollout step manually wrote to a hard-coded `/tekton/steps/.../exitCode` path. Tekton documents `$(steps.<step-name>.exitCode.path)` for accessing prior step exit codes, so the rollback step now reads those official path variables.
- The Tekton health-check step used the `curlimages/curl` image while also calling `kubectl`, which that image does not provide. The health check now uses Kubernetes service DNS with curl only.
- The Tekton metrics step used the `curlimages/curl` image while calling `jq` and `bc`. It now installs the required tools in an Alpine step before querying Prometheus.
- The Tekton metrics query returned an unaggregated rate and could fail when Prometheus returned no series. It now calculates an error-rate ratio and defaults missing results to `0`.
- The canary example claimed a fixed 10% traffic split without configuring traffic routing. The wording was changed to say the canary is deployed alongside stable pods.
- The canary metric comparison compared raw JSON/string values and used shell integer arithmetic for likely floating-point metric values. It now queries Prometheus through `/api/v1/query`, extracts numeric values with `jq`, and compares them with `bc -l`.

## Review Notes
The examples are now technically consistent, but they remain illustrative. A production implementation should pin container image versions instead of using `latest`, handle Prometheus authentication and empty/no-traffic windows explicitly, and use a progressive delivery controller such as Argo Rollouts or Flagger when exact canary traffic weighting is required.
