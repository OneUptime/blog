# Validation Summary: How to Configure CockroachDB Cluster with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB
- IPv6 networking
- TLS/X.509 certificates
- PostgreSQL/libpq/psql
- Python `psycopg2`
- `systemd`

## Sources Consulted
- CockroachDB `cockroach start`: https://www.cockroachlabs.com/docs/stable/cockroach-start
- CockroachDB `cockroach init`: https://www.cockroachlabs.com/docs/stable/cockroach-init
- CockroachDB `cockroach cert`: https://www.cockroachlabs.com/docs/stable/cockroach-cert
- CockroachDB `cockroach node`: https://www.cockroachlabs.com/docs/stable/cockroach-node
- CockroachDB connection parameters: https://www.cockroachlabs.com/docs/stable/connection-parameters
- CockroachDB DB Console overview: https://www.cockroachlabs.com/docs/stable/ui-overview
- CockroachDB monitoring and raw status endpoints: https://www.cockroachlabs.com/docs/stable/monitoring-and-alerting
- PostgreSQL libpq connection syntax: https://www.postgresql.org/docs/18/libpq-connect.html
- Current CockroachDB binary archive verified on 2026-05-06: https://binaries.cockroachdb.com/cockroach-latest.linux-amd64.tgz

## Issues Found
- The install commands assumed the archive extracts to `cockroach-latest.linux-amd64/`, but the current archive extracts to a versioned directory. I changed the copy commands to use version-agnostic globbing.
- The Linux binary install snippet copied only the `cockroach` binary. Current CockroachDB Linux distributions also ship bundled GEOS libraries used by spatial features, so I added the `libgeos` copy step to `/usr/local/lib/cockroach/`.
- The TLS example used `cockroach cert create-node` as though one command should cover multiple cluster nodes. I narrowed the example to a single node certificate and clarified that it should be repeated for each node with its own IPv6 address.
- The secure-cluster example omitted `cockroach init`, which is required once after starting a new multi-node cluster. I added the secure `cockroach init` command.
- The cluster-health section used `cockroach debug range-data`, which is not documented in the current stable CockroachDB command reference. I replaced it with the supported `cockroach node status --ranges`.
- The Admin UI example mixed insecure and secure URL schemes and the bracket note was ambiguous for IPv6 literals. I changed the example to `http://` for the insecure example and clarified that secure clusters use `https://` while IPv6 literals remain bracketed in URLs.

## Review Notes
- `cockroach start --background` is still documented, but current CockroachDB docs recommend using it only for temporary or automated background processes. For long-running deployments, a service manager such as `systemd` is preferred.
