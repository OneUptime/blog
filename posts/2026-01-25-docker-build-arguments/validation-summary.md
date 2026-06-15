# Validation Summary: How to Use Docker Build Arguments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile `ARG` and `ENV` instructions
- Docker BuildKit
- Docker Compose
- npm install flags
- Go build linker flags
- CI/CD build commands

## Sources Consulted
- Docker Docs: Build variables - https://docs.docker.com/build/building/variables/
- Docker Docs: Dockerfile reference (`ARG`, predefined ARGs, scope, cache impact) - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Build secrets - https://docs.docker.com/build/building/secrets/
- Docker Docs: `docker buildx build` CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Compose Build Specification (`build.args`) - https://docs.docker.com/reference/compose-file/build/
- Docker Docs: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- npm Docs: `npm ci` and `omit` configuration - https://docs.npmjs.com/cli/commands/npm-ci/
- Local CLI checks: `docker build --help`, `docker compose build --help`, `docker compose config`, and `bash -n`

## Issues Found
- The `ARG` vs `ENV` table said ARG values do not persist in the final image. Docker's current documentation is more nuanced: ARG values are not runtime environment variables, but they can appear in image history or provenance metadata. Updated the table entry.
- The CI command used an unquoted command substitution for `BUILD_DATE`. Quoted it so the generated timestamp is passed as a single argument.
- The npm examples used `npm ci --only=production`, which is a deprecated npm config alias. Replaced it with the current `npm ci --omit=dev`.
- The Docker Compose example included the obsolete top-level `version` field. Removed it while preserving the same services and build arguments.
- The BuildKit npm secret example mounted `$HOME/.npmrc` but read it into `NPM_TOKEN`, which does not match typical `.npmrc` use. Changed it to mount the secret as `/root/.npmrc` for `npm ci`.
- The predefined proxy ARG list omitted `ALL_PROXY` and `all_proxy`. Added both.
- The ARG scope example said an out-of-scope global ARG would fail. Docker expands an undefined or out-of-scope variable to an empty string in that position, so the comment now says it prints an empty value.
- The Mermaid diagram said each multi-stage build stage needs its own ARG. Docker allows ARG inheritance for stages based on a parent stage, so the diagram now says unrelated stages need their own ARG.

## Review Notes
The post is technically valid after the fixes. Some examples remain intentionally illustrative and depend on project files such as `package-lock.json`, `package.json`, Go source files, and application-specific npm scripts existing in the build context.
