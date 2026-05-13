# Validation Summary: How to Set Up Flux with Backup Git Repository Mirror

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD GitRepository and HelmRelease resources
- Kubernetes and kubectl
- Gitea Helm chart
- GitHub Actions
- Git repository mirroring with native Git commands

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Gitea Helm chart README and values: https://gitea.com/gitea/helm-chart
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions events documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- actions/checkout documentation: https://github.com/actions/checkout
- Git push documentation: https://git-scm.com/docs/git-push

## Issues Found
- The Gitea Helm chart values used `ingress.hostname`, which is not the current official chart shape. Changed it to `ingress.hosts` with a host and path entry.
- The GitHub Actions `delete` trigger used a `branches` filter. The `delete` event does not support branch filters in the same way as `push`, so the unsupported nested filter was removed.
- The mirroring workflow used `actions/checkout` followed by `git push --mirror` from a normal checkout. That can push the wrong local refs; changed it to `git clone --mirror` and push from the mirror clone.
- The secondary Flux GitRepository description implied it was directly activated by the provided script. Clarified that the script patches the primary GitRepository and the secondary resource is useful for mirror health checking.
- The failover procedure did not mention that a self-managed Flux GitRepository manifest can be reverted by the next Kustomization reconciliation. Added a note to commit the failover change to the mirror or exclude that object from self-reconciliation.
- The failback sync command was ambiguous and could push in the wrong direction. Replaced it with an explicit mirror clone from Gitea followed by `git push --mirror` to the primary GitHub repository.

## Review Notes
Flux and kubectl CLIs were not installed in the local environment, so CLI command validation for those tools was performed against official Flux and Kubernetes documentation rather than local `--help` output. The example still assumes readers adapt repository URLs, credentials, namespaces, and self-management strategy to their own Flux bootstrap layout.
