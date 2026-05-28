# Validation Summary: How to Create Read Pool Instances in AlloyDB to Scale Read Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- Google Cloud CLI
- Cloud Monitoring
- PostgreSQL
- Python psycopg2
- Node.js node-postgres
- PgBouncer

## Sources Consulted
- Google Cloud AlloyDB overview: https://cloud.google.com/alloydb/docs/overview
- Google Cloud AlloyDB create read pool instance documentation: https://cloud.google.com/alloydb/docs/instance-read-pool-create
- Google Cloud AlloyDB scale instance documentation: https://cloud.google.com/alloydb/docs/scale-instance
- Google Cloud SDK reference for `gcloud alloydb instances create`: https://cloud.google.com/sdk/gcloud/reference/alloydb/instances/create
- Google Cloud SDK reference for `gcloud alloydb instances update`: https://cloud.google.com/sdk/gcloud/reference/alloydb/instances/update
- Google Cloud AlloyDB read pool troubleshooting documentation: https://cloud.google.com/alloydb/docs/troubleshoot/read-pools
- Google Cloud AlloyDB replication troubleshooting documentation: https://cloud.google.com/alloydb/docs/troubleshoot/replication-issues
- Google Cloud Monitoring AlloyDB metrics reference: https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- Psycopg 2 connection pooling documentation: https://www.psycopg.org/docs/pool.html
- node-postgres Pool API documentation: https://node-postgres.com/apis/pool
- PgBouncer configuration documentation: https://www.pgbouncer.org/config.html
- PostgreSQL Hot Standby documentation: https://www.postgresql.org/docs/current/hot-standby.html

## Issues Found
- The post claimed that AlloyDB read pool instances have no replication lag and that writes are immediately visible because read pools read from the same storage. Google Cloud documents read pool replication lag, replay lag, and lag troubleshooting. Updated the wording to describe AlloyDB read pools as low-lag rather than no-lag, and clarified that changes become visible after they are available and replayed on read nodes.
- The post described a read pool as a group of read-only instances. Google Cloud defines a read pool instance as an instance containing one or more read-only nodes. Updated the terminology and changed load-balancing wording from connections to requests to match the AlloyDB documentation.
- The Cloud Monitoring example used `alloydb.googleapis.com/database/cpu/utilization`, which is not the documented AlloyDB instance CPU metric. Updated it to `alloydb.googleapis.com/instance/cpu/average_utilization` for the `alloydb.googleapis.com/Instance` monitored resource.

## Review Notes
- The `gcloud alloydb instances create` and `gcloud alloydb instances update` examples use documented flags for read pool creation and node-count scaling.
- The examples stay within AlloyDB's documented read pool node limits, though real clusters have a maximum of 20 read pool nodes across all read pool instances.
- The psycopg2, node-postgres, and PgBouncer snippets use valid APIs and configuration keys. Production deployments should still avoid hard-coded credentials and should size pools according to application concurrency and database connection limits.
