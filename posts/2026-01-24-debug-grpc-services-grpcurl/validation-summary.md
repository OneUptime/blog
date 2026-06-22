# Validation Summary: How to Debug gRPC Services with grpcurl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- grpcurl
- gRPC server reflection
- Protocol Buffers
- Go gRPC
- Python gRPC
- Node.js gRPC
- TLS and mTLS
- gRPC metadata headers
- gRPC health checking
- Docker Compose
- GitHub Actions

## Sources Consulted
- grpcurl official README: https://github.com/fullstorydev/grpcurl
- grpcurl CLI source and flag definitions: https://github.com/fullstorydev/grpcurl/blob/master/cmd/grpcurl/grpcurl.go
- grpcurl latest GitHub release API: https://api.github.com/repos/fullstorydev/grpcurl/releases/latest
- gRPC reflection guide: https://grpc.io/docs/guides/reflection/
- gRPC-Go server reflection tutorial: https://github.com/grpc/grpc-go/blob/master/Documentation/server-reflection-tutorial.md
- gRPC-Go reflection package docs: https://pkg.go.dev/google.golang.org/grpc/reflection
- gRPC Python server reflection docs: https://github.com/grpc/grpc/blob/master/doc/python/server_reflection.md
- gRPC Node reflection package README: https://github.com/grpc/grpc-node/tree/master/packages/grpc-reflection
- @grpc/grpc-js server source: https://github.com/grpc/grpc-node/blob/master/packages/grpc-js/src/server.ts
- Docker Hub grpcurl image page: https://hub.docker.com/r/fullstorydev/grpcurl
- grpcurl Dockerfile: https://github.com/fullstorydev/grpcurl/blob/master/Dockerfile
- GitHub Actions checkout action: https://github.com/actions/checkout

## Issues Found
- The Node.js reflection example used `grpc-reflection-js` as a server reflection implementation. That package is a reflection client library, not the current official gRPC Node server reflection package. Changed the example to use `@grpc/reflection` and its `ReflectionService` API.
- The Node.js example called `server.start()` after `bindAsync()`. In current `@grpc/grpc-js`, `start()` is deprecated and no longer necessary. Removed the call.
- The Docker Compose grpcurl sidecar overrode the official image entrypoint with `["sh", "-c"]`, but the official grpcurl image uses `/bin/grpcurl` as its entrypoint and the scratch variant does not provide `sh`. Changed the service to pass grpcurl arguments via `command`.
- The GitHub Actions workflow used `actions/checkout@v3`, which is outdated compared with the maintained checkout action. Updated it to `actions/checkout@v4`.
- The CI install step pinned grpcurl `v1.8.7`, while the latest official release is `v1.9.3`. Updated the download URL to `v1.9.3`.

## Review Notes
- The grpcurl commands, flags, reflection usage in Go and Python, TLS options, metadata header usage, streaming examples, timeout flags, and health check examples align with official documentation and grpcurl's current flag definitions.
- The Docker Compose healthcheck assumes the `grpc-server` image includes the `grpcurl` binary. That can be valid for an example server image, but a future revision could mention this prerequisite explicitly.
