# Validation Summary: How to Choose Between Cloud Storage Classes Standard Nearline Coldline

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Storage
- Cloud Storage storage classes: Standard, Nearline, Coldline, Archive
- Cloud Storage Object Lifecycle Management
- Cloud Storage Autoclass
- Google Cloud CLI `gcloud storage`

## Sources Consulted
- Google Cloud Storage classes: https://cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage pricing: https://cloud.google.com/storage/pricing
- Google Cloud Storage Object Lifecycle Management: https://cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage lifecycle management commands: https://cloud.google.com/storage/docs/managing-lifecycles
- Google Cloud Storage Autoclass: https://cloud.google.com/storage/docs/autoclass
- Google Cloud Storage Autoclass usage: https://cloud.google.com/storage/docs/using-autoclass
- Google Cloud Storage bucket creation: https://cloud.google.com/storage/docs/creating-buckets
- Google Cloud CLI `gcloud storage buckets create`: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud CLI `gcloud storage buckets update`: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud CLI `gcloud storage cp`: https://cloud.google.com/sdk/gcloud/reference/storage/cp

## Issues Found
- Updated pricing units from GB to GiB, clarified that the example rates are current regional us-central1 pricing, and adjusted the examples to use 1000 GiB consistently.
- Replaced `gsutil` examples with current `gcloud storage` commands because Google Cloud now documents `gsutil` as a legacy, minimally maintained Cloud Storage CLI and recommends `gcloud storage`.
- Updated the lifecycle JSON example to the `gcloud storage buckets update --lifecycle-file` format and changed the apply/verify commands to current `gcloud storage` equivalents.
- Corrected the Autoclass example to set `--autoclass-terminal-storage-class=ARCHIVE`, because Autoclass defaults to Nearline as the terminal storage class unless Archive is configured.
- Corrected the Autoclass pricing explanation to mention the object management fee and possible enablement charges instead of describing it as only a storage-cost premium.
- Corrected the dual-region command to use `--location=US --placement=us-central1,us-east1`, which matches the documented configurable dual-region creation pattern.
- Replaced fixed dual-region and multi-region cost multipliers with location-dependent pricing language and noted inter-region replication charges for writes.
- Narrowed the "temporary data" guidance because Standard is not universally cheaper for every object deleted before 30 days; the minimum-duration charge depends on retention time, storage class, access, and operations.

## Review Notes
Pricing varies by location and can change over time. The post now says the table uses current us-central1 regional pricing, rounded to monthly GiB rates.
