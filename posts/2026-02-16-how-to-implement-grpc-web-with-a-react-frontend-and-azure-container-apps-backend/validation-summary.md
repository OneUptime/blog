# Validation Summary: How to Implement gRPC-Web with a React Frontend and Azure Container Apps Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- gRPC-Web
- Protocol Buffers
- React
- Node.js
- @grpc/grpc-js
- Envoy Proxy
- Azure Container Apps
- Azure CLI

## Sources Consulted
- gRPC-Web official repository and code generation documentation: https://github.com/grpc/grpc-web
- Envoy gRPC-Web filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter
- Envoy CORS route configuration API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- @grpc/grpc-js API reference: https://www.jsdocs.io/package/@grpc/grpc-js
- Azure Container Apps CLI reference: https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure Container Apps ingress documentation: https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview
- Azure Container Apps inter-app communication documentation: https://learn.microsoft.com/en-us/azure/container-apps/connect-apps
- Homebrew protoc-gen-grpc-web formula: https://formulae.brew.sh/formula/protoc-gen-grpc-web

## Issues Found
- Envoy was configured to forward to `localhost:50051`, but the deployment commands create the backend and Envoy as separate Container Apps. In Azure Container Apps, separate apps should communicate by app name or FQDN, not `localhost`. Updated Envoy to use the backend app name `notes-backend` on the Container Apps HTTP ingress port.
- The backend Container App command did not allow insecure HTTP, while the Envoy upstream now uses the short internal `http://<APP_NAME>` service discovery path. Added `--allow-insecure true` to avoid HTTP-to-HTTPS redirects on the internal backend ingress.
- The Envoy CORS headers omitted `authorization`, even though the authentication section later sends an `authorization` metadata header. Added `authorization` to `allow_headers`.
- The client generation section mentioned installing `protoc` but only showed installing `protoc-gen-grpc-web`. Added `brew install protobuf` and `npm install -g protoc-gen-js`, matching the current gRPC-Web prerequisites for `--js_out`.
- The production TLS note said to enable TLS on Envoy directly. In Azure Container Apps, the relevant default setup is to use the HTTPS ingress endpoint with Container Apps TLS termination. Updated the wording accordingly.

## Review Notes
The examples are intentionally minimal and use an in-memory backend store, so note data is not durable across restarts or scale-out replicas. The gRPC-Web streaming statement is correct for `grpcwebtext`: server-side streaming is supported, while client-side and bidirectional streaming are not.
