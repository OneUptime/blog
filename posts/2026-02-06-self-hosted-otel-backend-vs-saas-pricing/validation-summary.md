# Validation Summary: Compare Self-Hosted OpenTelemetry Backend Costs vs SaaS Vendor Pricing at Scale

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- ClickHouse
- Grafana
- AWS EC2
- Amazon EBS gp3
- Amazon S3
- Python
- Observability SaaS pricing models

## Sources Consulted
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Semantic Conventions documentation: https://opentelemetry.io/docs/concepts/semantic-conventions/
- AWS Price List Bulk API documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/sp-offer-file.html
- AWS EC2 current us-east-1 price list file: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json
- Amazon EBS gp3 volume type pricing: https://aws.amazon.com/ebs/volume-types/
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- Amazon EC2 On-Demand pricing and data transfer notes: https://aws.amazon.com/ec2/pricing/on-demand/
- New Relic pricing documentation: https://docs.newrelic.com/docs/accounts/accounts-billing/new-relic-one-pricing-users/pricing-billing/
- New Relic public pricing page: https://newrelic.com/pricing
- Datadog pricing page: https://www.datadoghq.com/pricing/list/
- Datadog custom metrics billing documentation: https://docs.datadoghq.com/account_management/billing/custom_metrics/
- Honeycomb usage calculation documentation: https://docs.honeycomb.io/get-started/manage-costs/how-honeycomb-calculates-usage/

## Issues Found
- The SaaS pricing table presented overly broad per-GB and per-metric pricing as if it were average published vendor pricing. Updated the table to distinguish raw ingest pricing from indexing/search/retention pricing and corrected Datadog custom metrics to the documented per-100-custom-metrics model.
- The SaaS cost estimate described the model as average pricing across major vendors, which was not supported by current public pricing pages. Changed it to representative blended SaaS rates for ingest, indexing/search, and retention.
- The AWS EC2 monthly costs for `r6g.2xlarge` and `c6g.xlarge` did not match the current us-east-1 Linux On-Demand rates from the AWS price list. Updated the monthly costs and output totals using 730 hours/month.
- The side-by-side table double-counted storage and network in the self-hosted "Infrastructure" row. Updated the row to compute-only infrastructure so the table categories add up to the stated total.
- The self-hosted monthly, annual, and savings-ratio figures were based on the older instance costs and category mismatch. Recomputed them after the EC2 and table fixes.
- The break-even text presented the roughly 50 GB/day threshold too generally. Updated it to state that the threshold applies under the blended-rate model used in the example.
- The commented SaaS Python output had minor spacing differences from the actual printed output. Updated the comments to match the executed output.

## Review Notes
The examples are illustrative cost models, not vendor quotes. Actual SaaS pricing can vary substantially by contract, committed usage, retention, indexing volume, support tier, and feature add-ons. The ClickHouse compression ratio remains a workload-dependent assumption; it is plausible for telemetry but should be validated with real data before using the model for procurement.
