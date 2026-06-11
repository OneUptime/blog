# Validation Summary: How to Create Docker Images with Security Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Dockerfiles
- Node.js Docker images
- npm
- Trivy
- Snyk CLI and Snyk Container
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- SBOM formats: SPDX and CycloneDX

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- npm `npm ci` documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- Trivy Debian/Ubuntu repository instructions: https://aquasecurity.github.io/trivy-repo/
- Trivy configuration file reference: https://trivy.dev/docs/latest/references/configuration/config-file/
- Trivy image command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy GitLab CI integration guide: https://trivy.dev/docs/latest/tutorials/integrations/gitlab-ci/
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- GitLab container scanning documentation: https://docs.gitlab.com/user/application_security/container_scanning/
- Snyk Container test command documentation: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/commands/container-test
- Snyk Container advanced CLI usage: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/scan-and-maintain-projects-using-the-cli/snyk-cli-for-snyk-container/advanced-use-of-snyk-container-cli
- Snyk Dockerfile scanning documentation: https://docs.snyk.io/scan-fix-and-prevent/scan-with-snyk/snyk-container/scan-your-dockerfile
- Docker Build GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/

## Issues Found
- The sample Dockerfile installed only production dependencies in the builder stage and then copied `/app/dist` without creating it. Updated the builder stage to install dependencies, copy source, run `npm run build`, and prune development dependencies with `npm prune --omit=dev`.
- The Dockerfile `HEALTHCHECK` referenced `healthcheck.js`, but the production stage did not copy that file. Added a production-stage copy for `healthcheck.js`.
- The Alpine update command used `apk update && apk upgrade --no-cache`, which leaves the explicit index update unnecessary for this use case. Changed it to `apk upgrade --no-cache`.
- The Trivy APT installation commands used the deprecated `apt-key` flow and older repository URL format. Updated them to the current signed keyring and `get.trivy.dev` repository instructions.
- The Trivy YAML example used `scan.vuln-type`, which does not match the current configuration-file schema. Replaced it with the current `pkg.types` configuration.
- The Snyk Dockerfile command used `snyk iac test ./Dockerfile`, but Dockerfile analysis for container images is documented under Snyk Container. Replaced it with `snyk container test myapp:latest --file=Dockerfile`.
- The GitLab scan jobs attempted to `docker load` an image inside scanner containers without defining a Docker service for those jobs. Updated Trivy to scan the saved artifact with `trivy image --input image.tar` and Snyk to scan it with `snyk container test docker-archive:image.tar`.
- The GitLab Docker-in-Docker jobs did not set the Docker host/TLS variables commonly required for the `docker:dind` service. Added `DOCKER_HOST: tcp://docker:2375` and `DOCKER_TLS_CERTDIR: ""`.

## Review Notes
- The GitHub Actions and Jenkins examples are technically plausible but use mutable action/image references such as `@master` or `:latest`; pinning to immutable versions or digests would improve supply-chain reproducibility in a future hardening pass.
- The Dockerfile remains an illustrative Node.js example and assumes the project has a `build` script that creates `dist`, plus a `healthcheck.js` file.
