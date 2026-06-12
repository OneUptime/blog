# Validation Summary: How to Build Commitment Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Cost Explorer
- AWS EC2 Reserved Instances
- AWS Savings Plans
- Google Cloud Committed Use Discounts
- Azure Reservations
- Azure Savings Plans
- Python
- boto3
- pandas
- matplotlib
- Mermaid

## Sources Consulted
- AWS Cost Explorer GetCostAndUsage API: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
- AWS Cost Explorer hourly granularity pricing and retention: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-hourly-granularity.html
- AWS Savings Plans User Guide: https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html
- AWS Savings Plans and Reserved Instances comparison: https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html
- AWS Compute and EC2 Instance Savings Plans pricing: https://aws.amazon.com/savingsplans/compute-pricing/
- AWS EC2 Reserved Instances pricing: https://aws.amazon.com/ec2/pricing/reserved-instances/
- Google Cloud Compute Engine committed use discounts: https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview
- Microsoft Azure Savings Plans pricing: https://azure.microsoft.com/en-us/pricing/offers/savings-plans
- Microsoft Azure Reservations pricing: https://azure.microsoft.com/en-us/pricing/offers/reservations
- Python ast module used locally to validate syntax of all Python code blocks: https://docs.python.org/3/library/ast.html

## Issues Found
- The AWS Cost Explorer example requested 90 days of `HOURLY` data. AWS documents hourly Cost Explorer data as hosted for the past 14 days, so the snippet now defaults to `DAILY` for 90-day lookbacks and raises an error if `HOURLY` is requested for more than 14 days.
- The Cost Explorer example did not handle paginated responses. Added `NextPageToken` handling so larger grouped queries do not silently drop results.
- The candidate filter compared an hourly percentile baseline against `720`, which represents roughly a monthly hour count rather than per-hour normalized usage. Changed the default threshold to `1` normalized unit/hour and updated the explanatory comment.
- The sample monthly on-demand cost calculation multiplied average hourly usage by only the hourly rate. Updated it to multiply by `730` monthly hours before applying the example rate.
- The conservative commitment calculation assumed the commitment was fully used in every period up to the total usage sum. Updated it to sum `min(actual_usage, recommended_commitment)` per period with `clip(upper=...)`.

## Review Notes
The provider discount ranges and commitment descriptions are accurate as high-level guidance, but actual savings vary by region, SKU, operating system, term, and payment option. The Python examples are illustrative and still require real account permissions, enabled Cost Explorer data, and organization-specific pricing inputs before production use.
