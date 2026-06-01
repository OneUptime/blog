# Validation Summary: How to Build a gRPC Service in Node.js and Deploy to Azure App Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- gRPC
- Node.js
- @grpc/grpc-js
- @grpc/proto-loader
- Protocol Buffers
- Docker
- Azure App Service
- Azure Container Registry
- Azure CLI

## Sources Consulted
- Azure App Service gRPC configuration: https://learn.microsoft.com/en-us/azure/app-service/configure-grpc
- Azure App Service custom container port configuration: https://learn.microsoft.com/en-us/azure/app-service/configure-custom-container
- Azure App Service custom container CI/CD: https://learn.microsoft.com/en-us/azure/app-service/deploy-ci-cd-custom-container
- Azure App Service custom container tutorial with managed identity ACR pull: https://learn.microsoft.com/en-us/azure/app-service/tutorial-custom-container
- Azure CLI `az webapp config` reference: https://learn.microsoft.com/en-us/cli/azure/webapp/config
- Azure CLI `az webapp config container` reference: https://learn.microsoft.com/en-us/cli/azure/webapp/config/container
- Azure CLI `az webapp deployment container` reference: https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/container
- Azure App Service `http20ProxyFlag` SDK property reference: https://learn.microsoft.com/en-us/dotnet/api/azure.resourcemanager.appservice.siteconfigdata.http20proxyflag
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- `grpc-health-check` package documentation: https://www.npmjs.com/package/grpc-health-check
- `@grpc/proto-loader` package documentation: https://www.npmjs.com/package/@grpc/proto-loader
- `@grpc/grpc-js` package metadata and TypeScript declarations from npm package `@grpc/grpc-js@1.14.4`
- `uuid` package metadata from npm package `uuid@14.0.0`

## Issues Found
- The setup omitted a current runtime dependency for the health-check section and used `uuid` later as an ad hoc install. I changed the dependency installation to include `grpc-health-check` and removed the `uuid` install instruction.
- The server used `require('uuid')`, but the current `uuid` package is ESM-only. I replaced it with Node.js 20's built-in `crypto.randomUUID()`.
- The Dockerfile used `npm ci --only=production`, while current npm help documents `--omit=dev`. I updated the command to `npm ci --omit=dev`.
- The App Service custom container configuration used `PORT=50051`. App Service custom containers should use `WEBSITES_PORT`, and gRPC on App Service also requires `HTTP20_ONLY_PORT`. I changed the app settings and server port lookup accordingly.
- The App Service gRPC requirements say custom containers that support HTTP/2 must also support HTTP/1.1. I added a lightweight HTTP/1.1 `/health` listener on `WEBSITES_PORT` and kept gRPC on `HTTP20_ONLY_PORT`.
- The HTTP/2 section enabled HTTP/2 but did not configure the App Service HTTP/2 proxy for gRPC. I added a CLI-based `http20ProxyFlag=2` configuration.
- The ACR configuration claimed to configure registry access but did not provide credentials or managed identity settings. I changed it to assign a managed identity, grant `AcrPull`, and enable managed-identity-based image pulls.
- The health-check example manually loaded an internal package path and returned string enum values without configuring enum string loading. I replaced it with the official `grpc-health-check` `HealthImplementation` API.
- The interceptor example used the wrong server interceptor shape for `@grpc/grpc-js` and referenced `grpc` without importing it. I changed it to use `ResponderBuilder` and `ServerInterceptingCall`.

## Review Notes
The main server, HTTP health endpoint, and client snippets were tested locally with current `@grpc/grpc-js`, `@grpc/proto-loader`, and `grpc-health-check` packages. The Azure CLI commands were reviewed against current Microsoft Learn documentation, but they were not executed because the local environment does not have Azure CLI installed or Azure credentials configured.
