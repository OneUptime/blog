# Validation Summary: How to Use Committed Use Discounts to Save on Compute Engine Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Compute Engine
- Committed Use Discounts
- Resource-based commitments
- Compute flexible commitments
- Sustained Use Discounts
- gcloud CLI
- BigQuery billing export

## Sources Consulted
- Google Cloud Compute Engine CUD overview: https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview
- Google Cloud resource-based CUD documentation: https://docs.cloud.google.com/compute/docs/instances/signing-up-committed-use-discounts
- Google Cloud Compute Engine pricing documentation: https://cloud.google.com/products/compute/pricing
- Google Cloud SDK reference for `gcloud compute commitments create`: https://cloud.google.com/sdk/gcloud/reference/compute/commitments/create
- Google Cloud Recommender IDs: https://docs.cloud.google.com/recommender/docs/recommenders
- Google Cloud sustained use discounts documentation: https://docs.cloud.google.com/compute/docs/sustained-use-discounts
- Google Cloud auto-renew resource-based commitments documentation: https://docs.cloud.google.com/compute/docs/instances/renew-commitments-automatically

## Issues Found
- The post used outdated maximum CUD savings of up to 57%. Updated this to current Compute Engine resource-based CUD savings of up to 70% for memory-optimized machine types and up to 55% for other machine types.
- The discount table listed outdated family-specific percentages. Replaced it with the current documented resource-based and Compute flexible CUD discount percentages.
- The post said resource-based commitments apply across a machine family. Updated this to machine series, because current Compute Engine commitments are selected by series and general-purpose series such as N2, N2D, and E2 do not overlap.
- The `gcloud compute commitments create` examples used the API-style `GENERAL_PURPOSE` value. Updated the examples to use the current gcloud CLI value `general-purpose-n2`.
- The BigQuery billing export query claimed to find average daily vCPU and memory usage but only queried core SKUs and did not aggregate by day. Replaced it with a daily aggregation for vCPU and RAM pricing-unit usage and divided by 24 to estimate committed units.
- The post said CUDs cannot be transferred between billing accounts or projects. Clarified that resource-based commitments are purchased for a specific project, but eligible discounts can be shared across projects on the same Cloud Billing account when CUD sharing is enabled.
- The post said CUDs renew manually and do not auto-renew. Updated this to state that auto-renewal is disabled by default but can be enabled on resource-based commitments.
- The example savings calculation used the old 20% and 35% discount figures. Updated the calculation to use current resource-based CUD maximum discounts for non-memory-optimized machine types.

## Review Notes
The local environment did not have `gcloud` installed, so CLI syntax was verified against official Google Cloud SDK and Compute Engine documentation rather than local `--help` output. Pricing examples remain approximate because Google Cloud pricing varies by region, SKU, and account-specific pricing terms.
