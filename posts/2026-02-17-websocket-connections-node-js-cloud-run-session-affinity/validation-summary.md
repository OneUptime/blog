# Validation Summary: How to Use WebSocket Connections in a Node.js Application on Cloud Run

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Cloud Run session affinity
- WebSockets
- Node.js
- Express
- ws
- Google Cloud CLI
- Docker
- npm

## Sources Consulted
- Google Cloud Run WebSockets documentation: https://docs.cloud.google.com/run/docs/triggering/websockets
- Google Cloud Run session affinity documentation: https://docs.cloud.google.com/run/docs/configuring/session-affinity
- Google Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Google Cloud SDK `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- ws README and API documentation: https://github.com/websockets/ws and https://raw.githubusercontent.com/websockets/ws/master/doc/ws.md
- npm `ci` documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci
- Google Cloud Blog announcement for Cloud Run WebSocket support: https://cloud.google.com/blog/products/serverless/cloud-run-gets-websockets-http-2-and-grpc-bidirectional-streams

## Issues Found
- The post incorrectly implied that session affinity is required to keep an already-established WebSocket connected to the same instance and that lack of session affinity can break the active connection. Updated the wording to clarify that an established WebSocket stays on its selected instance, while session affinity helps subsequent requests and reconnects reach the same instance when possible.
- The post described `K_REVISION` as an instance ID in the example response. Cloud Run documents `K_REVISION` as the revision name, so the response field was changed from `instanceId` / `instance` to `revision`.
- The server example used the `ws` `verifyClient` option. The current `ws` API documentation discourages this option and recommends handling authentication in the HTTP server's `upgrade` event instead, so the placeholder `verifyClient` block was removed.
- The Dockerfile used `npm ci --only=production`. npm now documents `--omit=dev` for omitting dev dependencies, so the command was updated to `npm ci --omit=dev`.
- The limitations section was made more precise about concurrency: each WebSocket connection counts toward Cloud Run request concurrency, which can be configured up to 1000 per container.

## Review Notes
- `gcloud` was not installed in the local workspace, so the Cloud Run deploy flags were verified against the official Google Cloud SDK reference rather than local `gcloud run deploy --help`.
- JavaScript examples were syntax-checked with Node.js v22.22.0. Runtime execution was not performed because the example dependencies are not installed in this blog repository.
- The chat-room example stores room state in process memory. This is acceptable for demonstrating the Cloud Run limitation, but production systems should synchronize state through an external message queue or data store when multiple instances are possible.
