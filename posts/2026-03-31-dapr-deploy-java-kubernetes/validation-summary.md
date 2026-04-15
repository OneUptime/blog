# Validation Summary: How to Deploy Dapr Java Applications on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, components, CLI)
- Kubernetes (Deployments, Services, annotations)
- Java / Spring Boot
- Docker (containerization with eclipse-temurin base image)
- Redis (as Dapr state store)

## Sources Consulted
- Dapr CLI installation docs: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Redis state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Eclipse Temurin Docker images: https://hub.docker.com/_/eclipse-temurin

## Issues Found
1. **Incorrect `wget` command for Dapr CLI installation**: The original command was `wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash`. This would not work because `wget` by default saves the downloaded file to disk rather than outputting to stdout. The pipe to `/bin/bash` would receive no input. Fixed by adding the `-O -` flag (`wget -q ... -O -  | /bin/bash`) which tells `wget` to write the downloaded content to stdout so it can be piped to bash.

## Review Notes
- The Dockerfile uses `eclipse-temurin:21-jre-alpine` which is a current and appropriate base image for Java 21 applications.
- All Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/log-level`) are correctly placed in the pod template metadata and use valid values.
- The Dapr Component YAML uses `apiVersion: dapr.io/v1alpha1` which is the current stable API version for Dapr components.
- The `secretKeyRef` pattern for the Redis password is the correct way to reference Kubernetes secrets in Dapr component specs.
- The verification command `kubectl logs deployment/order-service -c daprd` correctly uses `daprd` as the Dapr sidecar container name.
