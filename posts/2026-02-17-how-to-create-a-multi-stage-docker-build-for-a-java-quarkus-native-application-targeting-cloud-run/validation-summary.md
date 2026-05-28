# Validation Summary: How to Create a Multi-Stage Docker Build for a Java Quarkus Native App

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Quarkus
- Quarkus REST
- GraalVM Native Image
- Mandrel
- Docker multi-stage builds
- Google Cloud Run
- Google Cloud Build
- Artifact Registry
- Cloud Logging

## Sources Consulted
- Quarkus: Creating Your First Application - https://quarkus.io/guides/getting-started
- Quarkus: Building a Native Executable - https://quarkus.io/guides/building-native-image
- Quarkus: Quarkus Base Runtime Image - https://quarkus.io/guides/quarkus-runtime-base-image
- Quarkus: REST Jackson extension - https://quarkus.io/extensions/io.quarkus/quarkus-rest-jackson/
- Quarkus: Application Initialization and Termination - https://quarkus.io/guides/lifecycle
- Quarkus: Logging configuration - https://quarkus.io/guides/logging
- Quarkus: SmallRye Health - https://quarkus.io/guides/smallrye-health
- Google Cloud Run: Container runtime contract - https://cloud.google.com/run/docs/container-contract
- Google Cloud SDK: gcloud run deploy - https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Build: Build configuration file schema - https://cloud.google.com/build/docs/build-config-file-schema
- Artifact Registry: Create standard repositories - https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- Artifact Registry: Repository and image names - https://cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud SDK: gcloud logging read - https://cloud.google.com/sdk/gcloud/reference/logging/read

## Issues Found
- The Quarkus project creation command used legacy RESTEasy Reactive extension names. Updated it to use the current Quarkus REST extension names and added the health and JSON logging extensions needed by later configuration.
- The Dockerfile used older/non-current Quarkus image names. Updated the builder and runtime stages to the current UBI9 Mandrel builder and UBI9 Quarkus micro runtime image names from the Quarkus native executable guide.
- The Dockerfile copied `mvnw` without ensuring it was executable and ran the final image without the current non-root runtime permissions pattern. Added `--chmod=0755`, runtime ownership, and `USER 1001`.
- The Maven dependency plugin version in the cache layer was older than the version used in the current Quarkus sample. Updated it to `3.8.1`.
- The runtime image explanation said the default binary was statically compiled. Clarified that the micro image provides the system libraries needed by the native executable.
- The graceful shutdown timeout used an unqualified duration. Updated it to `10s` to match Quarkus duration configuration style.
- The JSON logging configuration used `quarkus.log.console.json=true`, which is not the current property. Updated it to `quarkus.log.console.json.enabled=true` and added the Google Cloud JSON format setting.
- The log-reading command selected only `textPayload`, which would miss JSON-formatted log messages. Updated the format to show both `textPayload` and `jsonPayload.message`.
- The static linking section did not mention that fully static native executables are experimental in Quarkus. Added that caveat.

## Review Notes
The tutorial is technically relevant and valid after the corrections. Startup times, memory sizing, build duration, and image size claims are workload-dependent and should be treated as examples rather than guarantees.
