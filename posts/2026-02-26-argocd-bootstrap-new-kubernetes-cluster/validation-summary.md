# Validation Summary: How to Bootstrap a New Kubernetes Cluster with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Argo CD CLI
- Helm charts
- ingress-nginx
- cert-manager
- GitOps app-of-apps bootstrapping

## Sources Consulted
- Argo CD Getting Started documentation: https://argo-cd.readthedocs.io/en/release-2.13/getting_started/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Directory application documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Cluster Bootstrapping documentation: https://argo-cd.readthedocs.io/en/release-3.3/operator-manual/cluster-bootstrapping/
- Argo CD CLI repository command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo/
- Argo Helm chart index and chart metadata: https://argoproj.github.io/argo-helm/index.yaml
- cert-manager Helm installation documentation for v1.14: https://cert-manager.io/v1.14-docs/installation/helm/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The root Application used `directory.include: 'application.yaml'`, which would not match the nested files under `infrastructure/<component>/application.yaml` during recursive directory rendering. Changed it to `directory.include: '*/application.yaml'` to match the shown repository layout.
- The initial `argocd-cm` and `argocd-cmd-params-cm` examples omitted the `app.kubernetes.io/part-of: argocd` label. Argo CD's declarative setup documentation requires this label for Argo CD ConfigMaps, so it was added to both ConfigMaps.
- The Argo CD self-management example used Helm chart `argo-cd` version `7.3.4`, whose chart metadata deploys Argo CD `v2.11.4`, while the rest of the post installs `v2.13.3`. Updated the chart target revision to `7.7.21`, which has `appVersion: v2.13.3`.
- The post stated that sync waves would sync child applications in order. In an app-of-apps setup, sync waves on the child `Application` manifests order the creation of those `Application` resources by the root application; the child applications then sync according to their own sync policies unless additional health/customization behavior is configured. Updated the wording to reflect that distinction.

## Review Notes
- The commands and resource fields reviewed are valid for the versions shown, including `kubectl create namespace --dry-run=client -o yaml`, `kubectl wait --for=condition=ready`, `argocd repo add`, Argo CD Application fields, `server.insecure`, `application.instanceLabelKey`, and cert-manager `installCRDs: true` for chart v1.14.
- The post uses `HEAD` for Git revisions in examples. That is technically valid, but pinning a commit SHA is more reproducible for production bootstrap repositories.
- The bootstrap script leaves the `kubectl port-forward` background process running. This does not invalidate the example, but a production script should usually clean it up with a trap.
