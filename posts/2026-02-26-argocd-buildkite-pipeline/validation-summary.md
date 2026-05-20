# Validation Summary: How to Create a Complete Buildkite + ArgoCD Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Buildkite pipelines and self-hosted agents
- Buildkite Docker plugin
- Buildkite Agent Stack for Kubernetes
- Argo CD Applications and automated sync
- Kubernetes Deployments, volumes, and sidecar containers
- Docker and Docker-in-Docker
- Trivy filesystem scanning
- Kustomize image tag overrides
- GitHub Container Registry

## Sources Consulted
- Buildkite Agent configuration: https://buildkite.com/docs/agent/v3/configuration
- Buildkite agent Docker installation and Docker socket caveats: https://buildkite.com/docs/agent/self-hosted/install/docker
- Buildkite command step documentation: https://buildkite.com/docs/pipelines/configure/step-types/command-step
- Buildkite block step documentation: https://buildkite.com/docs/pipelines/block-step
- Buildkite Docker plugin documentation: https://buildkite.com/resources/plugins/buildkite-plugins/docker-buildkite-plugin/
- Buildkite Agent Stack for Kubernetes installation: https://buildkite.com/docs/agent/v3/self-hosted/agent-stack-k8s/installation
- Buildkite Agent Stack for Kubernetes overview: https://buildkite.com/docs/agent/v3/self-hosted/agent-stack-k8s
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Docker CLI `login` documentation: https://docs.docker.com/reference/cli/docker/login/
- Trivy filesystem scan CLI documentation: https://trivy.dev/docs/latest/references/configuration/cli/trivy_filesystem/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The introduction said the full CI/CD pipeline runs entirely on the user's infrastructure, which conflicted with Buildkite's hosted orchestration layer. Changed the wording to say build execution and deployments run on the user's infrastructure.
- The first agent deployment was labeled as Docker-in-Docker even though it mounted the host Docker socket. Renamed it to host Docker socket support.
- The Buildkite agent Deployment examples did not pass `start` to the `buildkite/agent:3` image. Added `args: ["start"]`.
- The host Docker socket example used an `emptyDir` build path, which is not visible to the host Docker daemon and can break Docker volume mounts from build jobs. Changed it to a host-mounted `/var/lib/buildkite/builds` path, matching Buildkite's documented Docker socket caveat.
- The DinD sidecar example did not mount the workspace into the DinD container. Added the shared workspace mount so Docker commands and volume mounts can see the same build path.
- The multi-environment deploy script edited an `image:` line in `kustomization.yaml`. Kustomize documents image overrides through the `images` field and `newTag`, so the command now updates `newTag`.
- The autoscaling example used an invalid Kubernetes Deployment and an obsolete `buildkite/agent-scaler` approach. Replaced it with an Argo CD Application for the official Buildkite Agent Stack for Kubernetes Helm chart.

## Review Notes
- The pipeline examples are illustrative and still assume the agent environment provides Docker access, registry credentials, Git SSH access, and any required CLIs.
- The `docker#v5.10.0` plugin version is not the newest documented version, but it is not deprecated in the checked sources.
- The Trivy command uses `--exit-code 0` with `soft_fail: true`, so it will report findings without failing the build. That is technically valid, but teams that want enforcement should use a nonzero exit code.
