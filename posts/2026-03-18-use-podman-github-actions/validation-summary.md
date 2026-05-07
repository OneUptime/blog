# Validation Summary: How to Use Podman in GitHub Actions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- GitHub Actions
- GitHub Container Registry (GHCR)
- PostgreSQL
- Node.js
- `curl`

## Sources Consulted
- GitHub Actions runner images: Ubuntu 24.04 software list https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- GitHub Actions runner images: Ubuntu 22.04 software list https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2204-Readme.md
- GitHub Docs: Working with the Container registry https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Docs: Contexts reference https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs
- Podman docs: `podman login` https://docs.podman.io/en/stable/markdown/podman-login.1.html
- Podman docs: `podman build` https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman docs: `podman run` https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman docs: `podman pod create` https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman docs: `podman push` https://docs.podman.io/en/stable/markdown/podman-push.1.html
- curl man page https://curl.se/docs/manpage.html
- Node.js release schedule https://nodejs.org/en/about/previous-releases

## Issues Found
- The GHCR example did not include `org.opencontainers.image.source` metadata. I added a `--label org.opencontainers.image.source=https://github.com/${{ github.repository }}` flag to the `podman build` command because GitHub recommends this label to associate the package with the repository and help ensure `GITHUB_TOKEN` permissions work as expected.
- The integration-test health check used `curl --retry` without `--retry-connrefused` or `--fail`. I changed it to `curl --fail --retry 10 --retry-delay 2 --retry-connrefused http://localhost:8080/health` so startup connection failures are retried and HTTP error responses fail the step instead of passing silently.
- The matrix example used `node:18` and `node:20`, which are EOL as of 2026-05-07 according to the official Node.js release schedule. I updated the matrix to `node:22`, `node:24`, and `node:25`, which are current supported release lines on the validation date.

## Review Notes
- Podman is currently preinstalled on GitHub-hosted Ubuntu 22.04 and 24.04 runner images, but runner image contents can change over time. If the post is updated later, re-check the runner image README for the exact Podman version on `ubuntu-latest`.
- The GHCR workflow is correct for repository-scoped publishing from GitHub Actions. If a package was previously published to the same namespace without being connected to the repository, GitHub may still require the package to be manually connected in package settings.
