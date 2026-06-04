# Validation Summary: How to Use COPY --link for Better Layer Caching

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Docker
- Dockerfile `COPY`
- BuildKit
- Docker Buildx
- Multi-stage Docker builds
- Layer caching

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker BuildKit documentation: https://docs.docker.com/build/buildkit/
- Docker deprecated features documentation for Docker Engine 23.0 BuildKit defaults: https://docs.docker.com/engine/deprecated/
- Local Docker CLI checks: `docker buildx version`, `docker version`
- Local BuildKit behavior test for multiple `COPY --link` instructions targeting the same directory

## Issues Found
- The post incorrectly stated that two `COPY --link` instructions targeting the same directory cause the second copy to overwrite the first directory. A local BuildKit test showed directory entries are merged in the final image when the copied file names differ. Replaced this with Docker's documented limitation: `COPY --link` cannot read previous filesystem state and cannot follow destination symlinks created by earlier layers.
- The skip guidance incorrectly warned against using `--link` when multiple `COPY` instructions write to the same directory and need to merge. Updated it to warn against destination symlinks and other dependencies on previous filesystem state.
- The summary repeated the incorrect overwrite caveat. Updated it to mention the symlink/filesystem-state caveat.
- The ownership caveat implied `USER` changes might normally affect copied file ownership. Docker documents that copied files are created with UID and GID 0 unless `--chown` is used, so the wording was corrected.

## Review Notes
The main `COPY --link` cache behavior, Dockerfile syntax version requirement, BuildKit requirement, `COPY --from` usage, `--chown` usage, and Docker Engine 23.0 BuildKit default claim are consistent with Docker's official documentation. The benchmark numbers are presented as typical illustrative results rather than guaranteed values.
