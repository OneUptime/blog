# Validation Summary: How to Configure CockroachDB with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- CockroachDB
- IPv6
- PostgreSQL wire protocol
- `psql`
- Python
- `psycopg2`
- TLS certificates

## Sources Consulted
- CockroachDB `cockroach start`: https://www.cockroachlabs.com/docs/stable/cockroach-start
- CockroachDB `cockroach start-single-node`: https://www.cockroachlabs.com/docs/stable/cockroach-start-single-node
- CockroachDB `cockroach init`: https://www.cockroachlabs.com/docs/stable/cockroach-init
- CockroachDB `cockroach node`: https://www.cockroachlabs.com/docs/stable/cockroach-node
- CockroachDB `cockroach sql`: https://www.cockroachlabs.com/docs/stable/cockroach-sql
- CockroachDB client connection parameters: https://www.cockroachlabs.com/docs/stable/connection-parameters
- CockroachDB connect-to-database reference: https://www.cockroachlabs.com/docs/stable/connect-to-the-database
- CockroachDB certificate management: https://www.cockroachlabs.com/docs/stable/cockroach-cert
- Psycopg2 module reference: https://www.psycopg.org/docs/module.html
- PostgreSQL libpq connection strings: https://www.postgresql.org/docs/current/libpq-connect.html
- PostgreSQL libpq SSL support: https://www.postgresql.org/docs/current/libpq-ssl.html

## Issues Found
- The "listen on all interfaces" example used an unbracketed IPv6 literal for `--advertise-addr`. CockroachDB's docs require IPv6 addresses in these flags to use bracket notation, so I changed it to `--advertise-addr=[2001:db8::10]:26257`.
- The "Three-Node IPv6 Cluster" section only showed startup commands for two nodes. I added the missing node 3 command so the example actually matches a three-node cluster and its `--join` list.
- The secure `psql` example connected as `root` with only `sslrootcert` and `sslmode=require`. For a secure self-hosted CockroachDB cluster using client certificate authentication, the official connection examples use `sslmode=verify-full` plus `sslrootcert`, `sslcert`, and `sslkey`, so I updated the example accordingly.
- The Python example omitted the client certificate and key and used `database=`, which Psycopg2 documents as a deprecated alias for `dbname`. I changed it to `dbname=`, added `sslcert` and `sslkey`, and switched to `sslmode="verify-full"` to match the secure connection guidance.
- The summary said to provide "all node IPv6 addresses" in `--join`. Current CockroachDB docs recommend using the initial node addresses and reusing the same join list across nodes, rather than listing every node in the cluster, so I corrected that wording.
- The post did not mention that secure node certificates must cover the IPv6 addresses or DNS names used to reach each node. I added a brief note because CockroachDB's node certificate requirements make that necessary for IPv6-based secure connections to validate correctly.

## Review Notes
- The post is technically accurate after the fixes for a self-hosted CockroachDB deployment.
- I did not execute the commands locally because the `cockroach` binary is not installed in this workspace; the review was completed against current official documentation and driver references.
