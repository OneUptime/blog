# Validation Summary: How to Configure HelmRelease Upgrade Strategy Replace vs Merge in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- HelmRelease custom resources
- Helm upgrades
- Kubernetes Deployments
- Kustomize post-renderers
- kubectl

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/
- Helm v3 upgrade command documentation: https://helm.sh/docs/v3/helm/helm_upgrade/
- Helm latest upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post described Flux/Helm replacement as deleting and recreating changed resources. Updated this to describe replacement updates rather than a general delete-and-recreate mechanism.
- The post claimed `spec.upgrade.force` ensures immutable Deployment selector changes are handled by deleting and recreating the Deployment. Updated the immutable field section to state that Deployment selectors are immutable and require an explicit recreate or migration path.
- The post omitted the current Flux nuance that `spec.upgrade.force` is ignored when server-side apply is used. Added this caveat and adjusted the merge-strategy wording.
- The post-renderer patch example used a full object-style patch. Updated it to the JSON patch style shown in the Flux documentation, including the escaped annotation path.

## Review Notes
The examples use `apiVersion: helm.toolkit.fluxcd.io/v2`, `upgrade.cleanupOnFail`, and `upgrade.remediation.strategy: rollback`, which are valid Flux HelmRelease fields. Helm's latest CLI documentation has renamed the CLI force option to `--force-replace`, while Helm v3 documents `--force`; the Flux `spec.upgrade.force` field remains the relevant setting for this post.
