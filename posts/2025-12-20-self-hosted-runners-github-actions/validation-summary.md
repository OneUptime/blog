# Validation Summary: How to Use Self-Hosted Runners in GitHub Actions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitHub Actions
- GitHub self-hosted runners
- Runner labels and runner groups
- Docker
- Kubernetes
- Helm
- Actions Runner Controller
- BuildKit caching
- Prometheus metrics

## Sources Consulted
- GitHub Docs: Adding self-hosted runners - https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- GitHub Docs: Choosing the runner for a job - https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- GitHub Docs: Managing access to self-hosted runners using groups - https://docs.github.com/actions/hosting-your-own-runners/managing-self-hosted-runners/managing-access-to-self-hosted-runners-using-groups
- GitHub Docs: Get started with Actions Runner Controller - https://docs.github.com/en/actions/tutorials/use-actions-runner-controller/get-started
- GitHub Docs: Deploying runner scale sets with Actions Runner Controller - https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/deploy-runner-scale-sets
- GitHub Docs: Authenticating ARC to the GitHub API - https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/authenticate-to-the-api
- GitHub Docs: Running jobs in a container - https://docs.github.com/actions/using-jobs/running-jobs-in-a-container
- GitHub Docs: Monitoring and troubleshooting self-hosted runners - https://docs.github.com/actions/how-tos/managing-self-hosted-runners/monitoring-and-troubleshooting-self-hosted-runners
- GitHub Changelog: Self-hosted runner minimum version enforcement extended - https://github.blog/changelog/2026-02-05-github-actions-self-hosted-runner-minimum-version-enforcement-extended/
- GitHub Actions Runner releases API - https://api.github.com/repos/actions/runner/releases/latest
- Actions Runner Controller Helm chart values - https://github.com/actions/actions-runner-controller/blob/master/charts/gha-runner-scale-set/values.yaml
- Actions Runner Controller Helm chart controller values - https://github.com/actions/actions-runner-controller/blob/master/charts/gha-runner-scale-set-controller/values.yaml

## Issues Found
- The runner installation examples pinned `actions/runner` v2.311.0, which is outdated and below current minimum-version guidance. Updated the VM and Docker examples to v2.335.1, the latest release found during review.
- The Docker runner example configured the runner as the default root user. Updated the Dockerfile to create a `runner` user, give it ownership of the runner directory and entrypoint, and run the container as that user.
- The ARC scale set examples used raw `AutoscalingRunnerSet` manifests after installing only the controller. Updated them to use the supported `gha-runner-scale-set` Helm chart values and install command, matching GitHub's current ARC documentation.
- The ARC GitHub App secret was shown after the scale set manifest. Moved it before the scale set install flow so the referenced secret exists in the runner namespace.
- The ephemeral runner section used `ACTIONS_RUNNER_REQUIRE_JOB_CONTAINER`, which requires jobs to run in containers and is not the setting that makes ARC runners ephemeral. Replaced it with ARC scale set capacity values and noted that scale sets create ephemeral runner pods.
- The network isolation workflow used `container.options: --network=isolated`, but GitHub Actions does not support `--network` in job container options. Removed the unsupported option while keeping the job container isolation example.
- The monitoring example used an incomplete Prometheus Deployment and an invalid `arc-controller:8080` scrape target. Replaced it with the ARC controller Helm `metrics` values documented by the chart.
- The ARC troubleshooting command targeted `deployment/arc-runner-set`, which is not the current scale set resource layout. Replaced it with label-based log commands for the controller, listener, and runner pods.

## Review Notes
The examples are now aligned with current GitHub Actions and ARC documentation. In production, teams should pin Helm chart and runner image versions deliberately, keep runner images updated, and ensure persistent cache PVCs use storage access modes suitable for the expected runner concurrency.
