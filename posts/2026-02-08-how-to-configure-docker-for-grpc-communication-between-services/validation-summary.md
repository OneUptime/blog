# Validation Summary: How to Configure Docker for gRPC Communication Between Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- gRPC
- Protocol Buffers
- Go gRPC server implementation
- gRPC health checking
- grpc_health_probe
- grpcurl
- TLS for gRPC
- Envoy gRPC load balancing
- PostgreSQL container health checks

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference, including `depends_on` and `service_healthy`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networking guide: https://docs.docker.com/compose/how-tos/networking/
- Dockerfile reference: https://docs.docker.com/reference/builder
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC reflection guide: https://grpc.io/docs/guides/reflection/
- gRPC Go health package documentation: https://pkg.go.dev/google.golang.org/grpc/health
- grpc-health-probe README and flag reference: https://github.com/grpc-ecosystem/grpc-health-probe
- grpcurl README and usage reference: https://github.com/fullstorydev/grpcurl
- Envoy HTTP connection manager v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy upstream HTTP protocol options v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto

## Issues Found
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it because the current Compose Specification treats `version` as informative only and emits an obsolete-field warning.
- The Compose network was referenced later as `grpc-network`, but Compose normally prefixes network names with the project name unless an explicit `name` is set. Added `name: grpc-network` to make the later commands accurate.
- The TLS health check referenced `/certs/ca.crt` without mounting that file into the container. Added a read-only CA certificate volume mount.
- The `grpcurl` examples used `docker exec user-service grpcurl`, but the article's runtime image is distroless and only copies the server binary and health probe, so `grpcurl` would not exist in the container. Replaced those commands with the official `fullstorydev/grpcurl` Docker image attached to the same Compose network.
- The debugging commands used tools such as `ss`, `grep`, and `nc` inside application containers, which is inconsistent with the distroless runtime image. Replaced them with `docker compose ps`, a temporary BusyBox container for TCP connectivity, Compose logs, and network inspection.

## Review Notes
The examples are now technically correct for current Docker Compose v2 behavior and standard gRPC tooling. The `grpc_health_probe` download remains pinned to `v0.4.25`, which is usable but should be periodically reviewed for newer releases and multi-architecture image builds.
