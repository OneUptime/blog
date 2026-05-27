# Validation Summary: How to Optimize Docker Images with Multi-Stage Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker multi-stage builds
- Dockerfile syntax and image build commands
- Node.js and npm
- Go
- Python virtual environments and Gunicorn
- Java, Maven, and Spring Boot layered jars
- Distroless and scratch container images

## Sources Consulted
- Docker multi-stage builds documentation: https://docs.docker.com/build/building/multi-stage/
- Dockerfile reference: https://docs.docker.com/reference/builder
- Dockerfile best practices: https://docs.docker.com/engine/userguide/eng-image/dockerfile_best-practices/
- Docker CLI help for `docker build`, `docker images`, and `docker history`
- Node.js release schedule / Release Working Group: https://github.com/nodejs/Release
- Node Docker Official Image documentation: https://hub.docker.com/_/node
- npm `prune` documentation: https://docs.npmjs.com/cli/v11/commands/npm-prune/
- Go release history and support policy: https://go.dev/doc/devel/release
- Go Docker Official Image documentation: https://hub.docker.com/_/golang
- Python `venv` documentation: https://docs.python.org/3.12/library/venv.html
- Python Docker Official Image documentation: https://hub.docker.com/_/python
- Gunicorn run documentation: https://gunicorn.org/run/
- Spring Boot executable jar launching documentation: https://docs.spring.io/spring-boot/specification/executable-jar/launching.html
- GoogleContainerTools distroless image documentation: https://github.com/GoogleContainerTools/distroless

## Issues Found
- The Node.js examples used `node:20` and `node:20-alpine`. Node.js 20 reached end of life on April 30, 2026, so the examples now use `node:24` and `node:24-alpine`.
- The distroless Node.js example used `gcr.io/distroless/nodejs20-debian12`, which is no longer the current LTS-oriented example. It now uses `gcr.io/distroless/nodejs24-debian13`.
- The Go example used `golang:1.22-alpine`. Go 1.22 is outside the Go support window as of 2026, so the example now uses `golang:1.26-alpine`.
- The Node.js example used `npm prune --production`. Current npm documentation describes `--omit=dev`, so the command was updated to `npm prune --omit=dev`.
- The post stated that a multi-stage Node.js image can be under 100 MB and showed a `90MB` optimized image example. That is too absolute for a Node runtime image and depends heavily on the base image and dependencies, so the language and example were made less specific.
- The post said Go produces static binaries. Go can produce static binaries when built appropriately, such as with `CGO_ENABLED=0`, so the wording was corrected.
- The post said a `scratch` image contains absolutely nothing except the binary, but the example also copies CA certificates. The explanation now says `scratch` starts empty and contains only copied files.

## Review Notes
- The Docker multi-stage build explanation, `FROM` stage behavior, `COPY --from`, Docker CLI commands, Python virtualenv pattern, Gunicorn factory syntax, and Spring Boot `JarLauncher` usage are technically valid.
- Alpine images are useful for size reduction, but the Node Docker Official Image documentation notes musl libc compatibility caveats. That is worth expanding in a future revision.
