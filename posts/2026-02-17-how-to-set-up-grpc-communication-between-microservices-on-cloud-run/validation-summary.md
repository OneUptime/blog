# Validation Summary: How to Set Up gRPC Communication Between Microservices on Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- gRPC
- Protocol Buffers
- Go
- Docker
- Google Cloud CLI
- Cloud Build
- grpcurl
- Cloud Run service-to-service authentication

## Sources Consulted
- Google Cloud Run gRPC documentation: https://docs.cloud.google.com/run/docs/triggering/grpc
- Google Cloud Run HTTP/2 configuration documentation: https://docs.cloud.google.com/run/docs/configuring/http2
- Google Cloud Run service-to-service authentication documentation: https://docs.cloud.google.com/run/docs/authenticating/service-to-service
- Google Cloud SDK `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK `gcloud auth print-identity-token` reference: https://cloud.google.com/sdk/gcloud/reference/auth/print-identity-token
- grpc-go package reference: https://pkg.go.dev/google.golang.org/grpc
- gRPC Go quick start: https://grpc.io/docs/languages/go/quickstart/
- Protocol Buffers Go generated code guide: https://protobuf.dev/reference/go/go-generated/
- grpcurl project documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The post stated that Cloud Run defaults to HTTP/1.1 and that all gRPC calls fail without `--use-http2`. Google documentation is more nuanced: Cloud Run supports native gRPC traffic, recommends HTTP/2 for gRPC services, and requires HTTP/2 for streaming gRPC features. Updated the explanation to reflect that Cloud Run forwards HTTP/2 cleartext (`h2c`) to the container after TLS termination.
- The private Cloud Run service example deployed the server with `--no-allow-unauthenticated`, but the client connection did not use the authentication helper. Updated the client example to use `createAuthenticatedConnection` when `USER_SERVICE_AUDIENCE` is set, and added that environment variable to the client deployment command.
- The grpcurl test generated an identity token without explicitly setting the Cloud Run service URL as the token audience. Updated the command to use `gcloud auth print-identity-token --audiences="$SERVICE_URL"` and separated `SERVICE_URL` from `SERVICE_HOST` so the URL can be used for the audience and the host can be used for the gRPC target.
- The performance comparison used absolute numeric claims for protobuf size and gRPC latency that are workload-dependent. Reworded these claims to describe the generally correct benefits without unsupported fixed multipliers.
- The introduction said shared service definitions eliminate drift with REST APIs. Reworded to "reducing drift" because generated contracts help but do not categorically eliminate API drift.

## Review Notes
The Go and gcloud CLIs were not installed in the review environment, so code and command validation was performed by static review against official documentation rather than by compiling or running the examples locally.
