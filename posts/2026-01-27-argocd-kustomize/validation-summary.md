# Validation Summary: How to Use ArgoCD with Kustomize

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- Argo CD
- Argo CD ApplicationSet
- GitOps
- GitHub Actions
- Prometheus Operator ServiceMonitor
- Istio

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes documentation: Managing Secrets using Kustomize, https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kustomize/
- Kubernetes documentation: kubectl kustomize command reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes documentation: Specifying a Disruption Budget for your Application, https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes-sigs Kustomize repository README, https://github.com/kubernetes-sigs/kustomize
- Kubernetes-sigs Kustomize issue documenting the `commonLabels` deprecation warning, https://github.com/kubernetes-sigs/kustomize/issues/5653
- Argo CD documentation: Kustomize, https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD documentation: Automated Sync Policy, https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD documentation: Sync Options, https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD documentation: ApplicationSet Templates and templatePatch, https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD documentation: ApplicationSet Go Template limitations, https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/

## Issues Found
- Replaced the base `commonLabels` example with the current `labels` transformer using `includeSelectors: true`. `commonLabels` still works in many versions, but current Kustomize warns that it is deprecated in favor of `labels`.
- Corrected the production resource comment from "Guaranteed resources" to "Requested resources" because Kubernetes Guaranteed QoS requires CPU and memory requests to equal limits for all containers.
- Reworded the components ordering comment. Kustomize components encapsulate resources and patches, but the original phrasing implied a precise ordering guarantee that the docs do not state that way.
- Corrected the Argo CD `allowEmpty: false` comment. This setting protects against automated pruning when the desired manifest set is empty; it does not allow empty diffs during initial sync.
- Fixed the ApplicationSet example so boolean automation settings are applied through `goTemplate: true` plus `templatePatch`. ApplicationSet templating is only available on string fields, so templating `prune` and `selfHeal` booleans directly as quoted strings was incorrect.
- Changed the JSON Patch example from `replace` to `add` for `imagePullPolicy`, because the base Deployment did not define that field and JSON Patch `replace` requires an existing target.
- Corrected the replacements example so an ExternalSecret-derived secret name is copied into a Deployment annotation instead of overwriting an existing `configMapRef.name` with a Secret name.

## Review Notes
- All fenced YAML snippets parse successfully after the fixes.
- The examples are version-sensitive around Kustomize v5 and Argo CD ApplicationSet Go templating. The summary reflects current official documentation as of 2026-06-12.
