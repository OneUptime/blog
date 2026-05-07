# Validation Summary: How to Pull Images with Podman Desktop

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman Desktop
- Podman CLI
- OCI container images
- Container registries
- Docker Hub
- GitHub Container Registry
- Red Hat registry
- Quay.io
- AWS ECR authentication

## Sources Consulted
- Podman Desktop documentation: Pulling an image to your container engine: https://podman-desktop.io/docs/containers/images/pulling-an-image
- Podman Desktop documentation: Setting up container registries: https://podman-desktop.io/docs/containers/registries
- Podman documentation: podman-pull: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman documentation: podman-search: https://docs.podman.io/en/stable/markdown/podman-search.1.html
- Podman documentation: podman-images: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman documentation: podman-inspect and podman-image-inspect: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html and https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman documentation: podman-login: https://docs.podman.io/en/v4.7.2/markdown/podman-login.1.html
- GitHub Docs: Deploying runner scale sets with Actions Runner Controller, which documents `ghcr.io/actions/actions-runner:latest`: https://docs.github.com/actions/hosting-your-own-runners/managing-self-hosted-runners-with-actions-runner-controller/deploying-runner-scale-sets-with-actions-runner-controller
- Docker Registry HTTP API check for `docker.io/library/nginx:latest` manifest digest.

## Issues Found
- The GitHub Container Registry example used `ghcr.io/actions/runner:latest`, which is not the documented public GitHub runner image path. Changed it to `ghcr.io/actions/actions-runner:latest`.
- The digest examples used an invalid placeholder digest with an ellipsis. Replaced it with the current Docker Hub manifest digest for `docker.io/library/nginx:latest` so the pull and Containerfile examples are syntactically valid.
- The introduction said Podman Desktop shows available tags while pulling. The official Podman Desktop pull workflow documents entering an image name and viewing pulled image details, but does not document available tag browsing in the pull dialog. Removed the unsupported "available tags" claim.

## Review Notes
Podman was not installed in the local workspace, so CLI verification was performed against the official Podman command documentation and registry API checks rather than local `podman --help` output.
