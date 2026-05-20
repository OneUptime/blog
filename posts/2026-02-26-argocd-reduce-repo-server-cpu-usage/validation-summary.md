# Validation Summary: How to Reduce ArgoCD Repo Server CPU Usage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD repo-server
- GitOps
- Kubernetes manifests and Deployments
- Helm chart rendering
- Kustomize builds
- Prometheus metrics and alerting
- kubectl commands

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD `argocd-cm` example and reconciliation settings: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD FAQ for Git polling and webhooks: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/kustomize/
- Kubernetes kubectl `port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The shallow clone example used an unsupported `reposerver.git.shallow.clone` key in `argocd-cmd-params-cm`. Argo CD documents shallow clone configuration as a per-repository `depth: "1"` option, so the example was changed to a repository Secret with `depth: "1"`.
- The caching verification step suggested checking cache hit rates with `grep cache`, but current Argo CD repo-server metrics documentation does not list a manifest cache hit-rate metric. The command and explanation were changed to monitor documented repo-server Git request and repository-lock metrics instead.
- The reconciliation interval example used `timeout.reconciliation: "600"`. Argo CD documents this field as a duration string such as `60s`, `1m`, or `1h`, so it was changed to `10m`.
- The post described `argocd_repo_pending_request_total` as queued manifest generation requests and used it as a direct CPU saturation signal. Argo CD documents this metric as pending requests requiring a repository lock, so the monitoring command, alert name, alert summary, and key takeaway were corrected.

## Review Notes
The CPU reduction percentages and parallelism recommendations are operational estimates rather than guaranteed Argo CD behavior. They are reasonable as tuning guidance, but actual results depend on repository size, manifest generation tools, cache warm-up, and application layout.
