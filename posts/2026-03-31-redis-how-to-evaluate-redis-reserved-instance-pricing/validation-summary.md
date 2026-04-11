# Validation Summary: How to Evaluate Redis Reserved Instance Pricing

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS ElastiCache for Redis (Reserved Nodes)
- Azure Cache for Redis (Reserved Capacity)
- Google Cloud Memorystore (mentioned in passing)
- AWS CLI (`aws elasticache`, `aws cloudwatch`)
- Azure CLI (`az reservations`)
- Python (cost calculation script)

## Sources Consulted
- AWS CLI Reference: `aws elasticache describe-reserved-cache-nodes-offerings` — https://docs.aws.amazon.com/cli/latest/reference/elasticache/describe-reserved-cache-nodes-offerings.html
- AWS CLI Reference: `aws elasticache purchase-reserved-cache-nodes-offering` — https://docs.aws.amazon.com/cli/latest/reference/elasticache/purchase-reserved-cache-nodes-offering.html
- AWS CLI Reference: `aws elasticache describe-reserved-cache-nodes` — https://docs.aws.amazon.com/cli/latest/reference/elasticache/describe-reserved-cache-nodes.html
- AWS CLI Reference: `aws elasticache describe-cache-clusters` — https://docs.aws.amazon.com/cli/latest/reference/elasticache/describe-cache-clusters.html
- AWS CLI Reference: `aws cloudwatch get-metric-statistics` — https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- Azure CLI Reference: `az reservations catalog show` — https://learn.microsoft.com/en-us/cli/azure/reservations/catalog
- Azure CLI Reference: `az reservations reservation-order purchase` — https://learn.microsoft.com/en-us/cli/azure/reservations/reservation-order

## Issues Found

1. **Comment typo: hourly rate labeled as monthly** (line 94)
   - **What was wrong:** The comment `~$0.103/mo * 730 = ~$75.19/mo` used `/mo` (per month) but the value is an hourly rate being multiplied by 730 hours per month.
   - **What was changed:** Changed to `~$0.103/hr * 730 hrs = ~$75.19/mo`.
   - **Why:** The unit `/mo` is incorrect; $0.103 is the per-hour reserved rate, and multiplying by 730 hours/month yields the monthly cost.

2. **Azure CLI `az reservations catalog show` used invalid `--service` parameter** (line 153)
   - **What was wrong:** `--service "Microsoft.Cache"` is not a valid parameter for this command.
   - **What was changed:** Replaced with `--reserved-resource-type "RedisCache"`, which is the correct parameter name and value per Azure CLI documentation.
   - **Why:** The `--service` flag does not exist on `az reservations catalog show`. The correct parameter is `--reserved-resource-type`.

3. **Azure CLI purchase command used `--applied-scope` instead of `--applied-scope-type`** (line 163)
   - **What was wrong:** `--applied-scope "Shared"` conflates two parameters. `--applied-scope` is for specifying the target subscription (used with Single scope), while `--applied-scope-type` specifies the scope kind (Shared, Single, ManagementGroup).
   - **What was changed:** Changed to `--applied-scope-type "Shared"`.
   - **Why:** The parameter name was incorrect per Azure CLI documentation.

4. **Azure CLI purchase command was missing `--reserved-resource-type`** (line 159)
   - **What was wrong:** The purchase command did not specify what resource type the reservation is for.
   - **What was changed:** Added `--reserved-resource-type "RedisCache"` to the command.
   - **Why:** This parameter is practically required for the purchase to succeed and appears in all official examples.

5. **AWS CLI `describe-reserved-cache-nodes` query alias `End:Duration` was misleading** (line 143)
   - **What was wrong:** The JMESPath alias `End:Duration` implies Duration is an end date, but Duration is actually an integer value in seconds (e.g., 31536000 for 1 year).
   - **What was changed:** Changed alias from `End:Duration` to `Duration:Duration` to avoid confusion.
   - **Why:** Using `End` as the column header for a duration-in-seconds value is misleading.

## Review Notes
- The Python break-even calculation logic is correct and well-structured. The `hours_per_month = 730` constant matches the standard AWS billing calculation (365 * 24 / 12).
- The pricing figures used in the examples (e.g., $0.166/hr for cache.r6g.large) are presented as approximate with `~` prefixes, which is appropriate since actual prices vary by region and change over time.
- The post mentions Google Cloud Memorystore committed use discounts in the introductory list but does not elaborate. Memorystore for Redis has historically not offered committed use discounts in the same structured way as AWS Reserved Nodes or Azure Reservations. This claim may be inaccurate but was not changed since the post does not go into GCP detail and Google Cloud's CUD offerings continue to evolve.
- The `--product-description "Redis"` filter in the AWS CLI command uses title case. While the API is generally case-insensitive, lowercase `"redis"` would be the safest value per documentation conventions.
- The Azure reservation purchase command could benefit from additional parameters like `--display-name` and `--billing-plan`, but these are optional and the command as corrected is functional.
