# Validation Summary: How to Create a Docker Build Pipeline with Make

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GNU Make
- Docker CLI
- Docker Buildx
- Docker Compose
- Dockerfile
- GitHub Actions
- GitHub Container Registry
- Trivy
- Hadolint
- Ruff
- pytest

## Sources Consulted
- GNU Make Manual: https://www.gnu.org/software/make/manual/make.html
- GNU Make phony targets: https://www.gnu.org/software/make/manual/html_node/Phony-Targets.html
- GNU Make shell function: https://www.gnu.org/software/make/manual/html_node/Shell-Function.html
- Homebrew GNU Make formula notes: https://formulae.brew.sh/formula/make.html
- Docker buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Dockerfile reference: https://docs.docker.com/reference/builder
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose run reference: https://docs.docker.com/reference/cli/docker/compose/run/
- Docker bind mounts reference: https://docs.docker.com/engine/storage/bind-mounts/
- Docker image tag reference: https://docs.docker.com/engine/reference/commandline/tag/
- Trivy CLI reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy/
- Trivy misconfiguration scanning docs: https://www.trivy.dev/docs/v0.53/tutorials/misconfiguration/terraform/
- Hadolint Docker image documentation: https://hub.docker.com/r/hadolint/hadolint
- Ruff installation and Docker usage: https://docs.astral.sh/ruff/installation/
- Ruff linter command documentation: https://docs.astral.sh/ruff/linter/
- GitHub Container Registry authentication docs: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Actions publishing Docker images docs: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images

## Issues Found
- The post stated that Make is installed on virtually every Linux and macOS system while the examples use GNU Make features such as `$(shell ...)`. Updated the wording to say GNU Make is installed on many Linux systems and is available on macOS as `gmake` through package managers such as Homebrew.
- The branch-derived Docker tag only replaced slashes. Docker tags allow letters, digits, underscores, periods, and hyphens, so other valid Git branch characters could produce invalid image references. Updated the `sed` command to replace any non-Docker-tag character with `-`.
- The `lint` target used `golangci-lint` even though the rest of the example is a Python/pytest project. Replaced it with the official Ruff Docker image and `ruff check src tests`.
- The `clean-all` target used `xargs -r`, which is not portable to all common macOS/BSD environments. Replaced it with a POSIX shell conditional that only runs `docker rmi -f` when image IDs exist.
- The usage section described `make push` as a full CI pipeline including tests and scans, but the `push` target only depends on `build`. Updated the command to `make test scan push`.
- The GitHub Actions workflow logged in with `GITHUB_TOKEN` for GHCR publishing but did not request package write permissions. Added `permissions: contents: read` and `packages: write`.

## Review Notes
The corrected Makefile was extracted from the post and checked with `make -n` for representative targets. The Docker, Buildx, Compose, Trivy, Hadolint, Ruff, and GitHub Actions commands match current official CLI/documentation references. The examples remain intentionally project-specific and may still need project-specific Compose files, Dockerfiles, registry names, and linter configuration in a real repository.
