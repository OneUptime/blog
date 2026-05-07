# Validation Summary: How to Create a Multi-Stage Containerfile for Production with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- Multi-stage container builds
- Go
- Node.js and npm
- Python and pip
- Java, Maven, and Spring Boot layered JARs
- Alpine Linux

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Dockerfile reference for `COPY --from`, `FROM`, `USER`, `HEALTHCHECK`, `ENTRYPOINT`, and `CMD`: https://docs.docker.com/reference/dockerfile/
- npm `ci` command documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- pip `install` command documentation: https://pip.pypa.io/en/stable/cli/pip_install/
- Spring Boot executable JAR and launcher documentation: https://docs.spring.io/spring-boot/specification/executable-jar/launching.html
- Spring Boot layered JAR / layertools documentation: https://docs.spring.io/spring-boot/docs/2.4.x/reference/htmlsingle/

## Issues Found
- The scratch-based Go security hardening example built the binary at `/server` but attempted to copy it from `/app/server`. Changed `COPY --from=builder /app/server /server` to `COPY --from=builder /server /server` so the runtime stage copies the actual build output.
- The frontend/backend section said independent stages can be built in parallel by Podman's build engine. Podman documents concurrent stage execution through the `--jobs` option, so the wording now says this is possible when using `podman build --jobs`.

## Review Notes
- The examples are generally accurate as illustrative production patterns, but several snippets assume application-specific files and commands exist, such as `go.mod`, `package-lock.json`, `npm run build`, `npm run test`, `requirements.txt`, `gunicorn`, Spring Boot layertools support, and health endpoints.
- The post pins older-but-valid image tags such as Go 1.22, Node 20, Alpine 3.19, and nginx 1.25. These tags may no longer be the latest available, but pinning versions is technically valid and aligns with the reproducibility guidance in the post.
