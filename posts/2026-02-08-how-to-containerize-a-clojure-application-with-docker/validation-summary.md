# Validation Summary: How to Containerize a Clojure Application with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Dockerfile multi-stage builds
- Clojure
- Leiningen
- Ring
- Compojure
- JVM container memory tuning
- nREPL
- GraalVM Native Image
- Distroless container images

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- nREPL server usage documentation: https://nrepl.org/nrepl/usage/server.html
- GraalVM Community Edition container image documentation for JDK 21: https://www.graalvm.org/jdk21/docs/getting-started/container-images/
- Leiningen tutorial: https://leiningen.org/tutorial.html
- Local Docker CLI: `docker --version`, `docker compose version`, `docker manifest inspect`

## Issues Found
- The multi-stage Dockerfile copied `resources/` directly. A fresh `lein new app` project may not contain that directory, which would make `docker build` fail. Changed the example to copy the project contents after dependency resolution.
- The JVM tuning example set `JAVA_OPTS`, but the production Dockerfile uses exec-form `CMD ["java", ...]`, which does not expand that environment variable. Changed the example to pass the JVM flag directly in the overridden container command.
- The Docker Compose file used the legacy top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The development Dockerfile exposed an nREPL port but ran `lein run`, which does not start nREPL. Changed the command to start a headless nREPL on `0.0.0.0:7888` and adjusted the surrounding wording.
- The Docker Compose snippet mounted `./resources`, but the sample project does not create that directory. Removed the mount to keep the example aligned with the sample app.
- The GraalVM Dockerfile used `ghcr.io/graalvm/native-image:ol9-java21`, which did not resolve. Changed it to the documented `ghcr.io/graalvm/native-image-community:21` image and added `microdnf install -y curl` before downloading Leiningen.
- The GraalVM image-size and startup claim was too absolute for arbitrary Clojure/Ring applications. Reworded it to describe the improvement as possible rather than guaranteed.

## Review Notes
Docker Hub rate limits prevented local pulls of the Docker Hub `clojure` and `eclipse-temurin` images during review, so those examples were validated against Dockerfile syntax, documented image naming patterns, and official documentation rather than a full local build. The corrected GraalVM and distroless image references were verified with `docker manifest inspect`.
