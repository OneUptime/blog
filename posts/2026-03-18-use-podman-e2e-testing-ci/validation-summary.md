# Validation Summary: How to Use Podman for E2E Testing in CI

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- Playwright
- Cypress
- GitHub Actions
- PostgreSQL
- Redis
- Bash
- Containerfile / Dockerfile syntax

## Sources Consulted
- Podman `podman cp` reference: https://docs.podman.io/en/v2.2.0/markdown/podman-cp.1.html
- Podman `podman network create` reference: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman pod create` reference: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman run` reference: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Playwright Docker documentation: https://playwright.dev/docs/docker
- Playwright configuration documentation: https://playwright.dev/docs/test-configuration
- Playwright reporters documentation: https://playwright.dev/docs/test-reporters
- Cypress CI documentation: https://docs.cypress.io/app/continuous-integration/overview
- Cypress browser launching documentation: https://docs.cypress.io/app/references/launching-browsers
- Cypress configuration documentation: https://docs.cypress.io/app/references/configuration
- GitHub-hosted runners documentation: https://docs.github.com/en/actions/concepts/runners/github-hosted-runners
- GitHub Actions Ubuntu 24.04 runner image software list: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md

## Issues Found
- The Playwright base-image comment was technically inaccurate. The official Playwright image includes browsers and browser system dependencies, but not the Playwright package itself. I corrected the wording and updated the example to a current documented image tag.
- The Playwright example needed version-matching guidance. Playwright's Docker docs state that the image tag should match the `@playwright/test` version used by the project or browser executables may not be found. I added that requirement directly to the setup text.
- The Playwright artifact-copy step was incorrect. The post tried to copy `test-results` from the application container, but Playwright writes artifacts in the test runner container, and that container was started with `--rm`, so there would be nothing left to copy. I replaced that with a bind mount to `./test-results`.
- The GitHub Actions artifact comment overstated what the mounted directory contains by default. I changed it to refer to Playwright artifacts that actually land under `test-results` in the default setup.

## Review Notes
- The Podman networking explanations are accurate. User-defined bridge networks provide container-to-container name resolution unless DNS is disabled, and pods share the `net` namespace by default.
- The GitHub Actions workflow is valid as of 2026-05-07. GitHub-hosted Ubuntu runner images include preinstalled tools and the current Ubuntu 24.04 image lists Podman 4.9.3, but GitHub updates runner software regularly.
- The Cypress example is technically valid. A future improvement would be using a long-form `cypress/included` tag if the post wants to pin the exact bundled Node.js and browser versions as well as the Cypress version.
- The examples still assume an application health endpoint at `/health` and an app listening on port `8080`. Those are acceptable tutorial assumptions, but they are app-specific and should be adjusted in real projects.
