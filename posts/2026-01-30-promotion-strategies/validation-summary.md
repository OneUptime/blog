# Validation Summary: How to Build Promotion Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kustomize (Kubernetes configuration management)
- GitHub Actions (CI/CD workflows)
- Bash scripting (curl, jq, awk, git)
- Kubernetes (kubectl, Deployments, rollout)
- Istio (VirtualService, traffic splitting)
- Prometheus (recording rules, alerting rules, PromQL)
- GitOps practices
- Canary deployment patterns

## Sources Consulted
- Kustomize documentation: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions `workflow_dispatch` event and `inputs`: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch
- `actions/checkout@v4`: https://github.com/actions/checkout
- kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- kubectl JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Istio VirtualService API (networking.istio.io/v1beta1): https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus `histogram_quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- jq manual (`-e` flag and boolean expressions): https://jqlang.github.io/jq/manual/

## Issues Found
No technical issues found.

All code examples were verified:
- The Kustomize manifest correctly uses `kustomize.config.k8s.io/v1beta1` with the `images` transformer and `newTag` field.
- The GitHub Actions workflow correctly uses `workflow_dispatch` with `inputs`, `${{ inputs.version }}` context, and `actions/checkout@v4`.
- The bash quality-gate script uses valid `curl -sf`, `jq -e`, and `kubectl get` with JSONPath syntax (`{.status.conditions[?(@.type=="Available")].status}`) that matches kubectl's documented JSONPath support.
- The Istio VirtualService uses the supported `networking.istio.io/v1beta1` apiVersion with correct `http.route.destination.weight` semantics.
- The kubectl rollout commands (`history`, `undo`, `--to-revision=N`) are accurate.
- The Prometheus rule group structure (`groups`, `rules`, `record`, `alert`, `expr`, `for`, `labels`, `annotations`) and PromQL functions (`histogram_quantile`, `rate`) are syntactically valid.

## Review Notes
- The Istio VirtualService uses `networking.istio.io/v1beta1`. This is still supported, but `networking.istio.io/v1` is the current GA version as of recent Istio releases. The `v1beta1` example will continue to work but may be worth updating in a future revision.
- The `histogram_quantile(0.95, rate(promotion_pipeline_duration_bucket[1h]))` example is syntactically correct and matches common Prometheus documentation idioms. In production with multiple series, users typically need `sum by (le) (...)` to aggregate properly, but this is acceptable for a high-level example.
- The rollback script's `git log --oneline <file> | head -2 | tail -1 | awk '{print $1}'` pattern is correct for getting the previous commit that touched a file; `git checkout <commit> -- <file>` updates both the index and working tree, so the subsequent `git commit` (without an explicit `git add`) works as written.
- The post is a clear, well-structured guide that pairs explanations with realistic, technically sound examples.
