# Validation Summary: How to Handle Helm Chart Dependencies in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes
- GitOps
- Helm chart dependencies and subcharts

## Sources Consulted
- Helm dependency command documentation: https://helm.sh/docs/helm/helm_dependency/
- Helm dependency build documentation: https://helm.sh/docs/helm/helm_dependency_build/
- Helm chart dependency best practices: https://docs.helm.sh/docs/chart_best_practices/dependencies/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD declarative repository Secret examples: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/declarative-setup.md
- Argo CD Helm dependency build implementation: https://github.com/argoproj/argo-cd/blob/master/reposerver/repository/repository.go
- Argo CD Helm command wrapper implementation: https://github.com/argoproj/argo-cd/blob/master/util/helm/helm.go
- Referenced OneUptime private Helm repository article: https://oneuptime.com/blog/post/2026-02-26-argocd-private-helm-repositories/view

## Issues Found
- The post described Argo CD dependency resolution as happening "at sync time" and implied dependencies are always downloaded then. Updated the wording to "during manifest generation when Helm reports missing dependencies," matching Argo CD's Helm rendering path and `helm dependency build` fallback behavior.
- The Application manifest examples omitted `spec.project`. Added `project: default` to match official Argo CD Application examples and avoid incomplete manifests.
- The repository registration section said every dependency repository must be registered. Updated this to clarify that public HTTPS dependency URLs can be used directly, while registration is needed for authenticated repositories and repository aliases such as `@bitnami` or `alias:bitnami`.
- The values example combined dev and production values in one YAML block with duplicate keys. Split it into separate YAML examples so each file is valid.
- The troubleshooting example used a misleading "repository not found" URL error. Updated it to an alias-based missing repository error, where registering the named Helm repository is the correct fix.
- The troubleshooting command `argocd app get my-app -o json | jq '.spec.source.helm'` was described as checking rendered values. Corrected the comment to say it checks configured Helm values in the Application spec.
- The slow sync section said Argo CD downloads dependencies "every time." Updated this to refer to manifest generation that has to download dependencies.

## Review Notes
The environment did not have local `helm` or `argocd` CLIs installed, so command behavior was verified against official documentation and Argo CD source code rather than local `--help` output.
