# Validation Summary: How to Use the 'PruneLast' Sync Option in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD sync options
- Kubernetes garbage collection / delete propagation

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Compare Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Kubernetes Garbage Collection documentation: https://kubernetes.io/docs/concepts/architecture/garbage-collection/

## Issues Found
- The post claimed PruneLast "ensures zero downtime." Argo CD only controls prune ordering; availability also depends on Service selectors, routing, readiness, and client behavior. I changed this to say PruneLast helps avoid downtime when traffic can route to the new healthy Deployment.
- The Service migration example said clients using the old Service name "have time to switch over." PruneLast only defers pruning within the sync operation and does not provide a durable client migration window. I clarified that clients must be migrated before removing the old Service from Git, or a compatibility Service should remain.
- The per-resource annotation section did not mention that a resource removed from Git must already have the `PruneLast=true` annotation on the live object for per-resource prune behavior to apply. I added that caveat.
- The troubleshooting section incorrectly said `argocd.argoproj.io/compare-options: IgnoreExtraneous` prevents pruning. Official Argo CD docs state that this annotation only affects sync status. I changed the guidance to `argocd.argoproj.io/sync-options: Prune=false` and clarified the distinction.

## Review Notes
The main `PruneLast=true`, `PrunePropagationPolicy`, sync wave, per-resource annotation, and `argocd app set --sync-option` syntax matched official Argo CD documentation. Some Kubernetes YAML snippets are intentionally abbreviated and are suitable as illustrative fragments rather than complete apply-ready manifests.
