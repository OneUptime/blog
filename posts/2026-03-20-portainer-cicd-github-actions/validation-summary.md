# Validation Summary: How to Set Up CI/CD with Portainer and GitHub Actions - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- GitHub Actions
- GitHub Container Registry (GHCR)
- Docker
- Docker Buildx
- Portainer HTTP API
- `curl`
- `jq`

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Documentation: Webhooks for stacks — https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer Documentation: How do automatic updates for stacks/applications work? — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Documentation: Environment Variable Management in Docker: .env vs. stack.env — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Portainer Documentation: API documentation — https://docs.portainer.io/api/docs
- Portainer OpenAPI specification 2.39.1 (BE) — https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- GitHub Docs: Publishing Docker images — https://docs.github.com/actions/tutorials/publish-packages/publish-docker-images
- GitHub Docs: Publishing and installing a package with GitHub Actions — https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- Docker Docs: Docker Build GitHub Actions — https://docs.docker.com/build/ci/github-actions/
- Docker Docs: Manage tags and labels with GitHub Actions — https://docs.docker.com/build/ci/github-actions/manage-tags-labels/
- Docker official action repository: docker/metadata-action — https://github.com/docker/metadata-action
- Docker official action releases: docker/build-push-action — https://github.com/docker/build-push-action/releases

## Issues Found
- The original webhook setup was technically ambiguous. I corrected Step 2 to distinguish Portainer stack webhooks for stacks created with Web editor or Upload from GitOps webhooks for stacks deployed from a Git repository, and noted that stack webhooks are a Business Edition feature.
- The simple GitHub Actions workflow used older Docker action versions and logged into GHCR during pull request runs. I updated the example to current action versions, skipped registry login on pull requests, and added `type=ref,event=pr` to the Docker metadata tags so PR builds align with current Docker guidance.
- The advanced workflow would not push to GHCR as written because it did not authenticate to the registry or grant `packages: write` to the workflow token. I added the missing permissions and GHCR login step.
- The advanced workflow used a raw `ghcr.io/${{ github.repository }}` image name with Docker CLI commands. I normalized the image name to lowercase so it matches GHCR naming requirements.
- The Portainer stack update example did not mention that `PUT /api/stacks/{id}` only applies to file-based stacks. I clarified that Step 5 is for stacks created with Web editor or Upload.
- The API example used the deprecated `pullImage` field. I replaced it with `RepullImageAndRedeploy`, which is the current Portainer field for forcing image re-pull and redeploy behavior.
- The API example replaced the stack environment list with only `IMAGE_TAG`. I changed it to preserve existing `Env` entries and update only the `IMAGE_TAG` value.
- The stack lookup in the advanced workflow only matched by stack name. I updated it to also match `ENDPOINT_ID` so the example targets the correct stack in multi-environment Portainer setups.

## Review Notes
- GitHub recommends pinning third-party actions to a commit SHA for maximum supply-chain hardening. The post still uses major version tags for readability, which is common in tutorials but less strict than GitHub’s hardening guidance.
- The Compose example keeps `version: "3.8"`, which Portainer and Docker still accept, although newer Compose tooling no longer requires a top-level `version` field.
