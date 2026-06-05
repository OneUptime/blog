# Validation Summary: How to Implement Docker Image Promotion Between Registries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker images, tags, manifests, and registries
- Docker Scout
- GitHub Actions
- crane / go-containerregistry
- skopeo
- Dockerfile build arguments and labels
- npm dependency installation in container builds
- Bash promotion scripts

## Sources Consulted
- Docker CLI reference: docker image tag: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker CLI reference: docker manifest: https://docs.docker.com/reference/cli/docker/manifest/
- Docker CLI reference: docker scout cves: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker build variables and Dockerfile examples: https://docs.docker.com/build/building/variables/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions workflow commands / GITHUB_ENV: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- go-containerregistry crane command documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md
- skopeo project documentation: https://github.com/containers/skopeo
- skopeo-copy manual: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/

## Issues Found
- The GitHub Actions workflow set `SOURCE` in one step and used it in the next step without persisting it. GitHub Actions run steps execute separately, so I changed the workflow to write `SOURCE` to `$GITHUB_ENV`.
- The GitHub Actions verification step always compared the staging and production digests, even when promoting from dev to staging. I changed it to compare dev-to-staging for staging promotions and staging-to-production for production promotions.
- The Docker Scout gate used `docker scout cves --format json` and parsed `.critical`, but the current Docker Scout CLI does not provide a plain `json` format for `cves`; supported JSON-producing formats include SARIF, SPDX, GitLab, and SBOM. I changed the script to use `--exit-code --only-severity critical`.
- The Dockerfile used `npm ci --production`. I changed it to the current documented `npm ci --omit=dev` form.

## Review Notes
- The examples assume registry authentication has already been configured in Docker, crane, skopeo, or the CI runner. That is reasonable for a promotion guide, but a production workflow should include explicit login steps using the target registry's recommended authentication method.
- `docker manifest` is still documented by Docker as an experimental command. The example usage is correct, but teams that want a non-experimental inspection path can consider `docker buildx imagetools inspect` or `crane digest`/`crane manifest`.
