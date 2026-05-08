# Validation Summary: How to Automate Multi-Arch Builds in CI/CD with Podman

## Status
validated

## Post Type
Tutorial / CI/CD guide

## Technologies Covered
- Podman
- QEMU user-mode emulation
- Container image manifests / multi-architecture images
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- Bash

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- Podman `podman manifest create` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-create.1.html
- Podman `podman manifest add` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman `podman manifest push` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman `podman login` documentation: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- GitHub Actions variables reference: https://docs.github.com/en/actions/reference/workflows-and-actions/variables
- GitLab deprecated CI/CD keywords documentation: https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab `rules` documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/

## Issues Found
- The GitLab CI example used the deprecated `only` keyword. Replaced it with equivalent `rules` entries for tags and the `main` branch, because GitLab now recommends `rules` for controlling when jobs are added to pipelines.
- The cache example used `--cache-from` but populated the cache by pushing the final image tag to the cache reference. Updated the build command to use `--cache-to` with `--cache-from`, which matches Podman/Buildah's documented remote cache mechanism.

## Review Notes
- The Podman manifest creation, add, and push flow is consistent with the current Podman CLI documentation.
- `podman manifest push --all` is valid, though current Podman documentation lists `--all` as the default behavior.
- Cross-architecture `RUN` instructions still require working QEMU/binfmt support on the CI runner; runner privilege and binfmt registration details can vary by CI provider.
