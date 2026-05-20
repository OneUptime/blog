# Validation Summary: How to Scale ArgoCD for 500 Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Redis HA
- Prometheus
- Cilium resource exclusions

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD main ConfigMap reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD webhook documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD repository credentials documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repo-creds-yaml/
- Argo CD resource exclusion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#resource-exclusioninclusion
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- argo-helm Argo CD chart documentation: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- argo-helm Argo CD chart values: https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-cd/values.yaml

## Issues Found
- The repo-server Deployment used `--parallelism-limit`, but the supported Argo CD repo-server flag is `--parallelismlimit`. Updated the flag to the documented spelling.
- The repo-server command included unsupported `--git-shallow-clone` and `--redis-compress=gzip` flags. Removed those command arguments and kept Redis compression in `argocd-cmd-params-cm`, where it is documented.
- The repo-server Deployment example was missing a required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added the selector and labels.
- The `timeout.reconciliation` setting was shown under `argocd-cmd-params-cm`, but it belongs in `argocd-cm`. Moved it into a separate `argocd-cm` document in the same tuning example.
- The post recommended a `reposerver.git.shallow.clone` setting that is not documented in current Argo CD command parameters. Replaced it with the documented `reposerver.enable.git.submodule: "false"` optimization for installations that do not use Git submodules.

## Review Notes
The sizing values and processor counts are reasonable tuning examples, not universal defaults. Teams should still measure controller, repo-server, Kubernetes API, and Redis behavior before applying them in production.
