# Validation Summary: How to Set Up Application Webhooks in Portainer for Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Kubernetes applications in Portainer
- Portainer GitOps webhooks
- GitHub Actions
- GitLab CI/CD
- `curl`
- Docker registry publishing with GitHub Actions

## Sources Consulted
- Portainer Documentation: Webhooks for Kubernetes applications — https://docs.portainer.io/2.33-lts/user/kubernetes/applications/webhooks
- Portainer Documentation: Create an application from a Manifest — https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer Documentation: Edit an application — https://docs.portainer.io/user/kubernetes/applications/edit
- GitHub Docs: Publishing Docker images — https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- `actions/checkout` README — https://github.com/actions/checkout
- `docker/login-action` README — https://github.com/docker/login-action
- `docker/build-push-action` README — https://github.com/docker/build-push-action
- GitLab Docs: Deprecated keywords — https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab Docs: Specify when jobs run with rules — https://docs.gitlab.com/ci/jobs/job_rules/

## Issues Found
- The post originally described Kubernetes application webhooks as available for any Portainer Kubernetes application and as direct image-redeploy hooks. Portainer's Kubernetes webhook docs show they are for Git-deployed applications, available only in Business Edition on non-Edge environments, and they trigger GitOps updates. I corrected the description, explanation, and enablement steps.
- The original webhook URL and examples used the Docker-style endpoint `/api/webhooks/...` and a `?tag=` override. Portainer's Kubernetes application webhook docs use `/api/stacks/webhooks/...` and document `rollout-restart` and webhook-passed environment variables instead. I replaced the endpoint and command examples with documented Kubernetes webhook behavior.
- The GitHub Actions example tried to push an image without authenticating to the registry first. GitHub's Docker publishing guidance and the `docker/login-action` documentation require a registry login step before pushing. I added `docker/login-action` and updated the action versions to current documented majors.
- The GitLab CI example used `only`, which GitLab documents as deprecated. I replaced it with `rules` using an equivalent branch condition.
- The original validation command claimed a `204 No Content` response on success, but that status was not documented in the official Kubernetes application webhook docs I verified against. I changed the guidance to check for an HTTP success response and confirm the update in Portainer.

## Review Notes
- A Portainer Kubernetes application webhook does not, by itself, provide the Docker-style `?tag=` image override behavior shown in the original draft. For Git-deployed applications, the Git-tracked manifest must already reference the desired image, or `Always apply manifest` must be enabled for a no-change reapply.
- GitHub currently documents newer major versions of `actions/checkout`, `docker/login-action`, and `docker/build-push-action` than the ones in the original draft. The post was updated to those current major versions.
- GitHub recommends pinning third-party actions to a commit SHA for stronger supply chain security. The post still uses major tags for readability, which is common in blog examples but less strict than production hardening guidance.
