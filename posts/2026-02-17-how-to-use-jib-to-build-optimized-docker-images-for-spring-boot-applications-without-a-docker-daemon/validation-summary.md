# Validation Summary: How to Use Jib to Build Optimized Docker Images for Spring Boot Apps Without a

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Jib Maven plugin
- Spring Boot
- Java
- Docker and container images
- Google Artifact Registry
- Google Cloud Build
- GraalVM native images

## Sources Consulted
- Jib Maven plugin README: https://github.com/GoogleContainerTools/jib/blob/master/jib-maven-plugin/README.md
- Jib project README: https://github.com/GoogleContainerTools/jib
- Jib Extensions README: https://github.com/GoogleContainerTools/jib-extensions
- Jib GraalVM Native Image Extension README: https://github.com/GoogleContainerTools/jib-extensions/tree/master/first-party/jib-native-image-extension-maven
- Google Cloud Artifact Registry repository creation docs: https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- gcloud artifacts repositories create reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud Artifact Registry Docker authentication docs: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud Artifact Registry Cloud Build configuration docs: https://cloud.google.com/artifact-registry/docs/configure-cloud-build
- Google Cloud Build substitution docs: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values

## Issues Found
- Updated the Jib Maven plugin version in examples from `3.4.0` to `3.5.1`, matching the current official Jib Maven plugin examples.
- Replaced an overbroad claim that Jib typically makes images 30-50% smaller. Jib's primary documented advantage is layered, cache-friendly incremental builds; final image size depends on dependencies, base image, architecture, and Dockerfile strategy.
- Completed the native-image extension example by adding the required `jib-native-image-extension-maven` plugin dependency and an `imageName` property matching the manual entrypoint. Jib extensions must be present on the plugin runtime classpath before they can be loaded.
- Clarified the Cloud Build credential note. Cloud Build uses its service account, and Artifact Registry writes require appropriate permissions, especially for cross-project repositories or custom service accounts.
- Clarified the image-size comparison language so it is presented as variable rather than guaranteed, and attributed size improvements to runtime base image choice and avoiding build tools in the final image.

## Review Notes
The Maven, Jib, Docker daemon, tarball, Artifact Registry repository creation, Docker credential helper, Cloud Build substitution, and Spring Boot controller snippets are otherwise technically plausible. The comparison numbers remain illustrative and should be re-measured for any specific application before being used as benchmark data.
