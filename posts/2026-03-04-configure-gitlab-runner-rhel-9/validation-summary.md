# Validation Summary: How to Configure GitLab Runner on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GitLab Runner
- GitLab CI/CD
- GitLab Runner shell executor
- GitLab Runner Docker executor
- Podman
- systemd
- TOML
- YAML

## Sources Consulted
- GitLab Docs: Install GitLab Runner using the official GitLab repositories: https://docs.gitlab.com/runner/install/linux-repository/
- GitLab Docs: Registering runners: https://docs.gitlab.com/runner/register/
- GitLab Docs: Migrating to the new runner registration workflow: https://docs.gitlab.com/ci/runners/new_creation_workflow/
- GitLab Docs: Docker executor: https://docs.gitlab.com/runner/executors/docker/
- GitLab Docs: Advanced configuration: https://docs.gitlab.com/runner/configuration/advanced-configuration/
- GitLab Docs: GitLab Runner commands: https://docs.gitlab.com/runner/commands/
- Red Hat Docs: Building, running, and managing containers in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/

## Issues Found
- The GitLab Runner repository install command piped `curl` output directly to `bash` without following redirects. Updated it to use GitLab's documented `curl -L ... -o script.rpm.sh`, inspect, then `sudo bash script.rpm.sh` workflow.
- The runner registration instructions used registration tokens and `--registration-token`, which are deprecated and can be disabled in modern GitLab versions. Updated the text and commands to use runner authentication tokens and the `--token` option.
- The non-interactive registration examples passed tag and untagged-runner settings through the legacy registration flow. Updated the post to tell readers to set tags when creating the runner in GitLab, then register with the authentication token.
- The RHEL 9 Docker executor setup installed and enabled `docker`, but Docker Engine is not the supported RHEL 9 container runtime from Red Hat. Updated the example to install Podman-related packages and enable a Podman socket for the `gitlab-runner` user, consistent with GitLab's Podman guidance for the Docker executor.
- The sample `config.toml` used `[runners.cache] Type = "local"`, but the documented distributed cache `Type` values are `s3`, `gcs`, and `azure`. Removed the invalid local cache block.

## Review Notes
The sample `.gitlab-ci.yml`, service management commands, unregister commands, `config.toml` structure, `check_interval` comment, and UBI 9 image reference are technically sound after the updates. The Podman socket setup depends on the `gitlab-runner` user having a real systemd user session, which the post now notes in the command comments.
