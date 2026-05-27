# Validation Summary: How to Build a Quarkus Native Application and Deploy It to Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Quarkus
- Java
- Jakarta REST
- Jackson
- SmallRye Health
- SmallRye OpenAPI
- GraalVM Native Image
- Mandrel
- Docker
- Google Cloud Build
- Google Artifact Registry
- Google Cloud Run
- gcloud CLI

## Sources Consulted
- Quarkus Maven tooling guide: https://quarkus.io/guides/maven-tooling
- Quarkus JSON REST services guide: https://quarkus.io/guides/rest-json
- Quarkus native executable guide: https://quarkus.io/guides/building-native-image
- Quarkus base runtime image guide: https://quarkus.io/guides/quarkus-runtime-base-image
- Google Cloud Build config schema: https://cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Run deploy CLI reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Run CPU limits: https://cloud.google.com/run/docs/configuring/services/cpu
- Google Cloud Run memory limits: https://cloud.google.com/run/docs/configuring/services/memory-limits
- Google Cloud Run autoscaling behavior: https://cloud.google.com/run/docs/about-instance-autoscaling
- GraalVM ImageInfo API reference: https://www.graalvm.org/sdk/javadoc/org/graalvm/nativeimage/ImageInfo.html
- Maven Central metadata for `io.quarkus.platform:quarkus-maven-plugin`: https://repo1.maven.org/maven2/io/quarkus/platform/quarkus-maven-plugin/maven-metadata.xml

## Issues Found
- The Quarkus project creation command used `quarkus-maven-plugin:3.6.0`, which is outdated and does not match the current Quarkus documentation for the `rest-jackson` extension. Updated it to `3.36.0`, the current release listed in Maven Central metadata and official Quarkus docs.
- The native image detection method checked only whether `org.graalvm.nativeimage.ImageInfo` was present. That can give misleading results because the API class can be on the classpath without the code running in a native image. Changed it to check the GraalVM native image runtime system property.
- The Dockerfile used old/non-current Quarkus image names: `quay.io/quarkus/ubi-quarkus-mandrel-builder-image:jdk-21` and `quay.io/quarkus/quarkus-micro-image:2.0`. Updated them to the current documented images: `quay.io/quarkus/ubi9-quarkus-mandrel-builder-image:jdk-21` and `quay.io/quarkus/ubi9-quarkus-micro-image:2.0`.
- The Dockerfile did not follow the current documented multi-stage permissions/user pattern. Updated the copy, ownership, and `USER 1001` steps to match the Quarkus native image guide more closely.
- The Cloud Run deploy command used `--memory 128Mi` without specifying the execution environment. Current Cloud Run docs note that services below 512Mi should use the first-generation execution environment. Added `--execution-environment gen1` and updated the surrounding explanation.

## Review Notes
- I could not run a local Maven compile because `mvn` is not installed in the workspace. The commands and snippets were checked against official documentation and Maven Central metadata instead.
- The Cloud Build example assumes that the Artifact Registry repository named `repo` already exists in `us-central1`.
- The cold-start and memory numbers are reasonable as rough expectations for simple Quarkus native services, but real values depend on application dependencies, Cloud Run execution environment, CPU boost, image size, network path, and whether an idle instance is still warm.
