# Validation Summary: How to Use Dapr with DigitalOcean Managed Databases

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (state management, pub/sub components)
- DigitalOcean Managed Databases (PostgreSQL, Redis)
- DigitalOcean Kubernetes (DOKS)
- doctl CLI
- Kubernetes (ConfigMaps, Secrets, volume mounts)
- PostgreSQL SSL/TLS configuration

## Sources Consulted
- doctl databases get-ca reference: https://docs.digitalocean.com/reference/doctl/reference/databases/get-ca/
- doctl databases firewalls reference: https://docs.digitalocean.com/reference/doctl/reference/databases/firewalls/
- doctl kubernetes cluster get reference: https://docs.digitalocean.com/reference/doctl/reference/kubernetes/cluster/get/
- Dapr PostgreSQL state store component docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql/
- Dapr Redis pub/sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr sidecar volume mounts on Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-volume-mounts/
- PostgreSQL libpq SSL documentation: https://www.postgresql.org/docs/current/libpq-ssl.html
- DigitalOcean Managed PostgreSQL connection guide: https://docs.digitalocean.com/products/databases/postgresql/how-to/connect/

## Issues Found

### 1. Incorrect `doctl` command for retrieving CA certificate
- **What was wrong:** The post used `doctl databases ca get my-pg-cluster --format PrivateKey` which is incorrect in two ways: (a) the subcommand is `databases get-ca`, not `databases ca get`, and (b) the format column is `Certificate`, not `PrivateKey` (a CA certificate is not a private key).
- **What was changed:** Replaced with `doctl databases get-ca my-pg-cluster --format Certificate --no-header`.
- **Why:** The `get-ca` subcommand is the correct doctl command (introduced in doctl v1.114.0). The `--format Certificate` outputs only the certificate column, and `--no-header` strips the column header so the file contains only the PEM certificate.

### 2. PostgreSQL `sslmode=require` should be `sslmode=verify-full`
- **What was wrong:** The connection string used `sslmode=require` alongside `sslrootcert=/certs/ca.pem`. The `require` mode encrypts the connection but does NOT verify the server certificate against the CA, making the entire CA cert mounting pointless.
- **What was changed:** Changed `sslmode=require` to `sslmode=verify-full`.
- **Why:** `verify-full` both validates the server certificate against the CA and checks the hostname matches. This is what DigitalOcean recommends in their own connection documentation. Without this, the CA certificate is mounted but never used for verification, providing no MITM protection.

### 3. CA certificate volume mounted in wrong container
- **What was wrong:** The volume mount example mounted the CA certificate ConfigMap into the application container (`my-service`). However, in Dapr's sidecar architecture, it is the `daprd` sidecar that connects to PostgreSQL, not the application container. The sidecar would not have access to `/certs/ca.pem`.
- **What was changed:** Added the `dapr.io/volume-mounts: "do-pg-cert:/certs"` annotation in the pod template metadata and removed the `volumeMounts` from the application container. Updated the description text to mention the Dapr sidecar annotation.
- **Why:** The `dapr.io/volume-mounts` annotation instructs the Dapr sidecar injector to mount the specified volume into the `daprd` container. This is the documented approach per the Dapr Kubernetes volume mounts guide.

## Review Notes
- The Dapr PostgreSQL state store component YAML is correct for v1. If upgrading to v2, `tableName` would need to change to `tablePrefix` and the table schema is incompatible.
- The Redis pub/sub component configuration is correct. Port 25061 and `enableTLS: "true"` are appropriate for DigitalOcean Managed Redis.
- The `doctl databases firewalls append` and `doctl kubernetes cluster get` commands are correct.
- The Dapr HTTP API endpoints for state store and pub/sub testing are correct.
- The `consumerID: "{uuid}"` value in the Redis component is a placeholder; in production it should be replaced with an actual consumer group identifier, or omitted entirely (Dapr defaults it to the app ID).
