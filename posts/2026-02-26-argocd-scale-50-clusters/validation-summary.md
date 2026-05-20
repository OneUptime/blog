# Validation Summary: How to Scale ArgoCD Across 50+ Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- ApplicationSet
- Redis
- Prometheus Operator ServiceMonitor
- Kustomize

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/latest/user-guide/annotations-and-labels/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD installation documentation for HA manifests and Kustomize usage: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The sharding explanation said every shard assignment was determined by consistent hashing while the example configured `round-robin`. Changed the text to say shard assignment is determined by the configured sharding algorithm.
- The repo server example described an `emptyDir` mount as a persistent volume. Changed the comment to describe it as extra `/tmp` space for repository clones.
- The Redis HA example used a plain Kubernetes Deployment with three Redis replicas, which does not create Argo CD Redis HA/Sentinel behavior. Replaced it with a Kustomize reference to Argo CD's official HA install manifest and updated the Redis persistence explanation.
- The controller tuning example put controller processor settings in `argocd-cm` and included unsupported or misdescribed keys. Changed it to `argocd-cmd-params-cm` and used documented controller processor and Kubernetes client connection settings.
- The per-Application reconcile interval example used `argocd.argoproj.io/refresh: "600"`, but that annotation only accepts `normal` or `hard` and triggers a refresh request. Replaced the section with documented global reconciliation polling settings in `argocd-cm`.

## Review Notes
The remaining examples are syntactically valid YAML. The `round-robin` and `consistent-hashing` sharding methods are documented by Argo CD, but current Argo CD documentation marks them as alpha/experimental, so production users should test shard behavior during cluster or shard changes.
