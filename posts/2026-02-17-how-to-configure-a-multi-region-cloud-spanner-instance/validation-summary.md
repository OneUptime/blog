# Validation Summary: How to Configure a Multi-Region Cloud Spanner Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner multi-region instance configurations
- Google Cloud CLI
- GoogleSQL DDL
- Python Cloud Spanner client library
- Cloud Monitoring

## Sources Consulted
- Google Cloud Spanner regional, dual-region, and multi-region configurations: https://docs.cloud.google.com/spanner/docs/instance-configurations
- Google Cloud Spanner replication: https://cloud.google.com/spanner/docs/replication
- Google Cloud Spanner reads outside transactions: https://docs.cloud.google.com/spanner/docs/reads
- Google Cloud Spanner pricing: https://cloud.google.com/spanner/pricing
- gcloud spanner instances create reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- gcloud spanner databases create reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/create
- gcloud spanner instance-configs list reference: https://cloud.google.com/sdk/gcloud/reference/spanner/instance-configs/list
- Python Cloud Spanner Snapshot reference: https://docs.cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.snapshot.Snapshot
- Python Cloud Spanner snapshot usage: https://docs.cloud.google.com/python/docs/reference/spanner/latest/snapshot-usage

## Issues Found
- Regional Spanner availability was listed as 99.999%. Current Google Cloud documentation lists regional configurations as 99.99%, while multi-region configurations provide 99.999%. Updated the text and decision diagram.
- The post did not mention that multi-region configurations require Spanner Enterprise Plus edition. Added this note and included `--edition=ENTERPRISE_PLUS` in the instance creation commands.
- The `gcloud spanner instances create` examples used `--display-name`, but the current gcloud reference requires `--description`. Updated both commands.
- The `nam6` topology example had incorrect region roles. Updated the sample to match the documented topology: `us-central1` and `us-east1` as read-write regions, `us-west1` and `us-west2` as read-only regions, and `us-central2` as the witness region.
- The write-flow diagram used the wrong read-write and witness regions for `nam6`. Updated it to use `us-east1` as the second read-write region and `us-central2` as the witness region.
- The read consistency explanation implied that strong reads are simply served by the nearest up-to-date replica. Updated it to explain that strong reads can go to read-write or read-only replicas, but non-leader replicas might need leader communication.
- The stale read explanation said stale reads can be served immediately by any replica. Updated it to specify that stale reads are served by the closest available read-write or read-only replica that has caught up to the requested timestamp.
- The pricing section gave rough `3x` and `9x` multipliers. Replaced those with the documented pricing basis: edition and configuration compute pricing, five or more replicas for multi-region configurations, and cross-region replication charges for writes.

## Review Notes
- The local environment does not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference documentation.
- The local environment does not have the `google-cloud-spanner` Python package installed, so Python API verification was performed against the official Python client library documentation.
