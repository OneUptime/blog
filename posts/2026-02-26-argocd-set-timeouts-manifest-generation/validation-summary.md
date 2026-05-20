# Validation Summary: How to Set Timeouts for Manifest Generation in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Git
- Helm
- Kustomize
- Config Management Plugins
- Prometheus

## Sources Consulted
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/release-2.6/operator-manual/high_availability/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/

## Issues Found
- `reposerver.git.request.timeout` examples used bare numeric strings such as `"120"`. Current Argo CD documentation shows this setting as a Go duration string, so I changed the examples to values like `"120s"`.
- The Helm timeout section said Helm rendering was not directly configurable through Argo CD. Argo CD documents a 90-second config management tool execution timeout for Helm/Kustomize that can be increased with `ARGOCD_EXEC_TIMEOUT`, so I corrected the section and added the environment variable example.
- The Helm example described `skipCrds: false` as skipping dependency updates. `skipCrds` controls whether chart CRDs are included in rendered manifests, so I corrected the comment.
- The CMP section said the timeout was inherited only from the controller-to-repo-server timeout. Current CMP documentation states that CMP commands also independently time out using `ARGOCD_EXEC_TIMEOUT`, defaulting to 90 seconds, so I corrected the explanation and added a sidecar environment variable example.
- The CMP snippet was framed as a Kubernetes CRD. Current sidecar CMP documentation stores this as `plugin.yaml` in the CMP sidecar, so I updated the comment to avoid implying it should be applied as a cluster CRD.
- The sync timeout section said sync operation timeout was not explicitly configurable as a single value. Argo CD documents `controller.sync.timeout.seconds`, so I added that setting and kept retry policy as a separate control.
- The monitoring alert used the undocumented metric name `argocd_app_reconcile_duration_seconds_count` and a `result="ComparisonError"` label. Argo CD documents `argocd_app_reconcile` as the reconcile histogram and `argocd_app_condition` for application conditions, so I changed the alert to use `argocd_app_condition{type="ComparisonError"}`.
- The Git request duration alert did not aggregate buckets by `le` before `histogram_quantile`. I updated the PromQL to use `sum(rate(...)) by (le)`.
- The timeout hierarchy treated Git timeouts and execution timeouts as a single nested chain. I corrected it to show the execution timeout and Git timeout as separate inner limits under the controller repo-server timeout.

## Review Notes
The recommended timeout values are operational guidance rather than documented Argo CD defaults. They are plausible but should be tuned by measuring real manifest generation time in each environment.
