# Validation Summary: How to Set Up Cross-Region Replication with Dual-Region Buckets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Storage
- Cloud Storage dual-region and multi-region bucket locations
- Cloud Storage default replication and turbo replication
- gcloud CLI
- Terraform Google provider
- Python Cloud Storage client library

## Sources Consulted
- Google Cloud Storage bucket locations: https://docs.cloud.google.com/storage/docs/locations
- Google Cloud Storage data availability and durability: https://docs.cloud.google.com/storage/docs/availability-durability
- Google Cloud Storage managing turbo replication: https://docs.cloud.google.com/storage/docs/managing-turbo-replication
- gcloud storage buckets create reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- gcloud storage objects describe reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/objects/describe
- Google Cloud Storage pricing: https://cloud.google.com/storage/pricing
- Terraform Google provider `google_storage_bucket` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket

## Issues Found
- NAM4 was described as `us-central1` plus `us-east4` in Virginia. Google documents NAM4 as `us-central1` plus `us-east1` in South Carolina. Updated the table, diagrams, command comments, and HA architecture example.
- The custom dual-region `gcloud storage buckets create` command used `--location=us-east1+us-west1`. For configurable dual-regions, `--location` must be the location code such as `US`, with the region pair passed through `--placement`. Updated the command to `--location=US --placement=us-east1,us-west1`.
- The turbo replication commands used `DEFAULT` for creation and update before correcting themselves later. `DEFAULT` disables turbo replication; `ASYNC_TURBO` enables it. Removed the contradictory correction block and updated the examples to use `--rpo=ASYNC_TURBO`.
- The replication timing text said Google targets most objects within one hour without a specific guarantee. Updated it to match the documented targets: default replication is designed for 99.9% of newly written objects within one hour and 100% within 12 hours; turbo replication targets 100% within 15 minutes for dual-region buckets.
- The post said turbo replication costs more because GCS ensures synchronous writes to both regions. Google documents turbo replication as asynchronous replication with a shorter RPO target. Updated the explanation.
- Read and write routing was stated too broadly as nearest-region behavior. Updated it to reflect documented routing from resources located in one of the dual-region regions and automatic failover.
- The post claimed object metadata could verify whether a specific object was replicated to both regions. Cloud Storage exposes bucket RPO settings and monitoring metrics, not an object-level replication status via object metadata. Replaced this with bucket RPO checks using `gcloud storage buckets describe` and the Python client.
- The cost section stated replication network traffic is included in the storage price and used approximate premiums. Current Cloud Storage pricing bills inter-region replication per GiB for writes to dual-region and multi-region buckets, with higher turbo replication charges where applicable. Updated the cost table and explanatory text.

## Review Notes
The Terraform resource fields `location`, `rpo`, `uniform_bucket_level_access`, `versioning`, and `custom_placement_config.data_locations` match the current Google provider documentation. The post remains a valid technical tutorial after the corrections.
