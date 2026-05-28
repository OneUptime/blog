# Validation Summary: How to Connect a Cloud Run Service to a Cloud SQL Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud SQL for PostgreSQL
- Cloud SQL language connectors
- Cloud SQL IAM roles
- Serverless VPC Access
- Direct VPC egress
- Secret Manager
- gcloud CLI
- Python, Flask, SQLAlchemy, psycopg2, pg8000
- Node.js, Express, Knex, node-postgres
- Go, database/sql, lib/pq
- Java, Spring Boot, Cloud SQL JDBC Socket Factory

## Sources Consulted
- Cloud SQL for PostgreSQL: Connect from Cloud Run: https://cloud.google.com/sql/docs/postgres/connect-run
- Cloud SQL for PostgreSQL: Connect using Cloud SQL language connectors: https://cloud.google.com/sql/docs/postgres/connect-connectors
- Cloud SQL for PostgreSQL: Manage database connections: https://cloud.google.com/sql/docs/postgres/manage-connections
- Cloud SQL for PostgreSQL: Configure database flags: https://cloud.google.com/sql/docs/postgres/flags
- Cloud Run: Introduction to service identity: https://cloud.google.com/run/docs/securing/service-identity
- Cloud Run: Direct VPC egress with a VPC network: https://cloud.google.com/run/docs/configuring/vpc-direct-vpc
- Cloud Run: VPC with connectors: https://cloud.google.com/run/docs/configuring/vpc-connectors
- Google Cloud SDK: gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK: gcloud secrets create reference: https://cloud.google.com/sdk/gcloud/reference/secrets/create
- Cloud SQL JDBC Socket Factory releases: https://github.com/GoogleCloudPlatform/cloud-sql-jdbc-socket-factory/releases

## Issues Found
- The post description said the guide used the built-in Cloud SQL connector and the Cloud SQL Auth Proxy, but the post primarily covers Cloud Run's built-in Cloud SQL integration and Cloud SQL language connectors. Updated the description to match the content.
- The Cloud Run Unix socket section claimed the approach works with both public and private IP instances. Current Cloud SQL documentation separates public-IP socket/connector setup from private-IP setup, where Cloud Run needs Direct VPC egress or Serverless VPC Access and should connect to the instance private IP. Updated the claim.
- The Python SQLAlchemy route used `conn.execute("SELECT 1")`, which is not valid in SQLAlchemy 2.x without wrapping textual SQL. Added `from sqlalchemy import text` and changed the call to `conn.execute(text("SELECT 1"))`.
- The Java Cloud SQL connector dependency was pinned to `postgres-socket-factory:1.14.0`, which is outdated. Updated it to `1.27.0`, the latest release found during review.
- The command labeled as checking max connections only returned the Cloud SQL tier. Updated the format expression to also show `settings.databaseFlags`, where a configured `max_connections` flag appears.
- The private-IP section said a VPC connector was required and showed `--add-cloudsql-instances` with a Unix socket path. Updated the section to describe Direct VPC egress or Serverless VPC Access and changed the example to use Direct VPC egress with a private IP address.

## Review Notes
- The public-IP Cloud Run commands, Cloud SQL Client IAM role, default Cloud Run service account format, Secret Manager command pattern, and connection pooling advice align with current Google Cloud documentation.
- The Cloud SQL docs note that PostgreSQL Unix socket clients may need the `.s.PGSQL.5432` suffix depending on the driver. The post's Python, Node.js, and Go examples use common drivers that can work with the socket directory path, so no change was required.
