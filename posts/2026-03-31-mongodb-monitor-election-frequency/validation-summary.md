# Validation Summary: How to Monitor Election Frequency in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica set elections, serverStatus, replSetGetStatus)
- MongoDB shell (mongosh)
- Prometheus with mongodb_exporter
- Grafana alerting rules
- Node.js MongoDB driver (SDAM events)

## Sources Consulted
- MongoDB Manual: serverStatus command — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Manual: replSetGetStatus command — https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB Manual: Change Streams — https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js Driver: SDAM events and ServerDescriptionChangedEvent
- MongoDB source code: replication_metrics.h (election metric field definitions)

## Issues Found

1. **Incorrect `serverStatus` field path**: The post referenced `repl.replicationElection` as the path to election metrics. The correct top-level field is `electionMetrics`. Fixed the description and the code example (`status.repl.replicationElection` → `status.electionMetrics`).

2. **Non-existent field name in sample output**: `numCatchUpsFailedToHeartbeat` is not a real MongoDB field. Replaced with the correct field name `numCatchUpsFailedWithReplSetAbortPrimaryCatchUpCmd`.

3. **Misleading section title and description about Change Streams**: The section was titled "Tracking Elections with Change Streams" but the code used SDAM events. The introductory text incorrectly claimed you could "subscribe to the `admindb` change stream and watch for `invalidate` events" — this is wrong on two counts: (a) change streams cannot be opened on the admin database, and (b) invalidate events are triggered by collection drops/renames, not elections. Renamed the section to "Tracking Elections with SDAM Events" and removed the incorrect change stream reference.

4. **Missing `await client.connect()` in SDAM example**: The Node.js code registered a `serverDescriptionChanged` event listener but never called `connect()`. Without connecting, the topology is never created and no SDAM events will fire. Added `await client.connect()` after the event listener registration.

## Review Notes
- The Prometheus/Grafana alert rule uses metric names (`mongodb_replset_member_replicationLag`, `mongodb_replset_member_state`) that are plausible but vary across mongodb_exporter versions (percona vs. community). Readers should verify metric names against their specific exporter version.
- The alert expression uses `increase()` on a replication lag metric combined with `changes()` on state — the `changes(mongodb_replset_member_state[10m]) > 2` part is the meaningful election detector; the replication lag condition is supplementary context.
- The baseline thresholds (0-1/month healthy, 2-5/week warning, 2+/day critical) are reasonable operational guidance but will vary by deployment.
