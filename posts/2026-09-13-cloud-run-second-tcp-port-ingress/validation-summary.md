# Validation Summary: Route Multiple Endpoints Through One Cloud Run Service Port

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Run services and worker pools
- HTTP, HTTPS, HTTP/2, gRPC, and WebSockets
- Cloud Run multi-container sidecars and Direct VPC ingress
- Docker and Dockerfile `EXPOSE`
- Node.js HTTP server APIs
- Google Cloud Managed Service for Prometheus

## Sources Consulted
- [Cloud Run container runtime contract](https://docs.cloud.google.com/run/docs/container-contract)
- [Configure Cloud Run service containers](https://docs.cloud.google.com/run/docs/configuring/services/containers)
- [Deploy multiple containers to a Cloud Run service](https://docs.cloud.google.com/run/docs/deploying#sidecars)
- [Use HTTP/2 for Cloud Run services](https://docs.cloud.google.com/run/docs/configuring/http2)
- [Use gRPC with Cloud Run](https://docs.cloud.google.com/run/docs/triggering/grpc)
- [Cloud Run WebSocket guidance](https://docs.cloud.google.com/run/docs/triggering/websockets)
- [Cloud Run Direct VPC networking](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc)
- [Cloud Run Managed Service for Prometheus sidecar](https://docs.cloud.google.com/run/docs/monitoring-managed-prometheus-sidecar)
- [Dockerfile `EXPOSE` reference](https://docs.docker.com/reference/dockerfile/#expose)
- [Node.js HTTP API](https://nodejs.org/api/http.html)

## Issues Found
No technical issues found.

## Review Notes
The Node.js example is valid ECMAScript-module code and requires the normal Node.js ESM context, such as a `.mjs` file or a package with `"type": "module"`. Cloud Run readiness probes are currently documented as a Preview feature; the post does not depend on a specific readiness-probe configuration.
