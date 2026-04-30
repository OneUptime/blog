# Validation Summary: How to Integrate Portainer Webhooks with GitHub Actions

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Portainer container webhooks
- GitHub Actions
- GitLab CI/CD
- Docker CLI and container registries
- HTTP webhooks and `curl`

## Sources Consulted
- Portainer container webhooks documentation: https://docs.portainer.io/2.33-lts/user/docker/containers/webhooks
- Portainer container details documentation: https://docs.portainer.io/user/docker/containers/view
- GitHub Actions workflow syntax: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- GitHub Actions contexts reference: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs
- Docker Build GitHub Actions docs: https://docs.docker.com/build/ci/github-actions/
- Docker CLI `docker login` reference: https://docs.docker.com/reference/cli/docker/login/
- GitLab deprecated keywords reference: https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab `rules` documentation: https://docs.gitlab.com/ci/jobs/job_rules/

## Issues Found
- The introduction described the deployment model as "GitOps", but the implementation shown is a webhook-triggered CI/CD flow rather than a GitOps reconciliation workflow. I corrected the wording.
- The post omitted Portainer's documented availability constraints for container webhooks. I added that container webhooks are available on non-Edge Portainer Business Edition environments.
- The post referred to `SERVICE_TAG` while the examples actually used Portainer's `tag` query parameter for container webhooks. I corrected the comment text and renamed the section to match the documented behavior.
- The GitHub Actions example pushed an image without authenticating to the registry. I added a `docker/login-action@v3` step so the example is workable as written.
- The GitLab CI example also pushed without authenticating to the registry and used deprecated `only`. I added a `docker login` step using GitLab registry variables and replaced `only` with `rules`.
- The final webhook example comment implied an image name change rather than a tag change. I reworded it to describe redeploying with the specified image tag.

## Review Notes
- The post now matches Portainer's documented container webhook behavior, including the supported `tag` query parameter.
- The CI examples remain intentionally minimal and assume the runner already has Docker available; if published later for a more beginner audience, runner-specific Docker setup could be called out separately.
