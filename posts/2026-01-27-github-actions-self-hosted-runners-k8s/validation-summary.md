# Validation Summary: How to Implement GitHub Actions Self-Hosted Runners on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GitHub Actions self-hosted runners
- Actions Runner Controller (ARC)
- Kubernetes
- Helm
- GitHub App and Personal Access Token authentication
- Prometheus and Grafana monitoring
- Kubernetes NetworkPolicy, Pod Security Standards, and RBAC
- Docker custom runner images

## Sources Consulted
- GitHub Docs: Actions Runner Controller overview - https://docs.github.com/en/actions/concepts/runners/actions-runner-controller
- GitHub Docs: Get started with Actions Runner Controller - https://docs.github.com/en/actions/tutorials/use-actions-runner-controller/get-started
- GitHub Docs: Deploying runner scale sets with Actions Runner Controller - https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/deploy-runner-scale-sets
- GitHub Docs: Authenticating ARC to the GitHub API - https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/authenticate-to-the-api
- GitHub Docs: Using Actions Runner Controller runners in a workflow - https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/use-arc-in-a-workflow
- GitHub Docs: Self-hosted runners reference - https://docs.github.com/en/actions/reference/runners/self-hosted-runners
- GitHub ARC chart values: gha-runner-scale-set - https://github.com/actions/actions-runner-controller/blob/master/charts/gha-runner-scale-set/values.yaml
- GitHub ARC chart values: gha-runner-scale-set-controller - https://github.com/actions/actions-runner-controller/blob/master/charts/gha-runner-scale-set-controller/values.yaml
- Kubernetes Docs: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Docs: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Docs: RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post used the legacy Summerwind ARC Helm repository and `actions.summerwind.dev/v1alpha1` resources (`RunnerDeployment` and `HorizontalRunnerAutoscaler`). Replaced those examples with the current GitHub-supported ARC runner scale set Helm charts from `oci://ghcr.io/actions/actions-runner-controller-charts`.
- The install flow mixed controller and runner resources in one namespace. Updated it to use `arc-systems` for the controller and `arc-runners` for runner scale sets, matching GitHub's security guidance.
- The authentication examples used the old `controller-manager` secret name and outdated PAT scope guidance. Updated them to use `githubConfigSecret`, a pre-created secret in the runner namespace, and current GitHub App/PAT permission guidance.
- Autoscaling examples used legacy `HorizontalRunnerAutoscaler` metrics and webhook configuration. Replaced them with current `minRunners` and `maxRunners` runner scale set configuration and clarified that the current listener does not require a separate GitHub webhook.
- Runner deployment, organization runner, runner group, custom image, and secrets examples used legacy `RunnerDeployment` fields. Replaced them with current runner scale set `values.yaml` examples using `githubConfigUrl`, `runnerScaleSetName`, `runnerGroup`, and `template.spec`.
- Ephemeral runner and Docker-in-Docker examples used legacy ARC fields such as `ephemeral`, `dockerEnabled`, and `dockerdWithinRunnerContainer`. Updated them to the current scale set behavior and `containerMode` values.
- The workflow example targeted a runner group with legacy-style label matching. Updated it to target the runner scale set name with `runs-on`.
- The custom runner image used the deprecated `summerwind/actions-runner` base image and attempted to install `kubectl` from a default apt repository. Updated it to use `ghcr.io/actions/actions-runner:latest` and install `kubectl`, Helm, and AWS CLI with their current installer patterns.
- The Pod Security Standards example enforced `restricted`, which conflicts with Docker-in-Docker's privileged container requirement. Changed it to `baseline` with a note about DinD.
- The RBAC example combined `resourceNames` with list-style permissions and granted secret reads. Reduced it to a named ConfigMap `get` permission for least privilege.
- The monitoring section used legacy metric names such as `actions_runner_controller_runners`. Replaced them with current ARC listener metric names such as `gha_registered_runners`, `gha_busy_runners`, `gha_completed_jobs_total`, and `gha_job_startup_duration_seconds`.
- The logging configuration used a ConfigMap that is not part of the current Helm chart interface. Replaced it with `kubectl logs` commands and noted the need to retain controller, listener, and ephemeral runner logs.

## Review Notes
Helm is not installed in this workspace, so the Helm charts could not be rendered locally. The review was validated against current GitHub documentation and chart `values.yaml` files instead. ServiceMonitor labels may still need to be adjusted to the exact labels emitted by a user's Helm release and Prometheus Operator conventions.
