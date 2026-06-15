# Validation Summary: How to Configure Self-Hosted Runners in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- GitHub self-hosted runners
- Runner labels and runner groups
- Actions Runner Controller (ARC)
- Kubernetes and Helm
- AWS EC2 Auto Scaling
- Docker and rootless Docker
- Linux systemd services
- Windows runner service configuration

## Sources Consulted
- GitHub Docs: Adding self-hosted runners - https://docs.github.com/actions/hosting-your-own-runners/adding-self-hosted-runners
- GitHub Docs: Configuring the self-hosted runner application as a service - https://docs.github.com/actions/hosting-your-own-runners/managing-self-hosted-runners/configuring-the-self-hosted-runner-application-as-a-service
- GitHub Docs: Using labels with self-hosted runners - https://docs.github.com/actions/hosting-your-own-runners/using-labels-with-self-hosted-runners
- GitHub Docs: Choosing the runner for a job - https://docs.github.com/actions/using-jobs/choosing-the-runner-for-a-job
- GitHub Docs: Managing access to self-hosted runners using groups - https://docs.github.com/actions/hosting-your-own-runners/managing-self-hosted-runners/managing-access-to-self-hosted-runners-using-groups
- GitHub Docs: Self-hosted runners reference - https://docs.github.com/en/actions/reference/runners/self-hosted-runners
- GitHub Docs: Monitoring and troubleshooting self-hosted runners - https://docs.github.com/actions/how-tos/managing-self-hosted-runners/monitoring-and-troubleshooting-self-hosted-runners
- GitHub Docs: Get started with Actions Runner Controller - https://docs.github.com/en/actions/tutorials/use-actions-runner-controller/get-started
- GitHub Docs: Deploying runner scale sets with Actions Runner Controller - https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/deploy-runner-scale-sets
- GitHub Actions runner latest release API - https://api.github.com/repos/actions/runner/releases/latest
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Rootless mode - https://docs.docker.com/engine/security/rootless/

## Issues Found
- The runner download examples used `v2.311.0`, which is outdated. Updated the repository-level and AWS examples to `v2.335.1`, the latest GitHub Actions runner release available during validation.
- The Actions Runner Controller example used legacy `actions.summerwind.dev/v1alpha1` `RunnerDeployment` and `HorizontalRunnerAutoscaler` resources. Replaced it with the current GitHub-supported ARC Helm chart flow using `gha-runner-scale-set-controller` and `gha-runner-scale-set`.
- The runner group availability wording implied GitHub Enterprise was required. Updated it to state that runner groups require organization or enterprise runners, matching current GitHub runner group documentation.
- The troubleshooting command used `./run.sh --check`, but GitHub documents network connectivity checks through `./config.sh --check --url ... --pat ...`. Updated the command accordingly.
- The Docker permission troubleshooting example recommended `chmod 666 /var/run/docker.sock`, which is unsafe and not the Docker-documented approach. Replaced it with adding the runner user to the `docker` group or using rootless Docker.
- The "Docker-in-Docker Setup" heading described host Docker installation, not Docker-in-Docker. Renamed it to "Docker Setup" to match the commands shown.

## Review Notes
- GitHub notes that the latest runner release may roll out progressively, so GitHub's generated setup commands in the repository, organization, or enterprise UI remain the best source for exact production download commands.
- Passing a PAT directly with Helm is valid for short examples, but GitHub recommends Kubernetes secrets and GitHub App authentication for production ARC deployments where applicable.
