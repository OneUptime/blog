# Validation Summary: How to Use Dapr with Google Cloud Memorystore

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state store and pub/sub components)
- Google Cloud Memorystore for Redis
- Google Kubernetes Engine (GKE)
- Google Cloud Monitoring
- Redis 7.0
- gcloud CLI

## Sources Consulted
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis Streams pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Google Cloud Memorystore for Redis high availability: https://cloud.google.com/memorystore/docs/redis/high-availability-for-memorystore-for-redis
- Google Cloud Memorystore manage Redis AUTH: https://cloud.google.com/memorystore/docs/redis/manage-redis-auth
- gcloud redis instances create reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/create
- gcloud redis instances describe reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/describe
- Memorystore getAuthString API: https://cloud.google.com/memorystore/docs/redis/reference/rest/v1/projects.locations.instances/getAuthString

## Issues Found

1. **Sentinel configuration incorrect for Memorystore (lines 59-62)**: The state store component included `failover: "true"` and `sentinelMasterName: mymaster`. Google Cloud Memorystore Standard tier manages failover internally behind a single IP address and does NOT expose Redis Sentinel endpoints. These settings would cause Dapr to attempt Sentinel discovery, which would fail. Removed both fields.

2. **Transit encryption mode value wrong case (line 25)**: `--transit-encryption-mode=SERVER_AUTHENTICATION` used uppercase with underscores. The correct gcloud CLI value is `server-authentication` (lowercase, hyphenated). Fixed to `server-authentication`.

3. **AUTH string retrieval via wrong command (lines 32-35, 68-69)**: `gcloud redis instances describe` does not return `authString` as a field. The AUTH string must be retrieved using the separate `gcloud redis instances get-auth-string` subcommand. Fixed both occurrences.

4. **Monitoring script ordering (lines 123-141)**: The `gcloud alpha monitoring policies create` command referenced `memorystore-alert.json` before the `cat <<EOF` block that creates it. Reordered so the file is created first, then the policy command runs.

5. **Unnecessary `alpha` prefix on monitoring command (line 124)**: `gcloud alpha monitoring policies create` uses the alpha track, but this command has graduated to stable. Changed to `gcloud monitoring policies create`.

## Review Notes
- The `redis-cli --tls --cacert /etc/ssl/certs/ca-certificates.crt` test command may not work in all cases since Memorystore's in-transit encryption uses a Google-managed CA certificate that may need to be downloaded from the instance metadata. However, this is a reasonable simplification for a connectivity test example.
- The `consumerID: "{uuid}"` in the pub/sub component is a valid Dapr placeholder that auto-generates a UUID per instance.
