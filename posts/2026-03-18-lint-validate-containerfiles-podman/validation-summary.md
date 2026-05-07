# Validation Summary: How to Lint and Validate Containerfiles for Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- Hadolint
- ShellCheck rules surfaced by Hadolint
- Skopeo
- Trivy
- GitHub Actions
- GitLab CI
- pre-commit
- .containerignore / .dockerignore

## Sources Consulted
- Hadolint README and CLI/configuration documentation: https://github.com/hadolint/hadolint
- Hadolint pre-commit hook metadata: https://raw.githubusercontent.com/hadolint/hadolint/master/.pre-commit-hooks.yaml
- Hadolint GitHub Action marketplace documentation: https://github.com/marketplace/actions/hadolint-action
- Podman build documentation: https://docs.podman.io/en/v4.3/markdown/podman-build.1.html
- Podman image tree documentation: https://docs.podman.io/en/stable/markdown/podman-image-tree.1.html
- Podman image inspect documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Trivy container image scanning documentation: https://trivy.dev/docs/dev/guide/target/container_image/
- Trivy image CLI reference: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_image/
- Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- GitLab Code Quality report documentation: https://docs.gitlab.com/ci/testing/code_quality/

## Issues Found
- The post description referenced `container-diff`, but the article did not cover that tool. Updated the description to reference Skopeo and Trivy, which are actually covered.
- The Hadolint section said `DL3006` warns about `latest` tags. Hadolint documents `DL3006` as missing explicit image tags and `DL3007` as use of `latest`, so the rule explanation and config comments were corrected.
- The Podman build validation text described a "dry-run style build", but `podman build` performs a real build. Reworded this as a test build.
- The Trivy examples used `podman run aquasec/trivy image my-app:latest`, which would not normally see a locally built Podman image from inside the scanner container. Replaced those examples with direct `trivy image` and `trivy config` commands.
- The GitHub Actions example used `aquasecurity/trivy-action@master`. Updated it to the current versioned action reference from the official Trivy Action documentation.
- The output formats and GitLab CI examples used Hadolint's generic `codeclimate` format for GitLab Code Quality. Updated the GitLab-specific usage to `gitlab_codeclimate`, which Hadolint supports specifically for GitLab.
- The ignore-file validation command implied that the first few lines of `podman build` output show included build-context files. Replaced it with a temporary inline Containerfile that copies the context and lists files inside it.

## Review Notes
Hadolint primarily documents Dockerfiles, but it accepts any file path and Containerfile syntax is compatible with Dockerfile syntax for the examples shown. Local CLI binaries for Podman, Hadolint, Skopeo, and Trivy were not installed in the review environment, so command verification was performed against official documentation rather than local `--help` output.
