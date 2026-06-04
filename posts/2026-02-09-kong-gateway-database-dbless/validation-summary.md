# Validation Summary: How to Deploy Kong Gateway on Kubernetes with Database and DB-less Modes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kong Gateway
- Kong DB-less declarative configuration
- Kong traditional database mode
- PostgreSQL
- Kubernetes Deployments, StatefulSets, Services, Secrets, ConfigMaps, Jobs, and probes
- Helm and the official Kong Helm chart
- Argo CD
- kubectl and curl

## Sources Consulted
- Kong Gateway DB-less mode documentation: https://developer.konghq.com/gateway/db-less-mode/
- Kong Gateway configuration reference: https://developer.konghq.com/gateway/configuration/
- Kong Gateway health check probes documentation: https://developer.konghq.com/gateway/traffic-control/health-check-probes/
- Kong Gateway ports reference: https://developer.konghq.com/gateway/network/
- Official Kong Helm chart values: https://raw.githubusercontent.com/Kong/charts/main/charts/kong/values.yaml
- Kong Gateway version support and changelog documentation: https://developer.konghq.com/gateway/version-support-policy/ and https://developer.konghq.com/gateway/changelog/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/

## Issues Found
- The post stated that database mode stores configuration in PostgreSQL or Cassandra. Current Kong Gateway 3.x configuration accepts `postgres` or `off`, so the text was corrected to PostgreSQL only.
- The DB-less limitations said there is no Admin API for runtime changes. Kong documents DB-less entity CRUD endpoints as read-only, with `GET` operations and selected node-local operations still available, so the wording was corrected.
- The raw manifest examples used `kong:3.5`, which is stale for a current 2026 guide. The examples were updated to `kong:3.9`, matching the current OSS image line used by the official Kong chart values.
- The manual DB-less Kubernetes deployment disabled the Admin API and then pointed liveness/readiness probes at `/status` on the proxy port. The deployment now enables `KONG_STATUS_LISTEN` on port `8100`, exposes that container port, uses `/status` for liveness, and uses `/status/ready` for readiness.
- The database-mode deployment probes used the Admin API port rather than the Status API. The example now enables the Status API and probes the documented health endpoints on port `8100`.
- The Helm database-mode values hard-coded the manual `postgres-kong` service while also enabling the chart's PostgreSQL subchart. Those conflicting `env.pg_*` values were removed so the chart can wire its built-in PostgreSQL settings correctly.
- The Helm Admin API example enabled the admin service but did not enable the plaintext HTTP listener used elsewhere in the post. The values now enable `admin.http` and disable `admin.tls` for the internal `8001` example.
- The Helm DB-less values omitted `ingressController.enabled: false`, which Kong documents as required when running unmanaged DB-less mode with a static declarative ConfigMap.
- The Argo CD Application example omitted `spec.destination.server`. Added `https://kubernetes.default.svc`, matching official Argo CD examples for in-cluster deployments.
- The hybrid deployment wording called data planes "DB-less Kong nodes." This was clarified to "Kong nodes without their own database" because hybrid data planes receive configuration from the control plane rather than loading a standalone DB-less declarative file.
- The testing section used the database-mode proxy service for the DB-less `/example` route and attempted to add a route to a service that did not exist in database mode. The DB-less test now uses `kong-proxy-dbless`, and the database-mode Admin API test creates the service before creating and testing the route.

## Review Notes
- All YAML snippets in the post were parsed successfully after the edits.
- `kubectl` and `helm` were not installed in the local workspace, so CLI behavior was checked against official documentation rather than local command help.
- The examples still use simple plaintext passwords and a single PostgreSQL replica for readability; production deployments should use managed or highly available PostgreSQL, stronger secret handling, and secured Admin API access.
