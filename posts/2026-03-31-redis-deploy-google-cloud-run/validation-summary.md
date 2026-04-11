# Validation Summary: How to Deploy Redis with Google Cloud Run

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Redis 7 (Alpine image)
- Google Cloud Run (managed)
- Google Cloud Filestore (NFS)
- Google Secret Manager
- Google VPC Access Connector
- gcloud CLI

## Sources Consulted
- `gcloud run deploy --help` — verified all flags (`--add-volume`, `--add-volume-mount`, `--vpc-connector`, `--vpc-egress`, `--args`, `--command`, `--set-secrets`, `--platform`)
- `gcloud filestore instances create --help` — verified `--tier=BASIC_HDD`, `--file-share` syntax, minimum capacity
- `gcloud secrets create --help` — verified `--replication-policy=automatic`, `--data-file=-`
- `gcloud compute networks vpc-access connectors create --help` — verified connector creation syntax
- Google Cloud Run Container Runtime Contract documentation (https://cloud.google.com/run/docs/container-contract) — confirmed HTTP-only ingress for Cloud Run services
- Google Cloud Run Private Networking documentation (https://cloud.google.com/run/docs/securing/private-networking) — confirmed no `.internal` hostnames, no fixed VPC IPs
- Google Cloud Run Worker Pools documentation (https://cloud.google.com/run/docs/deploy-worker-pools) — confirmed TCP support is only available for worker pools (pre-GA), not services
- Google Memorystore for Redis documentation (https://cloud.google.com/memorystore/docs/redis/connect-redis-instance-cloud-run) — recommended approach for Redis with Cloud Run

## Issues Found

### 1. Fundamental Architecture Issue: Cloud Run Does Not Support TCP Ingress for Services
**What was wrong:** The post's premise — deploying Redis on Cloud Run and connecting from other Cloud Run services via the Redis protocol (RESP over TCP) — is not feasible. Cloud Run services only support HTTP/1.1, HTTP/2 (gRPC), and WebSocket ingress. Redis clients cannot connect through Cloud Run's HTTP-only proxy.
**What was changed:** Rewrote the "Connecting from Other Cloud Run Services" section to honestly state this limitation, recommend Memorystore for Redis for inter-service connectivity, and mention the sidecar pattern as an alternative. Updated the Summary section accordingly.

### 2. `--platform managed` Flag Is Deprecated/Removed
**What was wrong:** The `gcloud run deploy` command included `--platform managed`, which has been deprecated and removed from the CLI. Cloud Run is now always fully managed.
**What was changed:** Removed the `--platform managed` flag from the deploy command.

### 3. Missing VPC Access Connector Creation Step
**What was wrong:** The deploy command referenced `--vpc-connector projects/$PROJECT/locations/$REGION/connectors/my-connector`, but the tutorial never created this connector. The deployment would fail.
**What was changed:** Added a "Create a VPC Access Connector" section with the correct `gcloud compute networks vpc-access connectors create` command.

### 4. Redis Password Exposed in Container Args via Shell Expansion
**What was wrong:** The deploy command used `$(gcloud secrets versions access latest --secret=redis-password)` inside `--args`, which expands the secret at deploy time and embeds the plaintext password in the Cloud Run revision configuration. This defeats the purpose of Secret Manager — the password is visible in the console, `gcloud run revisions describe`, and Cloud Run audit logs.
**What was changed:** Replaced with `--set-secrets REDIS_PASSWORD=redis-password:latest` to inject the secret as an environment variable at runtime, and changed the entrypoint to `sh -c "exec redis-server --requirepass $REDIS_PASSWORD ..."` so the password is never stored in the revision config.

### 5. Fictitious `redis.internal:6379` Hostname
**What was wrong:** The post referenced `redis://:<password>@redis.internal:6379` as a VPC internal address. Cloud Run services do not have `.internal` hostnames. They only get `.run.app` HTTPS URLs.
**What was changed:** Removed the `redis.internal` reference as part of the connection section rewrite.

### 6. Incorrect `REDIS_HOST=10.x.x.x` Fixed IP Claim
**What was wrong:** The post suggested setting `REDIS_HOST=10.x.x.x` as if Cloud Run services have fixed VPC IP addresses. Cloud Run instances receive ephemeral IPs that change on scale events and revision updates.
**What was changed:** Removed the `REDIS_HOST=10.x.x.x` reference as part of the connection section rewrite.

## Review Notes
- The deployment commands for creating the Filestore instance, enabling APIs, creating secrets, and creating the VPC connector are all syntactically correct and use valid flags.
- The `--add-volume type=nfs` and `--add-volume-mount` syntax is correct for Cloud Run NFS volume mounts.
- The `gcloud logging read` filter syntax is correct for Cloud Run logs.
- The post would benefit from adding `--ingress internal` to the deploy command to restrict the service to VPC-only access, since there is no reason for a Redis service to be accessible from the public internet (even with authentication).
- Cloud Run Worker Pools (pre-GA) do support inbound TCP via Direct VPC ingress, but they lack stable IPs, hostnames, and load balancers — making them unsuitable as an addressable Redis server.
- For readers who need Redis with Cloud Run, the recommended GCP approach is Memorystore for Redis, which provides a stable private IP accessible from Cloud Run via VPC connector.
