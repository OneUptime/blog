# Validation Summary: How to Push an Image to GitHub Container Registry with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- GitHub Container Registry
- GitHub Packages
- GitHub Actions
- GitHub REST API
- OCI image labels
- Skopeo

## Sources Consulted
- GitHub Docs: Working with the Container registry - https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Docs: Configuring a package's access control and visibility - https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility
- GitHub Docs: REST API endpoints for packages - https://docs.github.com/en/rest/packages/packages
- GitHub Docs: Publishing and installing a package with GitHub Actions - https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- Podman Docs: podman-login - https://docs.podman.io/en/v4.7.2/markdown/podman-login.1.html
- Podman Docs: podman-images - https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Containers Skopeo documentation - https://github.com/containers/skopeo

## Issues Found
- The prerequisites claimed that a fine-grained personal access token with Packages read/write permissions could be used for GHCR authentication. GitHub's Container registry documentation states that GitHub Packages registry authentication uses a personal access token (classic), while GitHub Actions can use `GITHUB_TOKEN`. I removed the fine-grained token instructions and clarified the classic PAT scopes needed for pushing, pulling metadata, and deleting.
- The package visibility section used an invalid `PATCH https://api.github.com/user/packages/container/myapp/versions` command to make a package public. GitHub's REST package endpoints document listing, getting, deleting, and restoring packages and package versions, but not changing package visibility with that endpoint. I replaced the invalid API command with the documented GitHub web UI steps for changing visibility.

## Review Notes
- The Podman login examples use valid `--password-stdin` and `--get-login` options according to Podman documentation.
- The GHCR naming pattern, push commands, OCI source/description/license labels, and GitHub Actions `GITHUB_TOKEN` package publishing flow align with GitHub's current documentation.
- Podman was not installed in the local environment, so CLI verification used official Podman documentation rather than local `--help` output.
