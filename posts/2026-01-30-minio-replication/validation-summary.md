# Validation Summary: How to Implement MinIO Replication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- MinIO object storage
- MinIO Client (`mc`)
- Bucket replication
- Site replication
- Prometheus metrics and alerting
- S3-compatible IAM policies

## Sources Consulted
- MinIO AIStor bucket replication requirements: https://docs.min.io/aistor/administration/replication/bucket-replication/bucket-replication-requirements/
- MinIO AIStor active-passive bucket replication setup: https://docs.min.io/aistor/administration/replication/bucket-replication/enable-server-side-one-way-bucket-replication/
- `mc replicate add` reference: https://docs.min.io/aistor/reference/cli/mc-replicate/mc-replicate-add/
- `mc replicate update` reference: https://docs.min.io/aistor/reference/cli/mc-replicate/mc-replicate-update/
- `mc replicate status` reference: https://docs.min.io/aistor/reference/cli/mc-replicate/mc-replicate-status/
- `mc replicate resync-backlog` reference: https://docs.min.io/aistor/reference/cli/mc-replicate/mc-replicate-resync-backlog/
- `mc admin replicate` reference: https://docs.min.io/aistor/reference/cli/admin/mc-admin-replicate/
- MinIO AIStor site replication guide: https://docs.min.io/aistor/administration/replication/site-replication/
- MinIO AIStor Prometheus metrics docs: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/
- MinIO AIStor metrics v3 reference: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/
- MinIO AIStor replication settings reference: https://docs.min.io/aistor/reference/aistor-server/settings/replication/
- `mc admin logs` reference: https://docs.min.io/aistor/reference/cli/admin/mc-admin-logs/

## Issues Found
- The bucket replication flow used `mc admin bucket remote add --service replication` and then passed an ARN to `mc replicate add`. Current documentation uses `mc replicate add --remote-bucket` directly with a URL, alias, or path target. Updated the setup flow accordingly and changed the old "configure" step to an update example using `mc replicate update --id`.
- The destination replication policy was missing permissions required for object lock, encryption configuration, multipart aborts, object retention/legal hold, and version-level deletes. Updated the policy to match the documented remote-user permission model while keeping the example scoped to the destination bucket.
- The synchronous replication example incorrectly used a target ARN with `mc replicate add`. Replaced it with a destination URL in `--remote-bucket`.
- Site replication prerequisites omitted current requirements around matching MinIO versions, a shared identity provider configuration, and empty peer sites during initialization. Added those caveats.
- The site replication table incorrectly implied all lifecycle rules and server configuration settings replicate. Updated the table to show ILM expiration as optional and bucket notifications/server settings as not replicated.
- The conflict handling text overstated a specific last-write-wins strategy. Replaced it with documented active-active conflict caveats around concurrent changes and duplicate delete markers.
- Prometheus examples used outdated or incorrect metric names and an incomplete scrape generation command. Updated the command to the v3 bucket replication form and replaced queue/failure alert metrics with current documented metrics.
- The "resync failed objects" example used full `mc replicate resync` semantics for failed/pending objects. Replaced it with `mc replicate resync-backlog`, which is the documented command for `PENDING` or `FAILED` replication status.
- Bandwidth and performance tuning examples used undocumented config keys. Replaced them with documented `mc replicate update --limit-upload` and replication settings (`priority`, `max_workers`).
- Troubleshooting examples used invalid or outdated commands such as `mc replicate ls --status`, `mc admin logs --type replication`, and `mc admin bucket remote`. Replaced them with current `mc replicate status`, `mc admin logs --type application`, `mc replicate ls`, and `mc replicate update --remote-bucket` examples.

## Review Notes
The current official MinIO documentation is published under MinIO AIStor. The reviewed commands and behavior were validated against those official docs, which are the current source for `mc` replication behavior. The post still uses the general "MinIO" product wording for readability, but the version-matching and feature caveats now reflect current documented behavior.
