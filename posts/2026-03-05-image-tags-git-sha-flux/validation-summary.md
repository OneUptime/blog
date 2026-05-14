# Validation Summary: How to Configure Image Tags with Git SHA for Flux Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation
- Kubernetes manifests
- Docker image tagging and pushing
- Git and GitHub Actions
- GitHub Container Registry

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux sortable image tags guide: https://v2-7.docs.fluxcd.io/flux/guides/sortable-image-tags/
- Flux CLI documentation for image status commands: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Docker GitHub Actions guide: https://docs.docker.com/guides/gha/
- GitHub Packages documentation for publishing with GitHub Actions: https://docs.github.com/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- Git rev-parse documentation: https://git-scm.com/docs/git-rev-parse

## Issues Found
- The shell examples used `git rev-parse --short HEAD` while the Flux regexes require exactly 7 hexadecimal characters. Updated the examples to use `git rev-parse --short=7 HEAD` so the generated tags match the documented `ImagePolicy` filters.
- The GitHub Actions example pushed to GHCR without authenticating or granting package write permission. Added `permissions`, `docker/login-action@v4`, and updated the build action to `docker/build-push-action@v7` so the workflow can push to GitHub Container Registry using `GITHUB_TOKEN`.
- The replacement image and `git show` examples used `e4f5g6h`, which is not a valid Git SHA prefix and does not match the post's `[a-f0-9]` regex. Changed it to `e4f5a6b`.

## Review Notes
- The Flux `ImageRepository`, `ImagePolicy`, `filterTags.pattern`, `filterTags.extract`, numerical policy ordering, and image policy marker examples align with the current Flux image automation documentation.
- The CLI examples use Flux's documented singular aliases, such as `flux get image repository`, which are shown in the official guide examples even though the command reference page is titled under `flux get images`.
