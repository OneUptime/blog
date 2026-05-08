# Validation Summary: How to Tag an Image with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Container image tagging
- Bash
- Git-based CI/CD metadata

## Sources Consulted
- Podman `podman tag` documentation: https://docs.podman.io/en/stable/markdown/podman-tag.1.html
- Podman `podman images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman untag` documentation: https://docs.podman.io/en/v5.3.1/markdown/podman-untag.1.html
- Podman `podman image exists` documentation: https://docs.podman.io/en/latest/markdown/podman-image-exists.1.html
- Podman `podman build` documentation: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Distribution reference package image reference grammar: https://pkg.go.dev/github.com/distribution/reference
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The CI/CD example used the raw Git branch name directly as an image tag. Git branch names can contain characters such as `/` that are not valid in image tags. Added `BRANCH_TAG` sanitization and used it for branch-based tags.
- The retagging example used `podman untag myapp:old-name` after adding `myapp:new-name`. With only one argument, `podman untag` removes all names from the referenced image. Changed it to `podman untag myapp:new-name myapp:old-name` so only the old name is removed.

## Review Notes
- Podman was not installed in the local environment, so command verification was performed against official Podman documentation instead of local `--help` output.
- The semantic version example retags `latest` as `latest`, which is redundant but technically valid.
