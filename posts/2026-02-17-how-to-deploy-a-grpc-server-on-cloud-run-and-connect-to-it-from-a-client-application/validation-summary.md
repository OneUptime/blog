# Validation Summary: Deploy a gRPC Server on Cloud Run and Connect to It from a Client Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- gcloud CLI
- gRPC
- Protocol Buffers
- Python
- Docker
- grpcurl
- Google authentication / ID tokens

## Sources Consulted
- Cloud Run gRPC documentation: https://docs.cloud.google.com/run/docs/triggering/grpc
- Cloud Run HTTP/2 documentation: https://docs.cloud.google.com/run/docs/configuring/http2
- Cloud Run health checks documentation: https://docs.cloud.google.com/run/docs/configuring/healthchecks
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- gRPC Python basics tutorial: https://grpc.io/docs/languages/python/basics/
- gRPC reflection guide: https://grpc.io/docs/guides/reflection/
- grpcurl documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The Cloud Run health-check command used invalid `--startup-probe-type`, `--startup-probe-port`, `--liveness-probe-type`, and `--liveness-probe-port` flags. Updated it to the current `--startup-probe=grpc.port=...,grpc.service=...` and `--liveness-probe=grpc.port=...,grpc.service=...` syntax documented for `gcloud run deploy`.
- The server code comment said the gRPC health checking service is required for Cloud Run. It is only required when configuring gRPC health probes, so the comment was narrowed.
- The grpcurl examples assumed server reflection, but the sample server does not enable reflection. Updated the grpcurl commands to pass the local proto definition with `-import-path proto -proto catalog.proto`.

## Review Notes
- The core Cloud Run gRPC guidance is current: Cloud Run supports gRPC, the service should listen on the `PORT` environment variable, clients should use the service domain with port 443, and HTTP/2 should be enabled for native gRPC traffic.
- The Python gRPC implementation follows the official generated-code and server patterns. The local environment did not have `grpcio` or `grpcio-tools` installed, so runtime execution was not performed here.
