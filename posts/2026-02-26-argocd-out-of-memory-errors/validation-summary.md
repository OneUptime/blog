# Validation Summary: How to Handle ArgoCD Out-of-Memory Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- Helm / argo-helm chart values
- Go runtime garbage collection
- Redis
- Prometheus alerting
- jq

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- argo-helm chart values and README: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Kubernetes memory resource documentation: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Go garbage collector guide: https://go.dev/doc/gc-guide
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/

## Issues Found
- The shallow clone example used `reposerver.git.shallow.clone` in `argocd-cmd-params-cm`, but current Argo CD documentation describes shallow clone configuration with repository `depth: "1"` or `argocd repo add --depth`. Updated the example to a repository Secret with `stringData.depth: "1"`.
- The standalone Redis Helm values used `redis.config`, which is not exposed by the current argo-helm `argo-cd` chart for non-HA Redis. Updated the snippet to pass Redis memory settings through `redis.extraArgs`.
- The log wording said memory/heap/GC patterns will always appear before an OOM. Changed it to "may" because Kubernetes can OOM-kill a container without those log messages being present.

## Review Notes
The controller sharding, resource exclusions, repo-server parallelism limit, Go `GOGC`/`GOMEMLIMIT`, Redis HA config, Kubernetes resource limits, OOMKilled checks, and Prometheus alerting examples are consistent with the consulted documentation. Memory sizing values are practical guidance rather than fixed upstream recommendations and should be adjusted with production measurements.
