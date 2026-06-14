# Validation Summary: How to Deploy to Kubernetes with GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab Kubernetes Agent
- Kubernetes
- kubectl
- Helm
- Docker-in-Docker
- Kubernetes Deployments, Jobs, Services, namespaces, and image pull secrets
- GNU gettext envsubst

## Sources Consulted
- GitLab Docs: Using GitLab CI/CD with a Kubernetes cluster - https://docs.gitlab.com/user/clusters/agent/ci_cd_workflow/
- GitLab Docs: Installing the agent for Kubernetes - https://docs.gitlab.com/user/clusters/agent/install/
- GitLab Docs: Configure Kubernetes deployments (deprecated) - https://docs.gitlab.com/ci/environments/configure_kubernetes_deployments/
- GitLab Docs: Environments and environment actions - https://docs.gitlab.com/ci/environments/
- GitLab Docs: Authenticate with the container registry in Docker-in-Docker - https://docs.gitlab.com/ci/docker/authenticate_registry/
- Kubernetes Docs: kubectl set image - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Docs: kubectl rollout status - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes Docs: kubectl wait - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Helm Docs: helm upgrade - https://helm.sh/docs/helm/helm_upgrade/
- Helm Blog: Chart repository deprecation update - https://helm.sh/blog/charts-repo-deprecation/
- Alpine Linux Packages: gettext-envsubst - https://pkgs.alpinelinux.org/package/edge/main/x86/gettext-envsubst
- Docker Hub: alpine/kubectl image - https://hub.docker.com/r/alpine/kubectl

## Issues Found
- The GitLab Kubernetes Agent example showed `agent-config.yaml` and `gitops.manifest_projects`. Current GitLab docs place the agent configuration at `.gitlab/agents/<agent-name>/config.yaml`, and `gitops.manifest_projects` is deprecated for this CI/CD deployment use case. Changed the snippet to show the current agent config path and only the `ci_access` authorization needed for the pipeline example.
- The first deploy job used `environment.kubernetes.namespace`, which belongs to deprecated GitLab Kubernetes deployment configuration. Removed that nested Kubernetes environment block because the pipeline already selects the agent context and applies manifests directly with kubectl.
- The manifest substitution example used `apk add` inside `bitnami/kubectl:latest`, which is not an Alpine-based image. Changed the job image to `alpine/kubectl:1.36.1` and installed `gettext-envsubst`, so the package manager and `envsubst` package match the image.
- The Helm example added the archived `stable` chart repository even though the command deploys a local chart. Removed the stale repository setup to avoid relying on the deprecated Helm stable/incubator chart repositories.
- The manual rollback job used `environment: action: stop`, which marks an environment as stopped. Removed `action: stop` so a production rollback is not recorded as an environment stop action.

## Review Notes
The remaining kubectl, Helm, Docker, Kubernetes Job, namespace, and image pull secret examples use valid current command shapes. The post intentionally uses simplified snippets, so real deployments should still pin image/tool versions, set appropriate Kubernetes RBAC for the GitLab agent, and adapt canary traffic routing to the cluster's ingress or service mesh.
