# Validation Summary: How to Configure Reconciliation Jitter in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Prometheus / Grafana metrics
- YAML configuration

## Sources Consulted
- Argo CD argocd-cm.yaml example: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/argocd-cm-yaml/
- Argo CD FAQ, Git polling and reconciliation settings: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD argocd-cmd-params-cm.yaml example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD High Availability guide: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Webhook Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Annotations and Labels reference: https://argo-cd.readthedocs.io/en/latest/user-guide/annotations-and-labels/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The post incorrectly configured jitter as `controller.reconciliation.jitter` in `argocd-cmd-params-cm`. Changed it to `timeout.reconciliation.jitter` in `argocd-cm`, matching the official Argo CD configuration.
- The post used bare numeric duration values such as `"60"` and `"300"`. Updated reconciliation timeout and jitter examples to Go-style duration strings such as `"60s"` and `"300s"`, as documented by Argo CD.
- The restart guidance only restarted the application controller. Updated the commands and notes to restart both the application controller and repo server after `argocd-cm` reconciliation timeout changes.
- The formula for "optimal jitter" simplified incorrectly and did not represent the stated goal. Replaced it with a rate-based rule of thumb: `Minimum Jitter = Number of Apps / Target App Refreshes Per Second`.
- The per-application priority section incorrectly used `argocd.argoproj.io/refresh: "60"` as a per-application interval override. Corrected it to explain that `argocd.argoproj.io/refresh` is a one-time refresh annotation with `normal` or `hard` values.
- The metrics command used a non-standard service name for controller metrics. Updated it to `svc/argocd-metrics`, which is the documented application controller metrics service.
- The HA example omitted `ARGOCD_CONTROLLER_REPLICAS` and described application sharding too broadly. Updated it to show the required environment variable and explain that Argo CD shards managed clusters across controller replicas.
- The optimization example used a non-documented `reposerver.git.shallow.clone` key. Replaced it with the documented per-repository `depth: "1"` shallow clone configuration.

## Review Notes
The recommended jitter values remain operational rules of thumb rather than official Argo CD sizing guidance. They are now framed as guidance and use the correct Argo CD configuration keys and duration formats.
