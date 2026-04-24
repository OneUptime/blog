# Validation Summary: How to Deploy GitLab via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitLab CE
- GitLab Runner
- GitLab CI/CD
- GitLab Container Registry
- Docker and Docker Compose syntax used in Portainer stacks
- Portainer stack webhooks

## Sources Consulted
- GitLab Docs: Install GitLab in a Docker container - https://docs.gitlab.com/install/docker/installation/
- GitLab Docs: Configure GitLab running in a Docker container - https://docs.gitlab.com/install/docker/configuration/
- GitLab Docs: GitLab installation requirements - https://docs.gitlab.com/install/requirements/
- GitLab Docs: Running GitLab in a memory-constrained environment - https://docs.gitlab.com/omnibus/settings/memory_constrained_envs/
- GitLab Docs: GitLab container registry administration - https://docs.gitlab.com/administration/packages/container_registry/
- GitLab Docs: Configure SSL for a Linux package installation - https://docs.gitlab.com/omnibus/settings/ssl/
- GitLab Docs: Build and push container images to the container registry - https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/
- GitLab Docs: Use Docker to build Docker images - https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: Registering runners - https://docs.gitlab.com/runner/register/
- Portainer Docs: Stack webhooks - https://docs.portainer.io/sts/user/docker/stacks/webhooks

## Issues Found
- The prerequisites understated storage needs at `10GB+`. GitLab’s installation requirements call for substantially more disk for a basic install, so this was corrected to `40GB+ available disk space`.
- The stack example mixed `http://` with exposed port `443`, which was internally inconsistent for the published ports. The `external_url` was corrected to `https://gitlab.example.com` to match the exposed HTTPS port.
- The memory-tuning example used `sidekiq['max_concurrency']`, which is not the documented Omnibus setting. It was corrected to `sidekiq['concurrency']`.
- The container registry example used `http://registry.example.com` without the documented HTTPS-oriented registry setup and without exposing the external registry port. It was corrected to `registry_external_url 'https://gitlab.example.com:5050'` with port `5050` exposed, matching GitLab’s same-domain registry configuration.
- The CI pipeline example built an image in one job and tried to use it in a later job before pushing it to a registry. The pipeline was rewritten to push the build image to GitLab’s container registry first and pull it in downstream jobs.
- The CI example used `docker:dind` semantics while the runner example mounted `/var/run/docker.sock` instead of configuring a privileged DinD runner. The pipeline was aligned with socket binding rather than DinD.
- The runner registration example used `--registration-token`, which GitLab documents as deprecated and scheduled for removal. It was updated to the current runner authentication token flow using `--token`.
- The deployment example implied Portainer stack webhooks are generally available. Portainer documents them as a Business Edition feature, so the example and conclusion were updated to state that caveat.

## Review Notes
- The HTTPS and registry configuration shown assumes DNS for `gitlab.example.com` resolves to the Docker host and that GitLab can obtain or use valid TLS certificates.
- Portainer stack webhooks are documented for non-Edge environments; the post now notes the Business Edition requirement, but that environment caveat could be added later if the article is expanded.
