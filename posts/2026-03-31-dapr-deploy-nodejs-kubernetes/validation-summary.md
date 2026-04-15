# Validation Summary: How to Deploy Dapr Node.js Applications on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar injection, components, CLI, dashboard)
- Kubernetes (Deployments, Services, annotations, readiness probes)
- Node.js 20
- Docker (multi-stage containerization)
- Redis (as Dapr state store and pub/sub backend)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI reference (`dapr init -k`, `dapr status -k`, `dapr dashboard -k`): https://docs.dapr.io/reference/cli/
- Dapr Redis state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis pub/sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Component CRD (`dapr.io/v1alpha1`): https://docs.dapr.io/operations/components/component-schema/
- npm CLI documentation for `npm ci` flags: https://docs.npmjs.com/cli/v10/commands/npm-ci
- Node.js 20 Docker image: https://hub.docker.com/_/node

## Issues Found
1. **Deprecated npm flag in Dockerfile**: The Dockerfile used `RUN npm ci --only=production`, but the `--only=production` flag was deprecated in npm v7 and is no longer the recommended usage in npm v10 (which ships with Node 20). Changed to `RUN npm ci --omit=dev`, which is the current correct flag for skipping devDependencies.

## Review Notes
- The post references a `dapr.io/config: "tracing-config"` annotation but does not include the corresponding Dapr Configuration CRD definition. This is not an error (the annotation syntax is correct), but readers may need to create that Configuration resource separately or remove the annotation if they don't need tracing.
- All Dapr annotations, component specs, and CLI commands are accurate for Dapr 1.x (current stable).
- The Kubernetes manifests (Deployment, Service) are well-structured with appropriate resource limits and health checks.
