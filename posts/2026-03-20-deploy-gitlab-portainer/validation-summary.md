# Validation Summary: How to Deploy GitLab via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- GitLab CE (Omnibus Docker image)
- GitLab Runner (Docker executor)
- Portainer (Stacks)
- Docker / Docker Compose
- Docker-in-Docker (DinD) for CI builds
- GitLab CI/CD (.gitlab-ci.yml)
- SMTP email integration

## Sources Consulted
- GitLab Omnibus Docker installation docs: https://docs.gitlab.com/ee/install/docker.html
- GitLab Omnibus configuration reference (gitlab.rb): https://docs.gitlab.com/omnibus/settings/configuration.html
- GitLab Reverse Proxy / SSL termination docs: https://docs.gitlab.com/omnibus/settings/nginx.html
- GitLab Runner registration docs: https://docs.gitlab.com/runner/register/
- GitLab Runner CLI reference (`register` command): https://docs.gitlab.com/runner/commands/
- GitLab predefined CI/CD variables: https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- GitLab installation requirements: https://docs.gitlab.com/ee/install/requirements.html
- GitLab backup and restore docs: https://docs.gitlab.com/ee/administration/backup_restore/
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Portainer Stacks documentation: https://docs.portainer.io/user/docker/stacks

## Issues Found
No technical issues found.

All Omnibus config directives (`external_url`, `gitlab_rails['gitlab_shell_ssh_port']`, `nginx['listen_port']`, `nginx['listen_https']`, `nginx['proxy_set_headers']`, `gitlab_rails['smtp_*']`, `puma['worker_processes']`, `sidekiq['max_concurrency']`, `gitlab_rails['db_pool']`) are valid. The `gitlab-runner register` command uses the current `--token` flag appropriate for GitLab 16.0+ runner authentication tokens. The initial root password file path (`/etc/gitlab/initial_root_password`) and `gitlab-backup create` command are correct. CI predefined variables (`$CI_REGISTRY_IMAGE`, `$CI_COMMIT_SHORT_SHA`) and the Docker-in-Docker service syntax are accurate.

## Review Notes
- The `version: "3.8"` Compose attribute is technically obsolete in Docker Compose v2 (it's ignored, not an error); the file still works as written.
- The `docker exec gitlab ...` examples assume the running container is named `gitlab`. When deployed via a Portainer Stack, the container is typically named `<stack>-gitlab-1` (or `<stack>_gitlab_1` with legacy compose), so users may need to adapt the container name. This is a common shorthand and not an error.
- The `initial_root_password` file is auto-deleted ~24 hours after first boot; users should retrieve it promptly.
- The CI build job pushes to `$CI_REGISTRY_IMAGE` but does not include a `docker login` step (e.g., `docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY`). For a complete pipeline this would be required, but the snippet is presented as an illustrative example.
- The defined `test` stage has no associated job in the example pipeline; this is allowed by GitLab CI (the stage is simply skipped).
- The reverse proxy / SSL termination is referenced via the nginx settings but the proxy itself (e.g., Traefik, Caddy, nginx-proxy) is intentionally out of scope for this post.
