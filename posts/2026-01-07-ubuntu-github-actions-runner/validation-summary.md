# Validation Summary: How to Set Up a Self-Hosted GitHub Actions Runner on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Linux
- GitHub Actions self-hosted runners
- GitHub Actions workflow YAML
- systemd services
- Docker Engine and Docker Compose
- Bash scripting
- Python scripting
- GitHub REST API

## Sources Consulted
- GitHub Docs: Self-hosted runners reference - https://docs.github.com/en/actions/reference/runners/self-hosted-runners
- GitHub Docs: Configuring the self-hosted runner application as a service - https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application
- GitHub Docs: Using self-hosted runners in a workflow - https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Docs: REST API endpoints for self-hosted runners - https://docs.github.com/en/rest/actions/self-hosted-runners
- GitHub actions/runner releases - https://github.com/actions/runner/releases
- GitHub actions/checkout releases - https://github.com/actions/checkout/releases
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: Build garbage collection - https://docs.docker.com/build/cache/garbage-collection/

## Issues Found
- Updated the runner download example from v2.321.0 to current v2.335.1 and replaced the SHA256 checksum so the "current runner package" example is accurate as of 2026-06-23.
- Corrected custom systemd services to invoke `bin/runsvc.sh` instead of `run.sh`, matching GitHub's service guidance that custom services use the service entrypoint.
- Corrected default self-hosted runner labels from `Linux` and `X64` to `linux` and `x64`, and updated workflow examples accordingly.
- Renamed the "Label Expressions" section to "Groups and Labels Together" because the example uses runner group/label routing, not expression syntax.
- Updated Docker's Ubuntu repository setup to the current official `docker.sources` and `docker.asc` approach, and expanded the list of conflicting packages to remove.
- Changed the Docker verification command to use a login session for `github-runner`, so new Docker group membership is applied before running `docker`.
- Reworded the runner `.env` example from "runner-specific secrets" to runner-wide variables, because values in that file are available to jobs on the runner and should not be described as protected workflow secrets.
- Fixed the multi-runner setup script so it extracts the runner package from the path created by the earlier download example.
- Corrected the autoscaling section from webhook-based queue monitoring to polling-based runner usage monitoring, because the script polls the self-hosted runners API and does not read workflow queue depth.
- Updated the container runner Dockerfile default runner version from v2.321.0 to v2.335.1.

## Review Notes
The autoscaling script remains a simplified example and does not provision new machines or request fresh registration tokens. For production autoscaling, GitHub recommends ephemeral autoscaled runners and purpose-built controllers such as Actions Runner Controller where appropriate.
