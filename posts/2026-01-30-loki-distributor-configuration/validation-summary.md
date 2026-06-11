# Validation Summary: How to Build Loki Distributor Configuration

## Status
validated

## Post Type
Technical configuration guide

## Technologies Covered
- Grafana Loki distributor
- Grafana Loki ingester ring
- Memberlist
- Consul
- etcd
- Kubernetes
- Prometheus alerting rules

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki components documentation: https://grafana.com/docs/loki/latest/get-started/components/
- Grafana Loki architecture documentation: https://grafana.com/docs/loki/latest/get-started/architecture/
- Grafana Loki hash rings documentation: https://grafana.com/docs/loki/latest/get-started/hash-rings/
- Grafana Loki request validation and rate limits documentation: https://grafana.com/docs/loki/latest/operations/request-validation-rate-limits/
- Grafana Loki v3.7 release notes: https://grafana.com/docs/loki/latest/release-notes/v3-7/
- Grafana Loki GitHub releases: https://github.com/grafana/loki/releases
- Local validation with Grafana Loki 3.7.2 `-verify-config`

## Issues Found
- Replaced Promtail with Grafana Alloy in the client diagram because Promtail is deprecated and out of commercial support in the current Loki release line.
- Clarified that `distributor.ring` tracks distributor replicas for global ingestion limits, while `ingester.lifecycler.ring` is the ingester discovery ring used by distributors for write routing.
- Corrected memberlist configuration from invalid `retransmit_multiplier` to `retransmit_factor`.
- Moved Consul and etcd ring examples under `ingester.lifecycler.ring` so they configure ingester discovery rather than only the distributor ring.
- Fixed replication comments that incorrectly connected `max_global_streams_per_user` to replica write failures.
- Corrected `max_entries_limit_per_query` comments to describe query result limits, not push request limits.
- Moved `health_check_ingesters` from the invalid `distributor` block to `ingester_client.pool_config`.
- Replaced invalid `grpc_client_config.max_retries` usage with `grpc_client_config.backoff_config.max_retries`.
- Corrected the `rate_limit_burst` comment so it describes gRPC client rate-limit burst behavior, not request timeout.
- Updated the Kubernetes image from `grafana/loki:2.9.0` to `grafana/loki:3.7.2` so the example aligns with the current configuration reference.

## Review Notes
The snippets are partial component-focused examples, not complete standalone Loki deployments. Full deployments still require storage, schema, and mode-specific settings appropriate to the environment.
