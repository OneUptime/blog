# Validation Summary: How to Use ArgoCD gRPC API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD API server
- gRPC and Protocol Buffers
- grpc-gateway / REST API
- grpcurl
- Go Argo CD API client
- Python subprocess wrapper for grpcurl
- Kubernetes / GitOps

## Sources Consulted
- Argo CD API docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD ApplicationService proto: https://github.com/argoproj/argo-cd/blob/master/server/application/application.proto
- Argo CD SessionService proto: https://github.com/argoproj/argo-cd/blob/master/server/session/session.proto
- Argo CD API client source: https://github.com/argoproj/argo-cd/blob/master/pkg/apiclient/apiclient.go
- Argo CD ingress docs for gRPC/HTTPS server behavior: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/ingress/
- grpcurl official README: https://github.com/fullstorydev/grpcurl
- Go package docs for Argo CD ApplicationService client: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/pkg/apiclient/application

## Issues Found
- The session-token `curl` example omitted the JSON content type. Added `-H "Content-Type: application/json"` to match the official API docs.
- The application list filter used the legacy `project` field. Updated examples to use the current `projects` field from `ApplicationQuery`.
- The streaming `jq` example used `.result.application...`, but `grpcurl` prints each server-streamed response message directly. Updated the paths to `.application...`.
- The Go example used the Argo CD v2 module path even though the current official module is v3. Updated imports to `github.com/argoproj/argo-cd/v3/...`.
- The Python sample imported `json` and `subprocess` inside the class body, which would not make them available as unqualified names inside methods. Moved those imports to module scope.
- The Python section said to use `grpcio` but then demonstrated a `grpcurl` subprocess wrapper. Adjusted the introductory sentence to accurately describe the example.
- The gRPC advantages section implied bidirectional communication as an Argo CD use case. Changed it to streaming RPCs, matching Argo CD's server-streaming watch and log APIs.

## Review Notes
The examples assume the Argo CD API server is reachable with native gRPC over HTTP/2. Deployments behind proxies that do not support HTTP/2 may require gRPC-Web or different ingress configuration.
