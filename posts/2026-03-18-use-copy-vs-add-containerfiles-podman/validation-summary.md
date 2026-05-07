# Validation Summary: How to Use COPY vs ADD in Containerfiles for Podman

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Containerfile/Dockerfile syntax
- COPY and ADD instructions
- Multi-stage container image builds
- .containerignore
- npm
- sha256sum

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Containers/Common `Containerfile(5)` documentation: https://raw.githubusercontent.com/containers/common/main/docs/Containerfile.5.md
- Debian manpage for current `Containerfile(5)` from `golang-github-containers-common`: https://manpages.debian.org/testing/golang-github-containers-common/Containerfile.5.en.html
- Docker Dockerfile reference for Docker-compatible ADD/COPY behavior: https://docs.docker.com/reference/dockerfile/
- npm `ci` documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- GNU coreutils `sha256sum` behavior checked via local command usage expectations.

## Issues Found
- The post said `COPY` cannot download from URLs. Podman's current Containerfile documentation allows remote file URLs for `COPY`, so the comparison and conclusion were updated to say URL downloads should be avoided with either `ADD` or `COPY` and handled with `RUN curl` or `RUN wget` instead.
- The post said `ADD` does everything `COPY` does. This was too broad because `COPY` supports `--from` for previous stages, contexts, and images, while `ADD` does not. The wording was narrowed to ordinary build-context files and directories.
- The `sha256sum -c` example used the `sha256:` digest prefix. `sha256sum -c` expects the raw hexadecimal digest followed by the filename, so the example was corrected to the proper checksum-file format.
- The Node.js pattern used `npm ci --only=production` before `npm run build`. Current npm documentation describes dependency omission with `--omit`, and omitting dev dependencies before a build can break common build scripts. The example was changed to `npm ci`.

## Review Notes
The main guidance remains correct: prefer `COPY` for ordinary file transfer, reserve `ADD` for local tar extraction, use `COPY --from` for multi-stage builds, and prefer `RUN` with curl or wget for remote downloads when checksum verification, permissions, and cleanup are needed.
