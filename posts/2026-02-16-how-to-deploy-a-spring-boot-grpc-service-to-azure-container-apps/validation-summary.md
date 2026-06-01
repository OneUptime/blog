# Validation Summary: How to Deploy a Spring Boot gRPC Service to Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot
- gRPC Java
- Protocol Buffers
- Maven
- Docker
- Azure Container Apps
- Azure Container Registry
- Azure CLI

## Sources Consulted
- Spring Boot Web reference: https://docs.spring.io/spring-boot/reference/web/index.html
- gRPC Java generated-code reference: https://grpc.io/docs/languages/java/generated-code/
- gRPC Java README and Maven dependency guidance: https://github.com/grpc/grpc-java
- grpc-spring-boot-starter documentation: https://grpc-ecosystem.github.io/grpc-spring/en/
- grpc-spring-boot-starter configuration reference: https://grpc-ecosystem.github.io/grpc-spring/en/server/configuration.html
- Azure Container Apps ingress documentation: https://learn.microsoft.com/en-us/azure/container-apps/ingress-how-to
- Azure Container Apps health probes documentation: https://learn.microsoft.com/en-us/azure/container-apps/health-probes
- Azure Container Apps inter-app communication and HTTP/2 transport documentation: https://learn.microsoft.com/en-us/azure/container-apps/connect-apps
- Azure Container Apps scaling documentation: https://learn.microsoft.com/en-us/azure/container-apps/scale-app
- Azure CLI `az containerapp` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure Container Apps YAML update workflow: https://learn.microsoft.com/en-us/azure/container-apps/tutorial-scaling
- Maven Central POM for `net.devh:grpc-server-spring-boot-starter:3.0.0.RELEASE`: https://repo1.maven.org/maven2/net/devh/grpc-server-spring-boot-starter/3.0.0.RELEASE/grpc-server-spring-boot-starter-3.0.0.RELEASE.pom

## Issues Found
- The `pom.xml` snippet defined an HTTP health controller but did not include `spring-boot-starter-web`. Added the Spring MVC starter so `@RestController`, `@GetMapping`, and the embedded HTTP health endpoint are available.
- The `pom.xml` used `protoc-gen-grpc-java` 1.60.x with Java 17 but did not include `javax.annotation-api`. Added `javax.annotation:javax.annotation-api:1.3.2`, because that generator version can emit `javax.annotation.Generated`, which is not provided by Java 9+.
- The `.proto` comment described the streaming RPC as real-time product updates, but the implementation streams the current matching products and completes. Updated the comment to match the sample behavior.
- The health probe command used `configuration.ingress.additionalPortMappings`, which configures additional TCP ingress ports rather than Container Apps health probes. Replaced it with the documented `az containerapp show --output yaml`, `probes`, and `az containerapp update --yaml` workflow.
- The wrap-up told readers to expose a separate HTTP health-check port. Azure Container Apps probes can target a container port directly, and additional port mappings are not the right mechanism for HTTP probes. Updated the wording to say to configure health probes for the HTTP health endpoint.

## Review Notes
The Azure CLI and Maven executables were not installed in the review environment, so commands were checked against Microsoft Learn CLI/reference documentation and Maven artifact metadata rather than executed locally. The Spring Boot version in the snippet is older than current Spring Boot 3.x patch releases, but the post is version-specific and the shown APIs remain valid.
