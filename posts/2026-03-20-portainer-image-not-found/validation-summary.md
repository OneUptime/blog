# Validation Summary: How to Fix 'Image Not Found' Errors When Deploying in Portainer (2)

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Portainer
- Docker Engine and Docker CLI
- Docker Compose
- Docker Hub
- Amazon ECR
- GitHub Container Registry (GHCR)
- Google Artifact Registry

## Sources Consulted
- Portainer custom registry docs: https://docs.portainer.io/admin/registries/add/custom
- Portainer Docker Hub registry docs: https://docs.portainer.io/admin/registries/add/dockerhub
- Portainer AWS ECR registry docs: https://docs.portainer.io/admin/registries/add/ecr
- Portainer stack deployment docs: https://docs.portainer.io/2.33-lts/user/docker/stacks/add
- Portainer container deployment docs: https://docs.portainer.io/sts/user/docker/containers/add
- Docker `docker login` reference: https://docs.docker.com/reference/cli/docker/login/
- Docker image reference docs: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker image naming guide: https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/
- Docker Compose `version` element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/pulls/
- Docker `docker image save` reference: https://docs.docker.com/reference/cli/docker/image/save/
- Docker `docker image load` reference: https://docs.docker.com/reference/cli/docker/image/load/
- Amazon ECR registry authentication docs: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- GitHub Container registry docs: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry

## Issues Found
- The post used `docker login ... -p password` as the explicit credential example. I changed it to `--password-stdin`, which is the current documented non-interactive login method.
- The custom registry instructions implied that the registry URL scheme was required. I corrected this to note that Portainer assumes `https://` when no protocol is provided.
- The Docker Hub section said to enter a username and password in Portainer. I corrected this to username plus Docker Hub access token, matching current Portainer documentation.
- The Docker Hub CLI note implied a direct credential prompt after `docker login`. I updated it to reflect the current web-based/device-code flow, while still noting the username-based alternative.
- The Compose example used a top-level `version: "3.8"` field. I removed it because current Docker Compose documentation marks `version` as obsolete.
- The stack deployment explanation said Portainer automatically uses matching registry credentials based on the image URL. I corrected this to reflect Portainer's current behavior and the need to explicitly select the correct registry when multiple registries from the same provider exist.
- The ECR section incorrectly told readers to update an ECR registry password in Portainer with a fresh short-lived token. I corrected this to use Portainer's AWS ECR registry provider with registry URL, AWS access key, AWS secret access key, and region.
- The GHCR section referred to a generic personal access token. I corrected it to a personal access token (classic), which is what GitHub Packages currently supports for registry authentication.
- The explicit Docker Hub image reference used `registry-1.docker.io/...`. I corrected it to the canonical Docker image host format `docker.io/...`.
- The Step 9 example block was presented as YAML even though it is a list of alternative reference patterns, not a valid single YAML document. I changed it to a plain text code block.

## Review Notes
- Portainer's dedicated GitHub registry provider is Business Edition-only, but GHCR can still be used through custom registry configuration, so the post's GHCR troubleshooting flow remains valid.
- Docker Hub pull-rate limits vary by account tier and may change over time; the post is better off staying high-level rather than hardcoding numeric thresholds.
