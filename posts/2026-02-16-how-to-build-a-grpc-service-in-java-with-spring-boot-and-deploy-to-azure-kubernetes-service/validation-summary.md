# Validation Summary: How to Build a gRPC Service in Java with Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- gRPC
- Protocol Buffers
- Java 17
- Spring Boot
- grpc-spring-boot-starter
- Maven
- Docker
- Azure Container Registry
- Azure Kubernetes Service
- Kubernetes Deployments, Services, and gRPC probes
- grpcurl
- Spring Boot Actuator and Micrometer

## Sources Consulted
- gRPC introduction: https://grpc.io/docs/what-is-grpc/introduction/
- gRPC Java README and Maven protobuf plugin example: https://github.com/grpc/grpc-java
- grpc-spring-boot-starter getting started guide: https://grpc-ecosystem.github.io/grpc-spring/en/server/getting-started.html
- grpc-spring-boot-starter version table: https://yidongnan.github.io/grpc-spring-boot-starter/en/versions.html
- grpc-spring-boot-starter actuator and health documentation: https://grpc-ecosystem.github.io/grpc-spring/en/actuator.html
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Service appProtocol documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- grpcurl README: https://github.com/fullstorydev/grpcurl
- Azure AKS and ACR integration documentation: https://learn.microsoft.com/azure/aks/cluster-container-registry-integration
- Spring Boot 2.7 Actuator Prometheus documentation: https://docs.spring.io/spring-boot/docs/2.7.15/reference/html/actuator.html

## Issues Found
- The post claimed the tutorial produced a "production-ready" service even though the sample uses in-memory storage, plaintext gRPC, skipped Docker build tests, and minimal operational configuration. Changed the wording to describe a working cloud-deployed service instead.
- The Maven snippet omitted the Java 9+ annotation dependency needed by generated gRPC stubs when using the documented grpc-spring setup. Added `jakarta.annotation:jakarta.annotation-api:1.3.5` as an optional dependency.
- The Azure Container Registry commands assumed `myregistry` already existed. Added `az acr create` and clarified that the ACR name must be globally unique.
- The Kubernetes section said `appProtocol: grpc` was required because gRPC requires HTTP/2. Kubernetes documents `appProtocol` as a hint, and `kubernetes.io/h2c` is the built-in value for cleartext HTTP/2. Updated the explanation and manifest.
- The monitoring section implied Prometheus metrics could be exposed with configuration alone. Clarified that Spring Boot Actuator and `micrometer-registry-prometheus` must be added to provide the needed `MeterRegistry` and endpoint.
- The final paragraph overstated AKS as eliminating concern for all underlying infrastructure. Updated it to the more accurate statement that AKS manages the Kubernetes control plane.

## Review Notes
The examples remain intentionally minimal. A production version should add persistent storage, TLS or mTLS, automated tests, authentication, appropriate ingress or Gateway configuration, image scanning, and more complete observability.
