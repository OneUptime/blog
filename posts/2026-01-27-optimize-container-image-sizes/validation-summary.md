# Validation Summary: How to Optimize Container Image Sizes

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Docker and Dockerfiles
- Multi-stage container builds
- Docker build cache and layers
- .dockerignore
- Node.js and npm
- Python and pip
- Alpine Linux and apk
- Go static binaries
- Rust static binaries with musl
- Google distroless images
- Spring Boot layered jars
- Trivy and Grype image scanning

## Sources Consulted
- Docker Docs: Multi-stage builds, https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Dockerfile reference, https://docs.docker.com/reference/dockerfile/
- Docker Docs: Build context and .dockerignore, https://docs.docker.com/build/concepts/context/
- Docker Docs: Using the build cache, https://docs.docker.com/get-started/docker-concepts/building-images/using-the-build-cache/
- npm Docs: npm ci, https://docs.npmjs.com/cli/v9/commands/npm-ci/
- Node.js official release table, https://nodejs.org/en/about/previous-releases
- Go release history and release policy, https://go.dev/doc/devel/release
- Go cgo command documentation, https://pkg.go.dev/cmd/cgo
- Go command documentation, https://pkg.go.dev/cmd/go
- GoogleContainerTools distroless README, https://github.com/GoogleContainerTools/distroless
- Spring Boot Dockerfiles reference, https://docs.spring.io/spring-boot/reference/packaging/container-images/dockerfiles.html

## Issues Found
- The Node.js examples used `node:20-*`, but Node.js 20 is now EOL according to the official Node.js release table. Updated the examples to `node:24-*`.
- The Go example used `golang:1.22-alpine`, but Go 1.22 is no longer supported under Go's release policy. Updated it to `golang:1.26-alpine`.
- The Alpine Python example installed build dependencies in one layer and deleted them in a later layer. That removes them from the final filesystem but does not remove their bytes from the image history. Combined build dependency installation, pip installation, and `apk del .build-deps` into one `RUN` layer.
- The distroless table and image list used older generic image names and an obsolete Node.js 20 distroless image. Updated them to current Debian 13 distroless image names, including `nodejs24-debian13`.
- The Spring Boot layered JAR example used the older `-Djarmode=layertools` invocation and copied from paths that no longer match the current documented extraction command. Updated it to `-Djarmode=tools -jar ... extract --layers --destination extracted`, adjusted the copied paths, switched the Java distroless base to `java21-debian13`, and used `java -jar application.jar` as documented.
- The Java distroless example set `JAVA_OPTS`, but the exec-form `ENTRYPOINT` does not expand environment variables. Moved the JVM options directly into the `ENTRYPOINT` array so they are applied at runtime.

## Review Notes
- The `npm ci --omit=dev --ignore-scripts` example is valid, but `--ignore-scripts` can break dependencies that require install scripts for native builds or generated assets. Teams should test this before applying it broadly.
- The size values in the base image comparison are approximate and change as upstream images are rebuilt.
