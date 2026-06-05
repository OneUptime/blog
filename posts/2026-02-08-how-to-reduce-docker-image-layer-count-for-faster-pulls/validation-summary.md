# Validation Summary: How to Reduce Docker Image Layer Count for Faster Pulls

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Dockerfile syntax
- Docker BuildKit
- Docker Buildx
- OCI/Docker image distribution
- npm
- dive

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker multi-stage builds documentation: https://docs.docker.com/build/building/multi-stage/
- Docker buildx build CLI reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker image build legacy builder and squash documentation: https://docs.docker.com/reference/cli/docker/image/build/
- Docker image pull CLI reference: https://docs.docker.com/reference/cli/docker/image/pull/
- OCI Distribution Specification: https://specs.opencontainers.org/distribution-spec/
- npm `ci` help output from npm 10.9.4
- dive CLI help from `wagoodman/dive:latest` and project README: https://github.com/wagoodman/dive

## Issues Found
- The pull-speed section incorrectly said Docker makes at least two HTTP requests per layer, including a per-layer manifest check. Updated it to describe manifest resolution followed by blob downloads for missing layers.
- The multi-stage build section implied layers are copied from previous stages into the final image. Updated it to clarify that `COPY --from` copies selected files into new final-stage layers, and fixed the example comment from two COPY layers to three.
- The `COPY --link` section overstated parallel pull/extract behavior. Updated it to match Docker's documented behavior around independent linked layers, cache reuse, and rebasing.
- The BuildKit `--output type=docker` example incorrectly described the output as a single-layer image. Replaced it with `docker buildx build --load`, which is the documented shorthand for loading a BuildKit result into the local image store.
- The squashing section overstated layer-sharing and cache effects. Updated it to say the legacy builder squashes newly built layers, loses sharing for those squashed application layers, may use more local storage, and requires experimental legacy-builder support.
- The Python heredoc example undercounted custom filesystem layers. Updated the text from 3 custom layers to 4 custom filesystem layers.
- The Node cache example described three literal layers even though the Dockerfile creates multiple filesystem layers. Updated the labels and explanation to call them cache groups.
- Replaced `npm ci --production` with the current `npm ci --omit=dev` form.
- Removed `docker builder prune` from the pull benchmark because BuildKit build cache is unrelated to timing `docker pull`.

## Review Notes
The remaining commands and snippets were consistent with the checked references. The practical layer-count targets are experience-based guidance rather than a normative Docker rule.
