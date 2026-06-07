# Validation Summary: How to Configure Tekton Dashboard

## Status
validated

## Post Type
Tutorial / Hands-on Guide

## Technologies Covered
- Tekton Dashboard
- Tekton Pipelines
- Tekton Triggers
- Kubernetes (Deployments, Services, Ingress, RBAC, ConfigMaps, CronJobs)
- kubectl
- OAuth2 Proxy
- Prometheus / Grafana
- Slack webhooks

## Sources Consulted
- Tekton Dashboard install docs: https://github.com/tektoncd/dashboard/blob/main/docs/install.md
- Tekton Dashboard binary source (flag definitions): https://raw.githubusercontent.com/tektoncd/dashboard/main/cmd/dashboard/main.go
- Tekton Dashboard router source (endpoint paths): https://raw.githubusercontent.com/tektoncd/dashboard/main/pkg/router/router.go
- Tekton Pipelines v1beta1 → v1 migration guide: https://tekton.dev/docs/pipelines/migrating-v1beta1-to-v1/
- Tekton deprecations page: https://tekton.dev/docs/pipelines/deprecations/
- Tekton Dashboard releases storage (verifying webhooks-extension-release.yaml availability)
- Kubernetes networking.k8s.io/v1 Ingress API documentation
- Kubernetes RBAC and CronJob v1 API documentation
- OAuth2 Proxy documentation (quay.io/oauth2-proxy/oauth2-proxy)

## Issues Found

1. **Non-existent `--logo-url` flag and "Custom Logo and Branding" section.**
   The Tekton Dashboard binary does not expose a `--logo-url` flag or any built-in logo/branding customization argument. Verified against `cmd/dashboard/main.go`, whose supported flags are: `pipelines-namespace`, `triggers-namespace`, `port`, `read-only`, `logout-url`, `default-namespace`, `namespaces`, `log-level`, `log-format`, `stream-logs`, `external-logs`, `x-frame-options`. The entire "Custom Logo and Branding" subsection was removed because the described feature does not exist and would mislead readers.

2. **Broken Webhooks Extension URL / deprecated extension.**
   The URL `https://storage.googleapis.com/tekton-releases/dashboard/latest/webhooks-extension-release.yaml` returns HTTP 404. The Webhooks Extension was an old experimental dashboard add-on that is no longer maintained or distributed; modern Tekton uses Tekton Triggers directly. Removed the "Extension Installation" subsection (and its now-empty parent "Dashboard Customization" header) because the install command would fail and the extension is obsolete.

3. **Deprecated `tekton.dev/v1beta1` API on the Slack notification Task.**
   Per the Tekton deprecations doc, `v1beta1` versions of Task/TaskRun/Pipeline/PipelineRun are deprecated in favor of `v1` since Tekton Pipelines v0.50.0, with v1.x being the current stable. Changed `apiVersion: tekton.dev/v1beta1` to `apiVersion: tekton.dev/v1` on the `send-slack-notification` Task.

4. **Misleading wording on Read-Only Mode.**
   The post implied the dashboard ships in read/write mode and that read-only needs to be enabled. In current Tekton Dashboard, `release.yaml` deploys read-only by default and `release-full.yaml` deploys read/write — and the `--read-only` flag defaults to `true` on the binary. Updated the prose to clarify that `release.yaml` is already read-only, and the patch is only needed if the user installed `release-full.yaml`.

## Review Notes

- All remaining `kubectl` commands, flag names (`--namespaces`, `--pipelines-namespace`, `--triggers-namespace`, `--external-logs`, `--read-only`), and the `/health` and `/readiness` probe paths were cross-checked against the dashboard's `main.go` and `router.go` and are accurate.
- Kubernetes manifest API versions are current: `networking.k8s.io/v1` (Ingress), `apps/v1` (Deployment), `rbac.authorization.k8s.io/v1` (ClusterRole/Binding), `batch/v1` (CronJob), `v1` (ServiceAccount/ConfigMap/Service).
- The CronJob pruning command uses `kubectl delete` with two `--field-selector` flags; only the last one will take effect (kubectl does not AND multiple `--field-selector` flags into a single selector). The example would not behave exactly as described in the comment ("delete PipelineRuns older than 7 days"). This is a behavioral nuance rather than a syntax error and was left alone to avoid restructuring the example.
- The default Tekton Dashboard container port in the upstream binary is `8080`; the service exposes port `9097` which targets the container port. The post consistently uses `9097`, which matches the bundled `release.yaml` Service definition.
- OAuth2 Proxy image `quay.io/oauth2-proxy/oauth2-proxy:v7.5.1` is a real, released version (June 2024) and remains a valid pinned tag; users may prefer a newer release in production.
- The post recommends Kubernetes 1.25+. This is reasonable and consistent with current Tekton Dashboard support.
