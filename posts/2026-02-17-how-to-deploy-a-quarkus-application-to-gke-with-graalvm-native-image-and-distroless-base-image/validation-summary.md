# Validation Summary: How to Deploy a Quarkus Application to GKE with GraalVM Native Image

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Quarkus
- GraalVM Native Image and Mandrel
- Distroless container images
- Docker multi-stage builds
- Google Cloud Build
- Google Kubernetes Engine
- Kubernetes Deployments, Services, probes, and HorizontalPodAutoscaler
- Micrometer Prometheus metrics
- SmallRye Health

## Sources Consulted
- Quarkus Building a Native Executable: https://quarkus.io/guides/building-native-image
- Quarkus Creating Your First Application: https://quarkus.io/guides/getting-started
- Quarkus REST Jackson extension page: https://quarkus.io/extensions/io.quarkus/quarkus-rest-jackson/
- Quarkus SmallRye Health guide: https://quarkus.io/guides/smallrye-health
- Google Cloud SDK `gcloud builds submit` reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Distroless project README: https://github.com/GoogleContainerTools/distroless
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

## Issues Found
- The Quarkus project creation command used the older `resteasy-reactive-jackson` extension name. Updated it to the current `rest-jackson` extension name used by Quarkus REST.
- The Quarkus Maven plugin version in the project creation command was outdated for a 2026 tutorial. Updated it from `3.6.0` to `3.35.4`, matching the current official Quarkus getting-started documentation consulted during review.
- The Dockerfile used `./mvnw` but did not copy `mvnw` or `.mvn` into the build stage, so the build would fail. Updated the Dockerfile to copy the Maven wrapper files before running Maven.
- The Dockerfile used the older UBI 8 Mandrel builder image while current Quarkus native-image examples use the UBI 9 builder image for JDK 21. Updated the builder image to `quay.io/quarkus/ubi9-quarkus-mandrel-builder-image:jdk-21`.
- The Dockerfile comment called the Mandrel image a GraalVM builder image. Changed the comment to say Mandrel builder image, which is the actual image being used.
- The native binary copy path still referenced the old `/app` build work directory. Updated it to copy from `/code/target/*-runner`.

## Review Notes
- The image examples use `gcr.io` for both Container Registry-style application images and distroless images. Distroless still documents `gcr.io` tags, but Google Cloud projects generally prefer Artifact Registry for new application images.
