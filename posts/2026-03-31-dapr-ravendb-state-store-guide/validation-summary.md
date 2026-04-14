# Validation Summary: How to Use RavenDB with Dapr State Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state store component)
- RavenDB 6.0 (NoSQL document database)
- .NET / C# (Dapr SDK)
- Kubernetes (StatefulSet deployment)
- Docker (RavenDB container image)

## Sources Consulted
- Dapr supported state stores documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr RavenDB state store setup: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-ravendb/
- RavenDB Docker Hub: https://hub.docker.com/r/ravendb/ravendb
- RavenDB documentation on running in Docker: https://ravendb.net/docs/article-page/6.0/csharp/start/installation/running-in-docker-container
- RavenDB cluster administration REST API documentation
- Dapr .NET SDK documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/

## Issues Found

1. **Dapr component type was `state.rethinkdb` instead of `state.ravendb`** (line 86): The component configuration specified `state.rethinkdb`, which is a completely different database (RethinkDB). Changed to `state.ravendb`, the correct Dapr component type for RavenDB.

2. **StatefulSet missing template metadata labels** (lines 30-31): The StatefulSet `spec.template` section was missing `metadata.labels` to match the `spec.selector.matchLabels` (`app: ravendb`). Kubernetes requires these to match. The StatefulSet would fail to create without this. Added the required `metadata.labels` block.

3. **Invalid Docker image tag `6.0-ubuntu-latest`** (line 34): The tag `6.0-ubuntu-latest` does not exist on the stable `ravendb/ravendb` Docker Hub repository (it only exists on the nightly repo). Changed to `6.0-latest`, which is a valid stable tag.

4. **`RAVEN_Security_UnsecuredAccessAllowed` set to `PublicNetwork`** (line 46): The value `PublicNetwork` allows unsecured access from any network, which is overly permissive even for development. Changed to `PrivateNetwork`, which is appropriate for development/internal Kubernetes networking.

5. **Cluster node addition API used JSON body instead of query parameters** (lines 156-162): The `PUT /admin/cluster/node` endpoint accepts parameters as query parameters (`url` and `tag`), not as a JSON request body. Rewrote the curl commands to use the correct query parameter format.

## Review Notes
- The Dapr RavenDB state store component (`state.ravendb`) is currently in **alpha** status. Users should be aware of potential breaking changes.
- The database creation API (`PUT /admin/databases`) is an internal/admin API used by the RavenDB client SDK. It works but is not part of the formally documented public REST API surface. For production use, creating databases via RavenDB Studio or the client SDK is recommended.
- The .NET code examples use standard Dapr SDK patterns and are correct.
- The monitoring endpoints are valid RavenDB debug/admin routes.
