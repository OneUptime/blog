# Validation Summary: How to Choose Between Scratch and Distroless Base Images

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Dockerfile multi-stage builds
- Docker scratch base image
- GoogleContainerTools distroless images
- Docker Scout
- Go static binaries
- Rust musl builds
- Java distroless runtime images

## Sources Consulted
- Docker Hub scratch official image documentation: https://hub.docker.com/_/scratch
- Docker CLI reference for `docker build`: local `docker build --help`
- Docker CLI reference for `docker images`: local `docker images --help`
- Docker CLI reference for `docker exec`: local `docker exec --help` and https://docs.docker.com/engine/reference/commandline/exec
- Docker Scout CLI reference for `docker scout cves`: https://docs.docker.com/reference/cli/docker/scout/cves/
- Dockerfile reference for `ENTRYPOINT`, `CMD`, and build arguments: https://docs.docker.com/reference/builder/
- GoogleContainerTools distroless README: https://github.com/GoogleContainerTools/distroless
- GoogleContainerTools distroless support policy: https://raw.githubusercontent.com/GoogleContainerTools/distroless/main/SUPPORT_POLICY.md
- GoogleContainerTools distroless Java image documentation: https://raw.githubusercontent.com/GoogleContainerTools/distroless/main/java/README.md
- GoogleContainerTools distroless Node.js image documentation: https://raw.githubusercontent.com/GoogleContainerTools/distroless/main/nodejs/README.md
- GoogleContainerTools distroless Python image documentation: https://raw.githubusercontent.com/GoogleContainerTools/distroless/main/python3/README.md

## Issues Found
- The post used Debian 12 distroless language runtime tags for Java, Python, and Node.js. Distroless support policy lists Debian 12 language runtime images as past their support windows in 2026, and current language documentation lists Debian 13 runtime tags. Updated the image list and examples to `*-debian13`.
- The Java distroless example used an explicit `ENTRYPOINT ["java", "-jar", "/app/myapp.jar"]`. The current distroless Java documentation states that the image entrypoint is already equivalent to `java -jar` and expects the JAR path in `CMD`. Changed the example to `CMD ["/app/myapp.jar"]`.
- The debugging section said scratch containers cannot be exec'd into at all. `docker exec` can run commands that exist in a running container; the real limitation is that scratch has no shell unless one is copied in. Updated the wording accordingly.

## Review Notes
The Docker CLI commands and flags shown in the post are valid. The distroless debug shell path `/busybox/sh`, CA certificate bundle, timezone data, and `/etc/passwd` presence were also checked against a current `gcr.io/distroless/static-debian13:debug` image locally.
