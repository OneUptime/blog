# Validation Summary: How to Resolve Showback Disputes When Engineering Teams Do Not Trust the Numbers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cloud showback and FinOps reporting
- Cloud cost allocation and shared-cost allocation
- FinOps Open Cost and Usage Specification (FOCUS)
- AWS Billing cost allocation tags and tag backfill
- AWS Cost Categories split charges
- Google Cloud Billing detailed usage exports and labels
- Azure Cost Management usage data and resource tags

## Sources Consulted
- FinOps Foundation Allocation capability: https://www.finops.org/framework/capabilities/allocation/
- FinOps Foundation Reporting & Analytics capability: https://www.finops.org/framework/capabilities/reporting-analytics/
- FOCUS Specification v1.3: https://focus.finops.org/focus-specification/v1-3/
- AWS Billing cost allocation tags documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html
- AWS Billing cost allocation tag backfill documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html
- AWS Billing Cost Categories split charges documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/splitcharge-cost-categories.html
- AWS Cost and Usage Reports overview: https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html
- Google Cloud Billing detailed usage export schema: https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/detailed-usage
- Google Cloud Billing standard usage export schema: https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage
- Azure Cost Management data documentation: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data

## Issues Found
- The reconciliation guidance required cost conservation at every step but mentioned only filters as an exception. FOCUS permits the aggregate `EffectiveCost` for a billing period to differ from invoice-aligned `BilledCost` because prepaid purchases can be amortized across later eligible usage. Updated the sentence to require conservation within the selected cost basis and to make cost-basis transformations an explicit reconciliation exception.

## Review Notes
The post contains no executable code, terminal commands, or configuration snippets; the fenced blocks are a conceptual reconciliation chain and an arithmetic showback example. It is still a technical guide because it describes concrete cost-data semantics, provider metadata behavior, and allocation controls. After the correction above, the FOCUS `BilledCost` and `EffectiveCost` descriptions match the current v1.3 specification. The provider-specific claims about AWS tag-report reconciliation and backfill, Google Cloud label timing, Azure resource-tag timing, and AWS Cost Categories allocation methods also match current official documentation. AWS notes that Cost Categories split-charge results are shown on the Cost Categories details page and do not alter Cost and Usage Reports, Cost Explorer, or other AWS Cost Management tools; the post does not claim otherwise.
