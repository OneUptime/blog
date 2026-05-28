# Validation Summary: How to Create an AlloyDB for PostgreSQL Cluster and Primary Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- Google Cloud CLI
- Private Services Access
- AlloyDB Auth Proxy
- PostgreSQL / psql
- Python psycopg2
- Node.js pg

## Sources Consulted
- Google Cloud SDK reference: gcloud alloydb clusters create: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/create
- Google Cloud SDK reference: gcloud alloydb instances create: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/instances/create
- Google Cloud AlloyDB documentation: Create a cluster and its primary instance: https://docs.cloud.google.com/alloydb/docs/cluster-create
- Google Cloud AlloyDB documentation: Create a primary instance: https://docs.cloud.google.com/alloydb/docs/instance-primary-create
- Google Cloud AlloyDB documentation: Connect using the AlloyDB Auth Proxy: https://docs.cloud.google.com/alloydb/docs/auth-proxy/connect
- Google Cloud AlloyDB documentation: About the AlloyDB Auth Proxy: https://docs.cloud.google.com/alloydb/docs/auth-proxy/overview
- Google Cloud AlloyDB documentation: Connect from Compute Engine: https://docs.cloud.google.com/alloydb/docs/connect-psql
- Google Cloud AlloyDB documentation: Choose a connectivity option: https://docs.cloud.google.com/alloydb/docs/choose-alloydb-connectivity
- Google Cloud AlloyDB documentation: High availability / failover behavior: https://docs.cloud.google.com/alloydb/docs/instance-primary-secondary-failover
- Google Cloud AlloyDB documentation: Private IP overview: https://cloud.google.com/alloydb/docs/private-ip

## Issues Found
- The automated backup example used `--automated-backup-enabled`, which is not a valid `gcloud alloydb clusters create` flag. Removed that flag; specifying the automated backup schedule and retention flags enables the automated backup policy.
- The backup example described "automated daily backups" but only scheduled backups on Monday, Wednesday, and Friday. Changed the wording to "automated backups enabled."
- The Auth Proxy download URL used a generic `/v1/` path instead of the documented current release path. Updated it to the current documented Linux AMD64 download URL for v1.15.0.
- The Auth Proxy text implied it could be used directly from any local development machine with a Private Services Access cluster. Clarified that the proxy host must be able to reach the instance network and must use an IAM principal with the required AlloyDB client and Service Usage Consumer roles.
- The high availability section verified backup-related cluster fields instead of the primary instance availability setting. Updated the command to describe the primary instance and show `availabilityType`.

## Review Notes
The post is technically relevant and now matches current Google Cloud AlloyDB CLI and connection documentation. The examples intentionally use the default N2 CPU-count mapping; newer machine series are available, but the existing N2 examples remain valid.
