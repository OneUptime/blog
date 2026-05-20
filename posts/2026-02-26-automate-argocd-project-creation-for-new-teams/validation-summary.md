# Validation Summary: Automate ArgoCD Project Creation for New Teams

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Argo CD AppProject
- Argo CD RBAC
- Argo CD ApplicationSet Git generator
- Kubernetes namespaces
- Kubernetes ResourceQuota and LimitRange
- kubectl
- Bash

## Sources Consulted
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Projects user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The introduction implied that resource quotas are part of the Argo CD AppProject itself. AppProject controls source repositories, destinations, resource allow/deny lists, project roles, and sync windows; Kubernetes ResourceQuota objects are namespace resources. Updated the wording to state that quotas are created by the onboarding workflow alongside the project.
- The tier-based shell script defined `MAX_APPS`, `SYNC_WINDOW_DENY`, and `DESTINATIONS_SERVERS`, but those values were not used in the generated AppProject. Argo CD AppProject does not provide a native `MAX_APPS` field, and the destination server settings had no effect. Removed the unused variables and changed the tier logic to generate the actual `spec.destinations` YAML for standard, premium, and platform tiers.
- The sync window comment said weekend production blocks were for the standard tier, but the manifest applied the same sync windows for every tier. Updated the comment to match the generated manifest.

## Review Notes
- The Bash snippets pass `bash -n` syntax validation.
- `kubectl` is not installed in the local environment, so CLI behavior was checked against official Kubernetes reference documentation rather than local `kubectl --help` output.
- The ApplicationSet Git file generator example is consistent with Argo CD's documented behavior of flattening JSON fields into template parameters.
