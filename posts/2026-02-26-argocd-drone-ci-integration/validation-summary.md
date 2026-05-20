# Validation Summary: How to Integrate ArgoCD with Drone CI

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Drone CI
- Argo CD
- Kubernetes
- Kustomize
- Docker/container registries
- GitHub tokens and Git-based manifest updates
- kubectl

## Sources Consulted
- Drone Docker pipeline overview and syntax: https://docs.drone.io/pipeline/docker/overview/
- Drone environment substitution and `DRONE_COMMIT_SHA`: https://docs.drone.io/pipeline/environment/substitution/ and https://docs.drone.io/pipeline/environment/reference/drone-commit-sha/
- Drone environment variables and `DRONE_DEPLOY_TO`: https://docs.drone.io/pipeline/environment/reference/drone-deploy-to/
- Drone promote command: https://docs.drone.io/cli/build/drone-build-promote/
- Drone repository secrets CLI: https://docs.drone.io/cli/secret/drone-secret-add/
- Drone Docker plugin reference: https://plugins.drone.io/plugins/docker
- Argo CD Application specification and automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/ and https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD CLI environment variables and command references: https://argo-cd.readthedocs.io/en/latest/user-guide/environment-variables/, https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/, and https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD releases: https://github.com/argoproj/argo-cd/releases
- Kustomize project documentation: https://github.com/kubernetes-sigs/kustomize and https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The direct Argo CD sync example used `argoproj/argocd:v2.10.0`, which is outdated for a 2026 tutorial. Updated it to `quay.io/argoproj/argocd:v3.4.1`, the current Argo CD release line at review time.
- The section titled "Using Drone Plugins for ArgoCD" showed a generic Argo CD CLI container, not a Drone plugin. Retitled the section and adjusted the explanatory sentence/comment so the example accurately describes running the CLI from Drone.
- The production promotion pipeline set `IMAGE_TAG` from `DRONE_DEPLOY_TO`. Drone documents `DRONE_DEPLOY_TO` as the target environment, such as `production`, so the example would update the manifest to an image tag like `:production`. Changed it to use `${DRONE_COMMIT_SHA:0:7}`, matching the image tag built for the promoted commit.

## Review Notes
The examples are otherwise technically plausible but intentionally simplified. In production, teams should usually avoid mutable `latest` tags, handle no-op `git commit` cases, add retry/rebase logic around manifest pushes, and prefer short-lived or scoped Git credentials.
