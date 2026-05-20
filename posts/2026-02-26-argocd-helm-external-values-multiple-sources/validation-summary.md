# Validation Summary: How to Combine Helm Chart with External Values File Using Multiple Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD multi-source Applications
- Argo CD ApplicationSets
- Helm charts and values files
- Kubernetes deployment configuration
- GitOps workflows

## Sources Consulted
- Argo CD documentation: Multiple Sources for an Application - https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD documentation: Helm - https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD CLI command reference: `argocd app manifests` - https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_manifests/
- Helm command reference: `helm template` - https://helm.sh/docs/helm/helm_template/
- Helm command reference: `helm repo` - https://helm.sh/docs/helm/helm_repo/
- Prometheus Community Helm Charts repository usage documentation - https://github.com/prometheus-community/helm-charts

## Issues Found
- The local `helm template` debugging command used `prometheus-community/kube-prometheus-stack`, which only works if the `prometheus-community` repository alias has already been added to the local Helm client. Updated the command to include `--repo https://prometheus-community.github.io/helm-charts`, making it self-contained and consistent with Helm's documented chart repository URL flag.

## Review Notes
- The Argo CD multi-source `ref: values` / `$values` behavior is correct. Official Argo CD documentation confirms that `$values` maps to the root of the referenced Git source and must appear at the beginning of the `valueFiles` path.
- The Helm value precedence described in the post is correct: parameters override `valuesObject`, which overrides `values`, which overrides `valueFiles`, which override chart defaults.
- The note that later values files override earlier ones is correct.
- The `argocd app manifests prometheus` debugging command is valid for printing generated application manifests.
