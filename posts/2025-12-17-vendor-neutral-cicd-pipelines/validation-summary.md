# Validation Summary: Why Vendor-Neutral CI/CD matters: Why Bash Scripts Beat Platform Lock-In

## Status
validated

## Post Type
Technical opinion guide

## Technologies Covered
- CI/CD pipeline design
- Bash shell scripting
- GitHub Actions
- GitLab CI/CD
- CircleCI
- Jenkins
- Travis CI
- Node.js and npm
- Docker

## Sources Consulted
- GitHub Changelog: Update to GitHub Actions pricing - https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/
- GitHub Docs: Building and testing Node.js - https://docs.github.com/actions/guides/building-and-testing-nodejs
- GitHub Docs: Using secrets in GitHub Actions - https://docs.github.com/actions/security-guides/using-secrets-in-github-actions
- GitHub Docs: Dependency caching reference - https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- GitHub Docs: Store and share data with workflow artifacts - https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub Actions checkout repository - https://github.com/actions/checkout
- GitHub Actions setup-node repository - https://github.com/actions/setup-node
- GitHub Actions cache repository - https://github.com/actions/cache
- GitHub Actions upload-artifact repository - https://github.com/actions/upload-artifact
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Deprecated CI/CD keywords - https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab Docs: CI/CD variables - https://docs.gitlab.com/ci/variables/
- GitLab Docs: Use Docker to build Docker images - https://docs.gitlab.com/ci/docker/using_docker_build/
- npm Docs: npm ci - https://docs.npmjs.com/cli/v9/commands/npm-ci/
- Jest Docs: CLI options and coverage flag - https://jestjs.io/docs/cli
- NodeSource distributions documentation - https://github.com/nodesource/distributions
- Docker Docs: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Travis CI Blog: The new pricing model for travis-ci.com - https://www.travis-ci.com/blog/2020-11-02-travis-ci-new-billing/
- CircleCI Docs: Configuration reference - https://circleci.com/docs/reference/configuration-reference/

## Issues Found
- The GitHub Actions pricing claim was too broad. The linked GitHub changelog says the $0.002/minute cloud platform charge applies starting March 1, 2026 to applicable self-hosted runner usage, while public repository usage remains free. Updated both mentions to include those qualifiers.
- The coverage parsing example used `grep -oP` against `coverage/coverage-summary.json` as if it contained a text table. Jest JSON summary reports coverage under `total.lines.pct`, so the snippet now reads that value with Node.js and compares it without requiring `bc`.
- The "No Marketplace Dependencies" section claimed bash scripts have no external dependencies beyond standard Unix tools, but the examples use project/runtime tools such as Node.js, npm, Docker, curl, sudo, and apt. Reworded the claim to say bash scripts avoid CI marketplace dependencies and rely on project tools plus standard Unix utilities.
- The GitLab secrets snippet redefined `DEPLOY_TOKEN` as `$DEPLOY_TOKEN` in YAML. GitLab CI/CD variables should be configured in project/group/instance settings and are made available to jobs according to their scope, so the example now shows a job reading the existing masked variable.
- The GitLab deployment example used `only`, which GitLab documents as deprecated in favor of `rules`. Updated the example to use `rules` with `$CI_COMMIT_BRANCH == "main"`.

## Review Notes
- The GitHub Actions examples use pinned major versions such as `actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`, and `actions/upload-artifact@v4`. These remain recognizable and broadly valid examples, though newer major versions may be available and can require newer self-hosted runner versions.
- The NodeSource installation example is Ubuntu/Debian-specific because it uses `apt-get` and the NodeSource Debian setup script. That is acceptable in context, but it is not portable to non-Debian runners without adaptation.
- The Docker local-debugging command is syntactically valid, but it reproduces only the container OS and mounted workspace. Exact CI parity still depends on matching runner images, environment variables, services, secrets, and tool versions.
