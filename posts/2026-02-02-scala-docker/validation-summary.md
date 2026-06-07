# Validation Summary: How to Use Docker with Scala Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Scala 3.3.1
- sbt 1.9.8
- sbt-native-packager 1.9.16
- Akka HTTP 10.5.3, Akka Actor Typed / Streams 2.8.5
- Logback 1.4.14
- ScalaTest 3.2.17
- Docker / Dockerfile / multi-stage builds
- Docker Compose
- Docker Buildx (multi-architecture builds)
- Eclipse Temurin JDK/JRE 21 images
- GraalVM Community 21 native-image
- jlink (custom JRE)
- Distroless (gcr.io/distroless/java21-debian12, distroless/base-debian12)
- Postgres 16, Prometheus, Grafana (compose stack)
- Kubernetes (Deployment, Service, HorizontalPodAutoscaler v2)
- GitHub Actions (checkout v4, setup-java v4, setup-qemu v3, setup-buildx v3, login v3, metadata v5, build-push v5)
- JVM container ergonomics (-XX:+UseContainerSupport, MaxRAMPercentage, G1GC, CDS, ExitOnOutOfMemoryError)
- Trivy image scanning

## Sources Consulted
- Eclipse Temurin Docker tags: https://hub.docker.com/_/eclipse-temurin
- sbtscala/scala-sbt image tag format: https://hub.docker.com/r/sbtscala/scala-sbt
- sbt-native-packager Docker plugin docs: https://sbt-native-packager.readthedocs.io/en/latest/formats/docker.html
- sbt-native-packager GraalVM native-image docs: https://sbt-native-packager.readthedocs.io/en/latest/formats/graalvm-native-image.html
- Akka HTTP routing DSL: https://doc.akka.io/docs/akka-http/current/routing-dsl/index.html
- Akka Typed: https://doc.akka.io/docs/akka/current/typed/actors.html
- GraalVM native-image options (JDK 21): https://www.graalvm.org/jdk21/reference-manual/native-image/overview/Options/
- jlink reference (JDK 21, including --compress=zip-N): https://docs.oracle.com/en/java/javase/21/docs/specs/man/jlink.html
- JVM container-awareness flags: https://docs.oracle.com/en/java/javase/21/vm/java-virtual-machine-features.html
- Distroless Java images: https://github.com/GoogleContainerTools/distroless/tree/main/java
- Docker HEALTHCHECK, multi-stage, and buildx docs: https://docs.docker.com/engine/reference/builder/, https://docs.docker.com/build/building/multi-platform/
- Kubernetes HPA v2 API and probes: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/, https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- GitHub Actions: docker/build-push-action, docker/metadata-action, docker/setup-buildx-action, actions/setup-java cache support

## Issues Found
No technical issues found.

The post is internally consistent and uses current, valid APIs and configuration:

- Scala 3.3.1 (indentation-based) `Main.scala` compiles against the Akka HTTP 10.5.x DSL and Akka Typed 2.8.x APIs used (`ActorSystem(Behaviors.empty, name)`, `Http().newServerAt(host, port).bind(routes)`, `concat`/`path`/`Segment`).
- sbt-native-packager Docker config (`Docker / packageName`, `Docker / version`, `dockerBaseImage`, `dockerExposedPorts`, `dockerEnvVars`, `dockerLabels`, `Docker / daemonUser`, `dockerCommands`, `dockerUpdateLatest`, `AshScriptPlugin`, `JavaAppPackaging`, `DockerPlugin`, `GraalVMNativeImagePlugin`) all match the plugin's public API. `Cmd("FROM", args @ _*)` pattern match against `com.typesafe.sbt.packager.docker.Cmd` is valid.
- `sbtscala/scala-sbt` tag format `eclipse-temurin-21_36_1.9.8_3.3.1` follows the documented `{distro}-{jdk}_{build}_{sbtVersion}_{scalaVersion}` scheme.
- JVM flags `-XX:+UseContainerSupport`, `-XX:MaxRAMPercentage`, `-XX:InitialRAMPercentage`, `-XX:+UseG1GC`, `-XX:MaxGCPauseMillis`, `-XX:+ExitOnOutOfMemoryError`, `-Xshare:dump|on`, `-XX:SharedArchiveFile` are all valid HotSpot options on JDK 21.
- `jlink --compress=zip-6` is the supported syntax on JDK 21 (the legacy `--compress=0|1|2` was deprecated).
- GraalVM native-image options (`--no-fallback`, `--enable-http`, `--enable-https`, `--install-exit-handlers`, `-H:+ReportExceptionStackTraces`, `--initialize-at-build-time`, `-H:+StaticExecutableWithDynamicLibC`) are accepted by GraalVM for JDK 21.
- `gcr.io/distroless/java21-debian12:nonroot` and `gcr.io/distroless/base-debian12` are real published images; UID 65532 / user `nonroot` is the documented non-root identity.
- Kubernetes manifests use current stable API versions (`apps/v1`, `autoscaling/v2`) and well-formed probe/securityContext/resources fields.
- GitHub Actions step versions (checkout v4, setup-java v4 with `cache: sbt`, setup-qemu v3, setup-buildx v3, login v3, metadata v5, build-push v5) are all current.

## Review Notes
- `version: '3.8'` in `docker-compose.yml` is still accepted, but the top-level `version` key is considered obsolete by recent Docker Compose v2 releases (they emit a warning and ignore it). Leaving it is harmless and matches many existing examples; future updates could drop the line.
- `--enable-http` / `--enable-https` are still accepted on GraalVM for JDK 21, but the modern equivalent is `--enable-url-protocols=http,https`. HTTPS in particular is enabled by default on recent native-image builds, so the explicit flag is redundant but not incorrect.
- `--initialize-at-build-time` without an explicit class list eagerly initializes everything at build time. It works for this minimal demo but tends to be too aggressive for real Akka HTTP services; readers adapting the snippet should expect to scope it (e.g. `--initialize-at-build-time=scala,akka.http`).
- The optimized-caching pattern of using a placeholder source file plus `rm -rf src` works, but `sbt update` (used in the first Dockerfile) is generally enough to pre-fetch dependencies without needing a placeholder; the two approaches are presented in different sections, which is fine.
- The post recommends `runAsNonRoot: true` and `readOnlyRootFilesystem: true` in the Kubernetes pod spec while the example image runs as `appuser` (created by sbt-native-packager / Dockerfiles, not uid 1000). The `runAsUser: 1000` in the pod `securityContext` will override the image's USER directive, so readers should ensure the application files are world-readable or set the image's UID to 1000 to match. This is a deployment-time consideration, not a technical error in the snippet itself.
