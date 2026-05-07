# Validation Summary: How to Use GitHub Container Registry (ghcr.io) with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitHub Container Registry (`ghcr.io`)
- GitHub Packages
- GitHub Actions
- Podman
- Skopeo
- OCI image labels and manifests
- GitHub REST API for packages

## Sources Consulted
- GitHub Docs: Working with the Container registry — https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Docs: Publishing and installing a package with GitHub Actions — https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- GitHub Docs: Authenticate with `GITHUB_TOKEN` — https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- GitHub Docs: REST API endpoints for packages — https://docs.github.com/en/rest/packages/packages
- Podman Docs: `podman info` — https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman Docs: `podman login` — https://docs.podman.io/en/v5.6.0/markdown/podman-login.1.html
- Podman Docs: `podman search` — https://docs.podman.io/en/stable/markdown/podman-search.1.html
- Podman / containers image docs: `containers-registries.conf` — https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.conf.5.md
- Podman Docs: `podman build` — https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman Docs: `podman manifest create` — https://docs.podman.io/en/stable/markdown/podman-manifest-create.1.html
- Podman Docs: `podman manifest add` — https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman Docs: `podman manifest push` — https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- GitHub Actions runner images: Ubuntu 24.04 software inventory — https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- GHCR registry API: verified public example image `ghcr.io/github/super-linter:latest` — https://ghcr.io/v2/github/super-linter/manifests/latest

## Issues Found
- The original search-registry section used the wrong `registries.conf` syntax. `[[registry]]` entries are for registry remapping/mirroring, not for Podman short-name search registries. I replaced that section with accurate guidance to use fully qualified `ghcr.io/...` references and corrected the `podman info` command to the documented `{{index .Registries "search"}}` form.
- The authentication section implied that `read:packages`, `write:packages`, and `delete:packages` were all required together. I corrected it to match GitHub’s docs: command-line authentication uses a personal access token (classic), and scopes depend on whether the user is pulling, pushing, or deleting.
- The post used `ghcr.io/actions/runner:latest` as a public example image. I replaced the pull and `skopeo inspect` examples with `ghcr.io/github/super-linter:latest`, which I verified as a public GHCR image.
- The GitHub Actions workflow example was entirely commented out, so it was not a runnable workflow. I converted it to valid YAML and added the documented `contents: read` and `packages: write` permissions required for pushing with `GITHUB_TOKEN`.
- The workflow section omitted GitHub’s package-linking caveat. I added a note that if the package already exists, it must be linked to the repository for `GITHUB_TOKEN` pushes to succeed.
- The visibility section overstated the default behavior by saying all ghcr.io pushes are private. I narrowed that to the documented command-line first-publish case and added the workflow-specific note that packages created with `GITHUB_TOKEN` inherit repository visibility and permissions.
- The GitHub Packages API examples used older media-type headers. I updated them to the current documented `application/vnd.github+json` media type and added the current REST API version header.
- The multi-platform manifest example used unprefixed image names with `podman manifest add`, which in current Podman docs resolves via registry transport rather than local container storage. I fixed the commands to use `containers-storage:` for locally built images, made the manifest push explicit with `--all`, and added the required emulation caveat for non-native builds.

## Review Notes
- `ubuntu-latest` currently includes Podman and Skopeo on GitHub-hosted runners as of May 7, 2026, but GitHub runner image contents can change over time and should be rechecked when this post is refreshed.
- The post now uses safer, fully qualified image references throughout. That aligns with Podman’s documented recommendation for avoiding ambiguous short-name pulls.
