# Validation Summary: How to Lint Dockerfiles with Hadolint

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Dockerfile
- Hadolint
- ShellCheck
- GitHub Actions
- GitLab CI
- Jenkins
- pre-commit
- npm

## Sources Consulted
- Hadolint README and CLI/configuration documentation: https://github.com/hadolint/hadolint/blob/master/README.md
- Hadolint releases: https://github.com/hadolint/hadolint/releases
- Hadolint Action README: https://github.com/hadolint/hadolint-action/blob/master/README.md
- Hadolint Action releases: https://github.com/hadolint/hadolint-action/releases
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker build best practices: https://docs.docker.com/build/building/best-practices/
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/

## Issues Found
- The introduction said `COPY` can be wrong when `ADD` is more appropriate, but the later example intended to demonstrate the more common Hadolint `DL3020` case where `ADD` is used for files or directories. Changed the wording to say `ADD` when `COPY` is more appropriate.
- The Linux binary install commands wrote to `/usr/local/bin` without elevated permissions. Added `sudo` to the `wget` and `chmod` commands so they work for a typical non-root user.
- The first sample Dockerfile used `ADD` with a remote URL, which does not trigger `DL3020`. Changed it to add a local `app/` directory so the sample matches the `DL3020` rule.
- The sample Hadolint output did not match current Hadolint 2.14.0 output. Updated the rule IDs, messages, line numbers, and additional findings for `DL3006`, `DL3015`, `DL3059`, `DL3003`, and the current `DL3025` wording.
- The text described `DL3007` as the rule for untagged base images. Changed it to `DL3006`; `DL3007` applies to explicit `latest` tags.
- The apt package pin example used a Debian curl package version with an Ubuntu 22.04 base image example. Changed it to a current Ubuntu 22.04 curl package version.
- The GitHub Actions and pre-commit examples pinned older Hadolint-related versions. Updated the Hadolint Action to `v3.3.0` and the pre-commit rev to Hadolint `v2.14.0`.
- The Node Dockerfile example used `npm ci --production`; changed it to the current `npm ci --omit=dev` form.
- The final explanation said every change in the Node Dockerfile corresponded to a Hadolint rule, but `npm ci` and dependency-copy ordering are general Docker/npm best practices rather than Hadolint findings for that example. Reworded the sentence to attribute only the base-image and CMD changes to Hadolint rules.

## Review Notes
- Verified the updated sample output by running `hadolint/hadolint` Docker image version 2.14.0 against the revised sample Dockerfile.
- `FROM node:20-slim` satisfies Hadolint's explicit-tag rule, but tags can still move. Pinning by digest would provide stronger reproducibility in a production hardening guide.
