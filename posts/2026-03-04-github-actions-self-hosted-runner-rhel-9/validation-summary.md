# Validation Summary: How to Set Up GitHub Actions Self-Hosted Runner on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GitHub Actions self-hosted runners
- GitHub Actions workflow YAML
- systemd services
- Docker Engine on RHEL
- DNF package management

## Sources Consulted
- GitHub Docs: Adding self-hosted runners: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- GitHub Docs: Configuring the self-hosted runner application as a service: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application?platform=linux
- GitHub Docs: Using self-hosted runners in a workflow: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow
- GitHub Actions runner releases and release API: https://github.com/actions/runner/releases and https://api.github.com/repos/actions/runner/releases/latest
- Docker Docs: Install Docker Engine on RHEL: https://docs.docker.com/engine/install/rhel/
- Red Hat Documentation: Building, running, and managing containers on RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/

## Issues Found
- The runner download command used `releases/latest/download` with the old `actions-runner-linux-x64-2.311.0.tar.gz` asset name. That URL now returns 404 because the latest release is `v2.334.0`; updated the command to download `actions-runner-linux-x64-2.334.0.tar.gz` from the matching release tag.
- The build tools section installed `docker` directly with `dnf`, which is not Docker Engine's documented RHEL install path. Removed `docker` from the generic package install and added Docker's documented RHEL repository setup plus `docker-ce`, CLI, containerd, Buildx, and Compose plugin packages before starting the Docker service.
- The multiple-runner example created `rhel9-runner-01`, which duplicates the single-runner example's name. Changed the loop to create runners `02`, `03`, and `04`.

## Review Notes
- GitHub notes that Actions Runner releases are rolled out progressively, so repository-specific setup instructions in GitHub's UI remain the safest source for the exact runner version to install.
- The service commands, runner configuration pattern, labels, `runs-on` workflow syntax, and removal commands match GitHub's documented Linux self-hosted runner workflow.
