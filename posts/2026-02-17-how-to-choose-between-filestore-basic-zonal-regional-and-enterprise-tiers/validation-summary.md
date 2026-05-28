# Validation Summary: How to Choose Between Filestore Basic Zonal Regional and Enterprise Tiers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Filestore
- Filestore service tiers: Basic HDD, Basic SSD, Zonal, Regional, Enterprise
- NFS
- Google Cloud CLI

## Sources Consulted
- Google Cloud Filestore service tiers: https://docs.cloud.google.com/filestore/docs/service-tiers
- Google Cloud Filestore instance performance: https://docs.cloud.google.com/filestore/docs/performance
- Google Cloud Filestore create instance guide: https://docs.cloud.google.com/filestore/docs/creating-instances
- Google Cloud SDK reference for `gcloud filestore instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/filestore/instances/create
- Google Cloud Filestore snapshots overview: https://docs.cloud.google.com/filestore/docs/snapshots
- Google Cloud Filestore pricing: https://cloud.google.com/filestore/pricing

## Issues Found
- The post described Filestore as having "five distinct service tiers." Current Google Cloud documentation lists Zonal, Regional, Basic HDD, and Basic SSD as primary/current options, with Enterprise specifically recommended for multishares or Filestore CSI driver management of regional instances. Updated the wording to avoid overstating the tier taxonomy.
- The Basic HDD performance section said throughput and IOPS were fixed regardless of capacity. Current documentation shows different limits for 1 TiB to 10 TiB versus 10 TiB to 63.9 TiB. Updated the throughput and IOPS values.
- The Basic SSD section said performance numbers scale with capacity. Current documentation lists fixed Basic SSD limits. Removed the scaling claim.
- The Zonal performance section used outdated or inaccurate throughput examples. Updated the 10 TiB and 100 TiB read throughput values to match current documented limits.
- The Regional section said performance is the same as Zonal. Current documentation shows this is only true for the documented 10 TiB and 100 TiB capacity-based limits, while smaller capacities differ. Updated the explanation.
- The Regional `gcloud` example used `--zone` with a zonal value for a regional instance. Updated it to use `--region=us-central1`.
- The Enterprise section characterized Enterprise as the default premium mission-critical choice. Current documentation recommends Enterprise for multishares or Filestore CSI driver-managed regional instances and recommends Regional for other use cases. Updated the use-case guidance, cost description, and summary accordingly.
- The Basic SSD and Zonal cost descriptions used overly specific or inaccurate comparisons. Updated them to more general statements that align with current pricing behavior.

## Review Notes
- Google Cloud documents a restricted small-capacity Regional feature that can allow regional instances below 1 TiB in selected regions for eligible users. The post keeps the general 1 TiB minimum because that remains the broadly applicable value.
- The local environment did not have `gcloud` installed, so CLI syntax was verified against the official Google Cloud SDK reference and Filestore create-instance documentation.
