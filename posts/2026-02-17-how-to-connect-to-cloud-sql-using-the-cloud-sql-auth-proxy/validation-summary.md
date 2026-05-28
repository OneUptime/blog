# Validation Summary: How to Connect to Cloud SQL Using the Cloud SQL Auth Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL
- Cloud SQL Auth Proxy v2
- Google Cloud IAM and IAM database authentication
- gcloud CLI
- Docker and Docker Compose
- systemd
- MySQL and PostgreSQL clients

## Sources Consulted
- Google Cloud documentation: About the Cloud SQL Auth Proxy - https://docs.cloud.google.com/sql/docs/postgres/sql-proxy
- Google Cloud documentation: Connect using the Cloud SQL Auth Proxy for PostgreSQL - https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Google Cloud documentation: Log in using IAM database authentication for PostgreSQL - https://docs.cloud.google.com/sql/docs/postgres/iam-logins
- Google Cloud IAM documentation: Cloud SQL roles and permissions - https://docs.cloud.google.com/iam/docs/roles-permissions/cloudsql
- GoogleCloudPlatform/cloud-sql-proxy command source and help text - https://github.com/GoogleCloudPlatform/cloud-sql-proxy/blob/main/cmd/root.go

## Issues Found
- The install examples described the download as "latest" but used Cloud SQL Auth Proxy 2.8.0. Updated binary URLs and Docker image references to 2.22.0, matching the current Google Cloud documentation reviewed on 2026-05-28.
- The multiple-instance TCP example repeated `--port`, but in Cloud SQL Auth Proxy v2 that flag sets the initial listener port and later listeners increment from it. Updated the example to use per-instance query parameters for explicit ports.
- The health check endpoint descriptions were slightly inaccurate. Updated `/startup`, `/readiness`, and `/liveness` descriptions to match the proxy's official help text.
- The troubleshooting note said `--auto-iam-authn` caches IAM tokens for slow connections. Updated it to describe `--auto-iam-authn` as the flag for IAM database authentication and recommended connection pooling for connection latency.

## Review Notes
- The remaining commands and configuration snippets are consistent with Cloud SQL Auth Proxy v2 behavior and Google Cloud documentation.
- The Docker Compose `version` key is accepted by common Compose tooling but is optional in modern Docker Compose.
