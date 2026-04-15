# Validation Summary: How to Deploy Dapr PHP Applications on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar injection, state store components)
- PHP 8.2 with PHP-FPM
- Nginx (as reverse proxy to PHP-FPM)
- Kubernetes (Deployments, Services, health probes)
- Docker (multi-service container with supervisord)
- Composer (PHP dependency management)
- Redis (Dapr state store backend)

## Sources Consulted
- Dapr Component spec documentation: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Redis state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Kubernetes Deployment API: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- PHP-FPM Docker image documentation: https://hub.docker.com/_/php
- Dapr CLI reference (`dapr init`): https://docs.dapr.io/reference/cli/dapr-init/

## Issues Found

1. **Dapr Component `auth` field incorrectly placed at root level**: The `auth` block was a sibling of `spec` (at the root level of the Component resource). According to the Dapr Component schema, `auth` must be nested under `spec` so the Dapr runtime can read it. Moved `auth` under `spec` with proper indentation.

2. **Summary incorrectly refers to resource "limits" instead of "requests"**: The Deployment annotations use `dapr.io/sidecar-cpu-request` and `dapr.io/sidecar-memory-request`, which set resource *requests*, not *limits*. The summary claimed "Resource limits on the sidecar container prevent it from consuming too many cluster resources," which is inaccurate — requests guarantee minimum resources, while limits cap maximum usage. Changed "Resource limits" to "Resource requests" and adjusted the description accordingly.

## Review Notes
- The Dockerfile uses supervisord to run both nginx and PHP-FPM in a single container. While this works, the post could note in the future that running one process per container is the recommended Kubernetes pattern — though this is a stylistic choice, not an error.
- The PHP health check snippet references `$path` without showing where it is defined. The comment says "additions" which implies it's part of a larger file, so this is acceptable but could be clearer.
- The post only sets sidecar resource requests, not limits. For production use, adding `dapr.io/sidecar-cpu-limit` and `dapr.io/sidecar-memory-limit` annotations would be advisable to prevent unbounded resource consumption. This is not an error in the post but worth noting for a future enhancement.
