# Validation Summary: How ArgoCD Compares Live State vs Desired State

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kubernetes Deployments
- Helm
- Kustomize
- Redis
- JSON Pointer
- JQ path expressions

## Sources Consulted
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diffing/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD component architecture documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/architecture/components/
- Argo CD high availability and application controller documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Kubernetes image pull policy documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post implied ArgoCD strips `status` only from the live state. Updated this to say status is ignored by default for resource comparison unless configured otherwise, matching Argo CD's `ignoreResourceStatusField` behavior.
- The post described Kubernetes default handling as a broad built-in ArgoCD default table. Updated this to explain that built-in resources are handled through diff normalization and diff strategies, while CRDs may require `knownTypeFields`, server-side diff, or ignore rules.
- The structured comparison section claimed equivalent values in different formats are handled correctly without qualification. Updated this to note that CRDs reusing Kubernetes types may need `resource.customizations.knownTypeFields`.
- The cluster cache section said the Kubernetes cluster cache is backed by Redis and suggested checking Redis keys as the cluster cache status. Updated this to distinguish the controller's lightweight Kubernetes watch cache from Redis-backed Argo CD caches.
- The sync preview section said the preview is exactly what will be applied. Updated this to account for hooks, sync waves, admission controllers, and sync options.

## Review Notes
The CLI commands and diff customization snippets are consistent with current Argo CD documentation. The Kubernetes default examples shown for Deployments and Pods are plausible for current Kubernetes behavior, but the exact diff result can depend on the Argo CD version and selected diff strategy.
