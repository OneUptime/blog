# Validation Summary: How to Connect to Cloud Spanner Using the PostgreSQL Interface

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner PostgreSQL interface
- PGAdapter
- Google Cloud CLI
- Docker
- psql
- Python psycopg2
- Node.js node-postgres
- Go pgx
- SQLAlchemy 2
- Kubernetes sidecar containers

## Sources Consulted
- Google Cloud Spanner PGAdapter overview: https://docs.cloud.google.com/spanner/docs/pgadapter
- Google Cloud Spanner Start PGAdapter: https://docs.cloud.google.com/spanner/docs/pgadapter-start
- Google Cloud Spanner getting started with PGAdapter: https://docs.cloud.google.com/spanner/docs/getting-started/pgadapter
- Google Cloud Spanner PostgreSQL interface: https://docs.cloud.google.com/spanner/docs/postgresql-interface
- Google Cloud Spanner PostgreSQL DDL reference: https://docs.cloud.google.com/spanner/docs/reference/postgresql/data-definition-language
- Google Cloud Spanner PostgreSQL data types: https://docs.cloud.google.com/spanner/docs/reference/postgresql/data-types
- Google Cloud Spanner PostgreSQL functions: https://docs.cloud.google.com/spanner/docs/reference/postgresql/functions
- Google Cloud Spanner drivers overview: https://docs.cloud.google.com/spanner/docs/drivers-overview
- Google Cloud Spanner psycopg2 connection guide: https://docs.cloud.google.com/spanner/docs/pg-psycopg2-connect
- Google Cloud Spanner node-postgres connection guide: https://docs.cloud.google.com/spanner/docs/pg-node-postgres-connect
- Google Cloud Spanner SQLAlchemy 2 PostgreSQL dialect guide: https://docs.cloud.google.com/spanner/docs/use-sqlalchemy-pg
- Google Cloud Spanner transactions overview: https://docs.cloud.google.com/spanner/docs/transactions
- Google Cloud Spanner reads documentation: https://docs.cloud.google.com/spanner/docs/reads
- gcloud spanner databases create reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/create
- gcloud spanner instances create reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create

## Issues Found
- The Docker PGAdapter command said it would use application default credentials but did not mount local gcloud credentials into the container. Added the gcloud config volume mount and `CLOUDSDK_CONFIG` environment variable.
- The Docker PGAdapter command used `-x 0.0.0.0`, but PGAdapter documents `-x` as a boolean flag to enable non-localhost connections. Changed it to `-x` and updated the surrounding explanation.
- The psycopg2 sample passed empty username and password values. Official psycopg2 guidance connects with database, host, and port only, so the empty credentials were removed.
- The pgx sample used a URL without username/password and omitted `sslmode=disable`. Official pgx guidance requires username/password placeholders, which PGAdapter ignores, and recommends disabling SSL for faster local PGAdapter connections. Updated the URL.
- The SQLAlchemy sample used an invalid/incomplete PostgreSQL URL for the documented SQLAlchemy 2 + psycopg3 setup. Updated it to `postgresql+psycopg://user:password@localhost:5432/my-pg-database`.
- The unsupported-features section incorrectly described all sequences as unsupported. Spanner now supports bit-reversed sequences and identity columns, while `SERIAL` remains a PostgreSQL compatibility gap. Updated the wording.
- The consistency section incorrectly implied Spanner generally lacks read-your-writes across transactions. Updated it to describe strong reads as the default, stale reads as intentionally older, and read-write transactions as serializable by default with retryable aborts under contention.

## Review Notes
The post is technically valid after the corrections. Future improvements could call out that PostgreSQL compatibility is broad but not complete, and that production authentication for PGAdapter sidecars is usually handled with workload identity or a mounted service account credential rather than local gcloud credentials.
