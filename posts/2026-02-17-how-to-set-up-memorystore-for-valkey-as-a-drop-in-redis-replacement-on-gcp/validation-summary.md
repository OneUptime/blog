# Validation Summary: How to Set Up Memorystore for Valkey as a Drop-In Redis Replacement on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Valkey
- Google Cloud Memorystore for Redis
- Valkey (open-source Redis fork)
- gcloud CLI (`memorystore` and `redis` command groups)
- redis-py (Python Redis client, including `redis.cluster.RedisCluster`)
- Cloud Storage (for RDB seeding)
- Private Service Connect (PSC) for VPC connectivity

## Sources Consulted
- Memorystore for Valkey: Create instances — https://cloud.google.com/memorystore/docs/valkey/create-instances
- gcloud memorystore instances create reference — https://cloud.google.com/sdk/gcloud/reference/memorystore/instances/create
- Manage in-transit encryption — https://cloud.google.com/memorystore/docs/valkey/manage-in-transit-encryption
- Instance and node specification — https://cloud.google.com/memorystore/docs/valkey/instance-node-specification
- Prevent deletion of an instance — https://cloud.google.com/memorystore/docs/valkey/deletion-protection
- Migrate workloads to Memorystore for Valkey — https://cloud.google.com/memorystore/docs/valkey/migrate-workloads
- Manage backups (RDB seed-on-create) — https://cloud.google.com/memorystore/docs/valkey/manage-backups
- Export data from a Redis instance — https://cloud.google.com/memorystore/docs/redis/export-data

## Issues Found
1. **Region flag wrong for `gcloud memorystore instances` commands.** The post used `--region=us-central1`. The Memorystore (Valkey) command group uses `--location` instead. Replaced every occurrence in `create` and `describe` commands.
2. **`--transit-encryption-mode` value casing.** The post used `SERVER_AUTHENTICATION` (the underlying API enum). The gcloud flag accepts `server-authentication` (lowercase, hyphenated). Replaced both occurrences.
3. **Missing `--endpoints` / extraneous `--network`.** Memorystore for Valkey provisions network connectivity through Private Service Connect, configured via the `--endpoints` JSON with a `pscAutoConnection`, not a flat `--network` flag. Swapped `--network=projects/.../networks/default` for the correct `--endpoints='[{"connections": [{"pscAutoConnection": {"network": "...", "projectId": "..."}}]}]'` in both create commands.
4. **Missing `--mode` flag.** Memorystore for Valkey requires the cluster mode to be specified. Added `--mode=cluster-disabled` to the standalone example and `--mode=cluster` to the clustered example.
5. **`--deletion-protection` is the wrong flag name.** The correct flag is `--deletion-protection-enabled`. Renamed in the clustered create command.
6. **Invalid node type `standard-medium`.** Valid types include `shared-core-nano`, `standard-small`, `highmem-medium`, `highcpu-medium`, `standard-large`, `highmem-xlarge`, `highmem-2xlarge` (plus the `custom-*` family). Replaced `standard-medium` with `highmem-medium` for the production cluster example.
7. **`gcloud memorystore instances import` does not exist.** Memorystore for Valkey does not expose a separate `import` subcommand; RDB import is performed at creation time by passing `--gcs-source-uris` to `gcloud memorystore instances create`. Rewrote the migration step to use the supported seed-on-create flow, kept the existing `gcloud redis instances export` step (which is valid for the legacy Memorystore for Redis source) and added a note about the IAM permissions required on the bucket.
8. **Added a brief note** that replication-based migration (`gcloud beta memorystore instances start-migration`) exists as the zero-downtime alternative, so readers don't conclude the only path is RDB export + reseed.

## Review Notes
- Valkey is correctly described as a community fork of Redis 7.2.4 maintained under the Linux Foundation, licensed under 3-Clause BSD.
- `VALKEY_8_0` is still a supported engine version; the current default for newly created instances is `VALKEY_9_0`. Authors may want to bump the examples to `VALKEY_9_0` for new tutorials, but `VALKEY_8_0` is not incorrect.
- The redis-py snippets are wire-correct: connect to the Valkey endpoint with `ssl=True`, use `RedisCluster` for cluster-mode endpoints, and rely on the shared `redis_version` INFO field (Valkey continues to populate it for compatibility).
- The post uses `ssl_cert_reqs=None`, which in redis-py defaults to `'required'` and will validate the server certificate against the system trust store. With Memorystore's Google-managed CA this works on standard images, but readers running on minimal containers may need to install the Google trust roots or set `ssl_cert_reqs='none'` for a quick test. Left as-is to avoid encouraging unverified TLS in a production-oriented post.
- The migration section now reflects the current product behaviour. If the documentation later adds a standalone `instances import` subcommand, this step should be revisited.
