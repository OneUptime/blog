# Validation Summary: How to Set Up GitHub Actions Runner on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- GitHub Actions
- Actions Runner Controller
- Kubernetes
- Helm
- Docker
- Go
- Node.js

## Sources Consulted
- GitHub Docs: Get started with Actions Runner Controller: https://docs.github.com/en/actions/tutorials/use-actions-runner-controller/get-started
- GitHub Docs: Actions Runner Controller concepts: https://docs.github.com/en/actions/concepts/runners/actions-runner-controller
- GitHub Docs: Deploy runner scale sets with Actions Runner Controller: https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/deploy-runner-scale-sets
- GitHub Docs: Authenticate ARC to the GitHub API: https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/authenticate-to-the-api
- GitHub Docs: Use Actions Runner Controller runners in a workflow: https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/use-arc-in-a-workflow
- Actions Runner Controller chart values: https://github.com/actions/actions-runner-controller/blob/master/charts/gha-runner-scale-set/values.yaml
- Kubernetes Docs: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Docs: Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Talos Linux official site: https://www.talos.dev/
- Go release history: https://go.dev/doc/devel/release
- NodeSource Node.js 24 setup documentation: https://docs.nodesource.com/

## Issues Found
- The post used the legacy `actions.summerwind.dev` ARC API, `RunnerDeployment`, and `HorizontalRunnerAutoscaler`. Updated the tutorial to the current GitHub-supported ARC runner scale set charts and `actions.github.com` resources.
- The Helm installation used the old community Helm repository and chart. Replaced it with the current OCI charts for `gha-runner-scale-set-controller` and `gha-runner-scale-set`.
- The authentication secret was created in the controller namespace. Updated it to the runner scale set namespace, which is what the current chart expects for a pre-defined Kubernetes secret.
- The GitHub App permission list was incomplete for repository-level runners. Updated it to include repository Administration read/write and organization Self-hosted runners read/write, matching GitHub's ARC authentication documentation.
- The runner YAML used deprecated custom resources and fields such as `repository`, `organization`, `labels`, `ephemeral`, and `dockerEnabled`. Replaced these with current Helm values: `githubConfigUrl`, `githubConfigSecret`, `minRunners`, `maxRunners`, `scaleSetLabels`, and `template`.
- The autoscaling section described legacy `HorizontalRunnerAutoscaler` behavior. Replaced it with runner scale set `minRunners` and `maxRunners` configuration.
- The workflow targeted `[self-hosted, talos-linux]`, which does not match the current runner scale set examples. Updated it to use the configured scale set labels.
- The Dockerfile attempted to install `docker-ce-cli`, `kubectl`, and `helm` directly from apt without adding the required package sources. Updated the commands to use the Docker install script, the official Kubernetes stable `kubectl` download URL, and Helm's official install script.
- The Go examples used Go 1.22, which is no longer a supported Go release as of May 16, 2026. Updated the Dockerfile to Go 1.26.3 and the workflow to Go 1.26.
- The example used Node.js 20. Updated the custom runner image example to Node.js 24.
- The NetworkPolicy selected `app: runner`, which does not match current ARC runner scale set labels. Updated it to select `actions.github.com/scale-set-name: org-runner` and added explicit TCP protocols where relevant.
- The monitoring commands used legacy resources such as `runners` and `horizontalrunnerautoscaler`. Updated them to current ARC resources: `autoscalingrunnersets`, `ephemeralrunnersets`, and `ephemeralrunners`.

## Review Notes
- The updated post remains a conceptual Talos Linux deployment guide. It assumes the Talos cluster already has a working Kubernetes CNI, DNS, outbound network path to GitHub and registries, and any storage class required by advanced ARC container modes.
- The custom runner image example uses `latest` for the ARC runner base image, matching common ARC documentation examples, but production deployments should pin image tags or digests.
- Docker-in-Docker is included only as the current ARC `containerMode` setting needed for workflows that run Docker commands. Production clusters should review the security implications of privileged Docker-in-Docker runners.
