# Validation Summary: How to Use GCP Pricing Calculator to Estimate Monthly Cloud Costs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Pricing Calculator
- Compute Engine
- Google Kubernetes Engine
- BigQuery
- Cloud Storage
- Cloud SQL
- Cloud Load Balancing
- Artifact Registry
- Google Cloud networking and data transfer pricing

## Sources Consulted
- Google Cloud Billing documentation: Estimate your monthly costs: https://docs.cloud.google.com/billing/docs/how-to/estimate-costs
- Compute Engine documentation: Sustained use discounts: https://docs.cloud.google.com/compute/docs/sustained-use-discounts
- Compute Engine documentation: Committed use discounts overview: https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview
- Google Kubernetes Engine pricing: https://cloud.google.com/kubernetes-engine/pricing
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- Cloud Storage pricing: https://cloud.google.com/storage/pricing
- VPC network pricing: https://cloud.google.com/vpc/network-pricing
- Artifact Registry documentation: Transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud Free Program: https://cloud.google.com/free/docs/free-cloud-features

## Issues Found
- The Compute Engine committed use discount examples used outdated approximate discounts of 20% for 1 year and 35% for 3 years. Updated them to current compute flexible CUD examples of up to 28% for 1-year commitments and up to 46% for 3-year commitments on eligible machine series.
- The GKE free-tier description said one Autopilot or one Standard cluster per billing account is free. Updated this to the current $74.40 monthly free-tier credit model, which applies to Autopilot clusters or zonal Standard clusters and does not cover regional cluster fees or node compute.
- The BigQuery example used 5 TB active storage at about $100/month and 10 TB queried at about $62.50/month without clarifying the free tier. Updated the units to TiB, adjusted 5 TiB active logical storage to about $118/month, and clarified that the $62.50 query example is for billable query data beyond the monthly free tier.
- The full-stack CUD example still reflected the old 20% Compute Engine discount. Updated the VM estimate, savings, and total to match the corrected 1-year compute flexible CUD percentage.
- The network-cost tip stated that intra-region traffic is free. Updated it to clarify that same-zone VM-to-VM traffic over internal IP addresses is free, while cross-zone traffic within a region can be charged.
- The storage checklist mentioned Container Registry storage as a current component. Removed Container Registry and kept Artifact Registry because Container Registry was shut down in 2025 and Artifact Registry is the recommended replacement.
- The Sustained Use Discount tip implied all Compute Engine instances qualify. Updated it to refer to eligible Compute Engine resources, matching the documented eligibility limits.

## Review Notes
The post remains technically valid after these corrections. Several dollar amounts are approximate and region-dependent, so future reviews should re-check pricing examples against the live Google Cloud pricing pages or calculator.
