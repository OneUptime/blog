# Validation Summary: How to Configure Jsonnet Library Paths in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Jsonnet
- go-jsonnet
- jsonnet-bundler
- Kubernetes manifests
- Argo CD Application resources

## Sources Consulted
- Argo CD Jsonnet user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/jsonnet/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD repo-server and high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD v3.4.1 source for Jsonnet VM setup: https://github.com/argoproj/argo-cd/blob/v3.4.1/reposerver/repository/repository.go
- go-jsonnet v0.21.0 CLI and importer source: https://github.com/google/go-jsonnet/tree/v0.21.0
- Jsonnet language documentation: https://jsonnet.org/learning/tutorial.html
- Jsonnet specification: https://jsonnet.org/ref/spec.html
- jsonnet-bundler README: https://github.com/jsonnet-bundler/jsonnet-bundler
- k8s-libsonnet documentation: https://jsonnet-libs.github.io/k8s-libsonnet/
- Grafonnet repository: https://github.com/grafana/grafonnet

## Issues Found
- The post said ArgoCD searches multiple `directory.jsonnet.libs` paths in the order listed, with the first match winning. Argo CD v3.4.1 appends the configured libs to go-jsonnet `JPaths`, and go-jsonnet checks those paths from the end of the list back to the beginning, so later entries have priority. Updated the ordering explanation and override example accordingly.
- The dependency example used the archived `grafana/grafonnet-lib` repository and Kubernetes 1.29 k8s-libsonnet path. Updated the Grafonnet install and `jsonnetfile.json` example to the current `grafana/grafonnet` repository and updated k8s-libsonnet to a currently documented Kubernetes version.
- The performance pitfall said ArgoCD clones the full repository for each application sync. Argo CD repo-server maintains local repository clones and caches repo state. Reworded this to refer to repository fetches, cache refreshes, disk usage, and Argo CD shallow clone settings.
- The symlink pitfall blamed Git hosting providers for not preserving symlinks. Argo CD's relevant documented behavior is that out-of-bounds symlinks are blocked unless explicitly allowed. Reworded the pitfall to match Argo CD behavior.

## Review Notes
The Argo CD `directory.jsonnet.libs` field, repo-root path resolution, `argocd app get -o yaml` command, Kubernetes `apps/v1` Deployment, `v1` Service, and `autoscaling/v2` HPA examples are technically valid. The Jsonnet CLI was not installed locally in the review environment, so syntax and command behavior were verified against official Jsonnet/go-jsonnet documentation and source rather than by executing `jsonnet`.
