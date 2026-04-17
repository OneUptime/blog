# Validation Summary: How to Create and Manage Services in ClickHouse Cloud

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse Cloud
- ClickHouse Cloud REST API (v1)
- ClickHouse Client (CLI)
- curl, jq

## Sources Consulted
- [ClickHouse Cloud API Overview](https://clickhouse.com/docs/cloud/manage/api/api-overview)
- [ClickHouse Cloud Services API Reference](https://clickhouse.com/docs/cloud/manage/api/services-api-reference)
- [ClickHouse Cloud Tiers documentation](https://clickhouse.com/docs/cloud/manage/cloud-tiers)
- [ClickHouse Network Ports documentation](https://clickhouse.com/docs/guides/sre/network-ports)
- [tip: authenticating with curl against Clickhouse Cloud API (Medium)](https://medium.com/@toja/tip-authenticating-curl-against-clickhouse-cloud-api-bb4fa854b332)

## Issues Found
1. **Incorrect API authentication scheme.** The post used `Authorization: Bearer $CLICKHOUSE_API_KEY` for all curl examples. The ClickHouse Cloud API uses HTTP Basic Auth with a Key ID (username) and Key Secret (password). Replaced every Bearer header with `--user "$KEY_ID:$KEY_SECRET"` and added a short sentence explaining the auth model before the first example.
2. **Outdated tier names.** The console steps listed tiers as "Development, Production, or Dedicated" — these are the legacy names. Updated to the current tiers: **Basic, Scale, Enterprise**, per the ClickHouse Cloud Tiers docs.
3. **Outdated tier in the create-service request body.** The request body included `"tier": "production"`, but the `tier` field has been removed for organizations on the new pricing plans, and the field is unrelated to per-replica sizing. Removed the `tier` field. Also replaced `minTotalMemoryGb`/`maxTotalMemoryGb` (legacy fields) with the current per-replica sizing fields `minReplicaMemoryGb`, `maxReplicaMemoryGb`, and added an explicit `numReplicas`.
4. **Auto-pause statement was tier-specific and outdated.** The post said "Development services auto-pause" — auto-pause is now controlled by the `idleScaling` setting on a service rather than tier. Reworded to describe the behavior in terms of idle scaling.
5. **Wrong port for the native client.** The `clickhouse client` example used `--port 8443`, which is the HTTPS port. The native protocol with `--secure` listens on **9440**. Changed the port to 9440.
6. **Pause/Resume framed as Development-only.** Reworded to "Services can be stopped to halt billing for compute" since the start/stop API is not limited to legacy Development services.
7. **Response shape for monitoring.** The `jq '.service.state'` filter assumed a `service` envelope, but the v1 services API wraps the response in a `result` object. Updated to `jq '.result.state'`.
8. **Added missing `Content-Type` header** to the PATCH state-change requests, since they send a JSON body.
9. **Updated Summary** to reference the current Basic/Scale/Enterprise tiers instead of the legacy Development/Production naming.

## Review Notes
- The `tier` field is still accepted by the API for organizations on legacy pricing plans, but new organizations must omit it. The corrected post omits the field, which works for both populations.
- `awake` is also a valid `command` value for the state endpoint (in addition to `start` and `stop`), but the post does not need to cover it for a basic pause/resume tutorial.
- The post does not mention rate limits, IP allowlists (`ipAccessList` is required at create time for new services in many configurations), or how to retrieve the service password after creation — these would be useful additions but are out of scope for a correctness-only review.
