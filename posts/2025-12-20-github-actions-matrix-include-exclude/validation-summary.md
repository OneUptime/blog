# Validation Summary: How to Use Matrix Include/Exclude in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions matrix strategies
- GitHub Actions `include`, `exclude`, `fail-fast`, and `max-parallel`
- GitHub Actions expressions and dynamic matrices with `fromJSON`
- GitHub Actions service containers
- `actions/checkout`, `actions/setup-node`, and `actions/setup-python`
- Playwright browser testing
- Go cross-compilation in CI
- Docker images for database services

## Sources Consulted
- GitHub Docs: Running variations of jobs in a workflow - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Expressions and `fromJSON` - https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#fromjson
- GitHub Docs: Communicating with Docker service containers - https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers
- GitHub Docs: GitHub-hosted runners reference - https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- GitHub Changelog: macOS 13 runner image retirement - https://github.blog/changelog/2025-09-19-github-actions-macos-13-runner-image-is-closing-down/
- actions/checkout README - https://github.com/actions/checkout
- actions/setup-python README and advanced usage - https://github.com/actions/setup-python
- Playwright Browsers documentation - https://playwright.dev/docs/browsers
- Docker Hub official `postgres` image - https://hub.docker.com/_/postgres
- Docker Hub official `mysql` image - https://hub.docker.com/_/mysql

## Issues Found
- The dynamic matrix example used `git diff --name-only HEAD~1` after a default `actions/checkout@v4` checkout. Since checkout fetches only one commit by default, `HEAD~1` may not exist. Added `fetch-depth: 2` to make the example work for the parent-commit diff shown.
- The database service example included `sqlite` as a Docker service image and left an unintended `sqlite:15` matrix combination. SQLite is not a server-style service container in the same way as Postgres or MySQL, and `sqlite:3` is not an official Docker image. Removed SQLite from the service-container matrix, kept Postgres/MySQL, updated MySQL versions, and added required service environment variables.
- The Playwright viewport example used two `include` entries with different `viewport` values but no base `viewport` matrix axis. GitHub Actions can overwrite values added by earlier `include` entries, so this would not create both added viewport jobs as intended. Added `viewport: [desktop]` so the mobile and tablet entries become new combinations.
- The browser matrix comment said WebKit on Windows has limited support. Playwright officially supports Chromium, Firefox, and WebKit, so the comment was changed to a project-specific skip reason.
- The Go cross-compilation example used Bash-style environment assignment while one matrix job runs on `windows-latest`, whose default shell is PowerShell. Added `shell: bash` to the build step.
- The architecture matrix used `macos-13`, which GitHub retired in December 2025. Replaced it with `macos-15-intel` for the Darwin amd64 job and updated the arm64 job to `macos-15`.

## Review Notes
The remaining matrix concepts and examples align with GitHub's documented behavior: matrices create Cartesian products, `exclude` removes matching configurations, `include` can extend existing combinations or add new ones, `fromJSON` can consume a generated matrix output, and `fail-fast`/`max-parallel` are valid strategy options.
