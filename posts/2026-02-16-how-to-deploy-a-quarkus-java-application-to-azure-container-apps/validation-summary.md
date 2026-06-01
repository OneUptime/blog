# Validation Summary: How to Deploy a Quarkus Java Application to Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Quarkus
- Quarkus REST
- SmallRye Health
- Micrometer
- Jib
- Java
- Docker
- GraalVM and Mandrel native builds
- Azure Container Apps
- Azure Container Registry
- Azure CLI

## Sources Consulted
- Quarkus Getting Started guide: https://quarkus.io/guides/getting-started
- Quarkus REST Jackson extension: https://quarkus.io/extensions/io.quarkus/quarkus-rest-jackson/
- Quarkus SmallRye Health guide: https://quarkus.io/guides/smallrye-health
- Quarkus Building a Native Executable guide: https://quarkus.io/guides/building-native-image
- Quarkus Container Images guide: https://quarkus.io/guides/container-image
- Quarkus Base Runtime Image guide: https://quarkus.io/guides/quarkus-runtime-base-image
- Azure Container Apps CLI reference: https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure Container Apps health probes: https://learn.microsoft.com/en-us/azure/container-apps/health-probes
- Azure Container Apps scaling: https://learn.microsoft.com/en-us/azure/container-apps/scale-app
- Azure Container Apps image pull with managed identity: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull

## Issues Found
- The project creation commands used the older `resteasy-reactive-jackson` extension and an outdated Maven plugin version. Updated them to `rest-jackson` and Quarkus Maven plugin `3.36.0`, and adjusted the description to use the current Quarkus REST naming.
- The Jib container image configuration was shown without adding the Jib extension. Added `container-image-jib` to the scaffold commands.
- The health check snippet contained two public Java classes in one code block, which would not compile as one Java file. Split it into separate `LivenessCheck.java` and `ReadinessCheck.java` examples.
- The Jib image configuration used the Azure Container Registry host as `quarkus.container-image.group`. Changed it to `quarkus.container-image.registry`, which is the correct registry setting.
- The native Dockerfile used an outdated Quarkus micro image name and the build command referenced `Dockerfile.native`. Updated the example to the current `ubi9-quarkus-micro-image` and `Dockerfile.native-micro` pattern.
- The JVM Dockerfile used an older UBI 8 image. Updated it to the current UBI 9 OpenJDK 17 runtime image.
- The Azure Container Apps deployment referenced a private ACR image without registry credentials or identity configuration. Added a user-assigned managed identity and passed it with `--user-assigned` and `--registry-identity`.
- The health probes section claimed Container Apps automatically detects common health endpoint patterns. Corrected this to state that default TCP probes are added when ingress is enabled, and fixed probe `type` casing to match Azure Container Apps examples.
- The cost and cold-start claims were too absolute. Reworded them to reflect billing based on allocated CPU and memory while replicas run, and clarified that Quarkus native startup helps reduce application process startup time after the platform starts a replica.

## Review Notes
The performance table remains a rough illustrative comparison. Actual startup time, memory usage, image size, and cold-start latency depend on the application code, Java version, base image, Container Apps environment, image pull time, and configured resources.
