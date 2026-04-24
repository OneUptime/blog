# Validation Summary: How to Set Up Stack Webhooks for Remote Redeployment in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Docker stacks
- Webhooks
- GitHub Actions
- GitLab CI/CD
- `curl`
- Bash

## Sources Consulted
- Portainer Documentation: Webhooks — https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Documentation: Inspect or edit a stack — https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Documentation: Add a new stack — https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer source: stack webhook handler — https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/api/http/handler/stacks/webhook_invoke.go
- Portainer source: empty response helper — https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/pkg/libhttp/response/response.go
- GitHub Docs: Publishing Docker images — https://docs.github.com/actions/guides/publishing-docker-images
- GitHub Docs: Workflow syntax for GitHub Actions — https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: About GitHub's IP addresses — https://docs.github.com/en/github/authenticating-to-github/about-githubs-ip-addresses
- GitHub Docs: REST API endpoints for meta data — https://docs.github.com/en/rest/meta/meta
- GitLab Docs: Deprecated keywords — https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab Docs: Specify when jobs run with rules — https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab Docs: Authenticate with the container registry — https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab Docs: Build and push container images to the container registry — https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/

## Issues Found
- The introduction described stack webhooks as redeploying with the current image settings. I corrected this to reflect Portainer's documented behavior: the webhook redeploys the current stack definition and pulls the latest image for the existing tag by default.
- The prerequisites omitted that stack webhooks are only available on non-Edge environments. I updated the prerequisite list accordingly.
- The enablement steps skipped the documented `Editor` tab path and used an imprecise UI label. I corrected the sequence to match the current Portainer documentation.
- The `curl` example claimed `HTTP 200 OK` and showed an undocumented JSON body with `{"pullImage": true}`. I corrected the response to `204 No Content` and replaced the body example with the documented `?pullimage=false` query parameter.
- The GitHub Actions example treated `200` and `204` as equivalent success responses. I tightened the success check to `204` to match Portainer's implementation.
- The GitLab CI example used deprecated `only`. I replaced it with `rules`, added explicit webhook status checking, and switched registry authentication to the documented `--password-stdin` pattern.
- The multi-stack Bash example also treated `200` as a normal success response. I updated it to expect `204`, matching Portainer's webhook response.
- The security note referred to a "webhook port". I corrected this to Portainer's HTTPS port, because the webhook is exposed on the normal Portainer listener.

## Review Notes
- GitHub recommends pinning third-party actions to a commit SHA instead of a moving tag. The post's `docker/login-action@v3` and `docker/build-push-action@v5` examples are still valid, but pinning would improve supply-chain safety.
- GitHub-hosted runner IP ranges change over time, and GitHub does not recommend relying on a static allowlist unless you monitor the Meta API regularly.
