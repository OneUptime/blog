# Validation Summary: How to Train Your Team on Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar pattern, building blocks, CLI)
- Kubernetes (namespaces, deployments)
- Helm (Bitnami charts for Redis and Kafka)
- Docker
- Redis
- Apache Kafka
- Python (quickstart examples)

## Sources Consulted
- Dapr CLI reference for `dapr init`: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr quickstarts repository structure: https://github.com/dapr/quickstarts
- Dapr building blocks documentation: https://docs.dapr.io/concepts/building-blocks-concept/
- Bitnami Helm charts for Redis and Kafka: https://github.com/bitnami/charts
- GitHub Atom feed format for releases

## Issues Found
1. **Incorrect quickstart path for workflows**: The post referenced `quickstarts/workflow/python/sdk` (singular "workflow"), but the actual directory in the Dapr quickstarts repository is `quickstarts/workflows/python/sdk` (plural "workflows"). Fixed to use the correct plural form.

## Review Notes
- The Helm install commands use the traditional `bitnami/redis` and `bitnami/kafka` chart references, which require the Bitnami repo to be added first (`helm repo add bitnami https://charts.bitnami.com/bitnami`). Bitnami also offers OCI registry references (e.g., `oci://registry-1.docker.io/bitnamicharts/redis`), but the traditional format is still widely used and valid.
- The post categorizes distributed tracing and resiliency policies under "Building Blocks" in Tier 2. Strictly speaking, these are cross-cutting concerns in Dapr's architecture rather than formal building blocks (like state management, pub/sub, or service invocation), but grouping them in a training tier focused on core Dapr features is reasonable for pedagogical purposes.
- The post is primarily a training guide with illustrative commands and checklists rather than a hands-on tutorial, so the code snippets serve as examples of what a training setup might look like rather than production-ready scripts.
