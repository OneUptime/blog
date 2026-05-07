# Validation Summary: How to Run GitLab Runner in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitLab Runner
- GitLab CI/CD
- Podman
- Container images and volumes
- TOML runner configuration

## Sources Consulted
- GitLab Docs: Run GitLab Runner in a container - https://docs.gitlab.com/runner/install/docker/
- GitLab Docs: Registering runners - https://docs.gitlab.com/runner/register/
- GitLab Docs: GitLab Runner commands - https://docs.gitlab.com/runner/commands/
- GitLab Docs: Docker executor and Podman support - https://docs.gitlab.com/runner/executors/docker/
- GitLab Docs: Advanced GitLab Runner configuration - https://docs.gitlab.com/runner/configuration/advanced-configuration/
- Podman Docs: podman-run volume SELinux relabeling options - https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The registration examples used deprecated runner registration tokens with `--registration-token`. Updated the examples and surrounding text to use runner authentication tokens with `--token`, matching GitLab's current recommended workflow.
- The registration examples used `--tag-list`, `--run-untagged`, and `--locked` flags with the deprecated workflow. Removed those flags and clarified that tags should already be configured on the runners in GitLab when using authentication tokens.
- Several Podman examples used the unqualified `gitlab/gitlab-runner:latest` image reference. Updated them to `docker.io/gitlab/gitlab-runner:latest` to avoid Podman unqualified image resolution ambiguity.
- The opening claim implied the container is rootless by default. Reworded it so rootless security is tied to running Podman in rootless mode.
- The monitoring section used `gitlab-runner status`, which checks a GitLab Runner service rather than the running containerized process. Replaced it with `podman ps --filter name=my-gitlab-runner`.
- The monitoring section started a second `gitlab-runner --debug run` process inside the active container to view logs. Replaced it with `podman logs --tail=30 my-gitlab-runner`.

## Review Notes
The tutorial intentionally uses the shell executor inside the runner container. That is technically valid, but jobs only have access to tools installed in that runner container, so custom runner images are important for non-trivial pipelines.
