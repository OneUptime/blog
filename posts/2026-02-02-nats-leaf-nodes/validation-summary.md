# Validation Summary: How to Implement NATS Leaf Node Topologies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NATS (server 2.10) — leaf nodes, accounts, JetStream
- NATS CLI tooling (`nats` command)
- NATS Helm chart / Kubernetes deployment
- TLS configuration for leaf node connections
- Prometheus / `prometheus-nats-exporter`
- Mermaid topology diagrams

## Sources Consulted
- NATS Leaf Nodes overview — https://docs.nats.io/running-a-nats-service/configuration/leafnodes
- NATS Leaf Node Configuration reference — https://docs.nats.io/running-a-nats-service/configuration/leafnodes/leafnode_conf
- NATS Subject Mapping — https://docs.nats.io/nats-concepts/subject_mapping
- prometheus-nats-exporter (`collector/leafz.go`) — https://github.com/nats-io/prometheus-nats-exporter
- prometheus-nats-exporter metrics reference (DeepWiki) — https://deepwiki.com/nats-io/prometheus-nats-exporter/6-metrics-reference

## Issues Found

1. **Invalid `reconnect_interval` option in `edge-leaf.conf`.** The leaf remote block does not support a `reconnect_interval` field. The valid option is `reconnect` at the top of the `leafnodes` block, expressed as an integer number of seconds. Replaced `reconnect_interval: "5s"` (placed inside `remotes`) with `reconnect: 10` at the leafnodes top level, and removed the bogus per-remote field.

2. **`account_mappings` is not a valid leaf remote option.** The example in the "Leaf Node Subject Remapping" section used `account_mappings: { events: { to: "site-a.events" } }` inside a leaf remote, which is not part of the NATS server schema. Rewrote the example to use NATS's documented account-level `mappings: { "events.>": "site-a.events.>" }` syntax, bound to the leaf remote via the existing `account` field.

3. **Multiple invalid options in `resilient-leaf.conf`.**
   - `reconnect: true` (as a boolean inside a remote) — `reconnect` is a duration at the top of the `leafnodes` block, not a boolean and not a per-remote field. Replaced with `reconnect: 10` at the leafnodes top level.
   - `connect_timeout: "10s"` — not a documented option. Replaced with the valid `first_info_timeout: "10s"`, which is the analogous per-remote handshake timeout.
   - `reconnect_buffer_size: 64MB` — this is a NATS *client SDK* option, not a server config option. Removed.

4. **Fabricated Prometheus metric names.** The PromQL examples used names like `nats_leafnodes_connections`, `nats_leafnodes_sent_msgs`, `nats_leafnodes_recv_msgs`, `nats_leafnodes_rtt_seconds`, and `nats_leafnodes_reconnects`. These do not exist in `prometheus-nats-exporter`. Replaced with the actual metric names defined in `collector/leafz.go`: `nats_leafz_conn_nodes_total`, `nats_leafz_conn_out_msgs`, `nats_leafz_conn_in_msgs`, `nats_leafz_conn_rtt`, plus `nats_varz_leafnodes` from the varz collector. Removed the reconnects metric, which has no direct exporter equivalent.

## Review Notes

- The `compression: s2_auto` option is correct — it was added in NATS server 2.10, which matches the Helm image tag used in the post.
- The `nats-leaf://` URL scheme used in remote URLs is the documented protocol prefix for leaf connections.
- TLS `verify: true` on the hub side correctly requires client certificate verification, which is appropriate for the secure hub example.
- The `system_account` directive, `accounts` exports/imports, and `deny_imports` / `deny_exports` on remotes were all verified as correct against the NATS configuration reference.
- The Helm chart values use the `nats/nats` chart structure (`nats.image`, `cluster`, `leafnodes`, `auth`); this matches the upstream chart at the time of writing. Chart schemas change over time, so readers on future chart versions should sanity-check values keys against the current chart `values.yaml`.
- The CLI command `nats server report jetstream` is a JetStream report, not a "list leaf node connections" command as the comment in that block could suggest. The neighboring `nats server info` calls are the right way to inspect leaf connectivity. This is a minor wording nit rather than a functional error, so left as-is.
- The 2.10-alpine image tag is pinned to a major version line. Once NATS 2.11+ becomes the default, the post's leaf-related options should still apply, but Helm chart keys (e.g. under `leafnodes.service`, `auth.resolver`) may shift.
