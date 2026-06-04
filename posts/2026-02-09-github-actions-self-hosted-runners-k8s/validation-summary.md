# Validation Summary: How to Set Up GitHub Actions Self-Hosted Runners with Auto-Scaling on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Actions Runner Controller (ARC)
- Kubernetes
- Helm
- Docker
- kubectl
- GitHub CLI
- Prometheus-format metrics

## Sources Consulted
- GitHub Docs: Get started with Actions Runner Controller: https://docs.github.com/actions/hosting-your-own-runners/managing-self-hosted-runners-with-actions-runner-controller/quickstart-for-actions-runner-controller
- GitHub Docs: Deploying runner scale sets with Actions Runner Controller: https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/deploy-runner-scale-sets
- GitHub Docs: Using Actions Runner Controller runners in a workflow: https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/use-arc-in-a-workflow
- GitHub Docs: Actions Runner Controller overview: https://docs.github.com/en/actions/concepts/runners/about-actions-runner-controller
- actions/actions-runner-controller repository and Helm chart values: https://github.com/actions/actions-runner-controller
- actions/checkout releases: https://github.com/actions/checkout/releases
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post used the legacy `actions.summerwind.dev/v1alpha1` `RunnerDeployment` and `HorizontalRunnerAutoscaler` API examples. I replaced these with the current GitHub-supported ARC runner scale set Helm chart model using `gha-runner-scale-set-controller` and `gha-runner-scale-set`.
- The Helm installation used the old GitHub Pages Helm repository and legacy chart. I updated installation commands to use the current OCI charts from `ghcr.io/actions/actions-runner-controller-charts`.
- The authentication examples used legacy `authSecret` chart settings and the `controller-manager` secret location. I updated them to current `githubConfigUrl` and `githubConfigSecret` usage, with the GitHub App secret created in the runner scale set namespace.
- The autoscaling examples used `HorizontalRunnerAutoscaler` metrics that apply to legacy ARC mode. I replaced them with current `minRunners` and `maxRunners` configuration for runner scale sets.
- The Docker-in-Docker example used legacy fields such as `dockerdWithinRunnerContainer`, `dockerMTU`, and `dockerRegistryMirror`. I replaced them with the current `containerMode.type: "dind"` configuration.
- The webhook autoscaling section described a separate webhook-driven HRA setup from legacy ARC mode. I updated it to explain that current runner scale sets use listener pods and scale via the runner scale set bounds.
- The monitoring section used a `ServiceMonitor` manifest with an incorrect core `v1` API version for ServiceMonitor. I replaced it with current ARC metrics chart values for Prometheus-format metrics.
- The runner image examples used the legacy `summerwind/actions-runner` image. I updated them to the supported `ghcr.io/actions/actions-runner:latest` image and retained the required runner container name and command.
- Workflow examples used `actions/checkout@v3`. I updated them to `actions/checkout@v5`.

## Review Notes
The post now targets the current GitHub-supported ARC runner scale set architecture. Legacy RunnerDeployment-based ARC mode still exists in community-maintained documentation, but it is no longer the recommended GitHub-supported path for new deployments.
