# Validation Summary: How to Build a Cloud Showback Model Without Perfect Tags

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- FinOps cost allocation and cloud showback
- FinOps Open Cost and Usage Specification (FOCUS) 1.4
- AWS Billing and Cost Management, Cost Categories, account tags, and cost-allocation tags
- Azure Cost Management and tag inheritance
- Google Cloud Billing, projects, resource labels, and BigQuery billing exports

## Sources Consulted
- FinOps Foundation: Allocation capability — https://www.finops.org/framework/capabilities/allocation/
- FOCUS Specification 1.4 — https://focus.finops.org/focus-specification/v1-4/
- AWS Whitepaper: Building a cost allocation strategy — https://docs.aws.amazon.com/whitepapers/latest/tagging-best-practices/building-a-cost-allocation-strategy.html
- AWS Billing: Organizing costs using AWS Cost Categories — https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-cost-categories.html
- AWS Billing: Using user-defined cost allocation tags — https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/custom-tags.html
- AWS Billing: Using account tags for cost allocation — https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/account-tags-cost-allocation.html
- AWS Billing: Backfill cost allocation tags — https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html
- Microsoft Cost Management: Group and allocate costs using tag inheritance — https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/enable-tag-inheritance
- Microsoft Cost Management: Understand Cost Management data — https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data
- Google Cloud Resource Manager: Labels overview — https://cloud.google.com/resource-manager/docs/labels-overview
- Google Cloud Billing: Structure of detailed usage cost data export — https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/detailed-usage
- Google Cloud Resource Manager: Supported services for labels — https://cloud.google.com/resource-manager/docs/labels-supported-services

## Issues Found
1. **The reconciliation equation omitted estimated allocations**: The report contract and KPI list treat estimated cost as a distinct category, but the original equation included only direct, derived, shared, and unallocated cost. Added `estimated` so the mutually exclusive allocation buckets reconcile to total showback cost.
2. **The allocation-ladder precedence was internally contradictory**: The original text called the numbered list an order from strongest to weakest while placing broad billing-container ownership before resource-level evidence, then correctly stated that a resource-level identifier should normally override an account default. Reworded the introduction to describe fixed stages in which specific evidence can replace broad defaults.
3. **The Azure tag-inheritance statement omitted its supported billing-account scope**: Tag inheritance is not available for every Azure billing account type. Added the documented scope: Enterprise Agreement (EA), Microsoft Customer Agreement (MCA), and Microsoft Partner Agreement (MPA) with Azure plan subscriptions.
4. **The AWS cost-allocation-tag statement was overgeneralized and imprecise about backfill**: Clarified that user-defined resource tag keys require activation, noted that some keys such as `awsApplication` are automatically activated, and replaced the vague historical-window wording with the documented maximum of 12 months.
5. **The linked AWS allocation whitepaper contains outdated tag behavior**: It states that cost-allocation tags are not retrospective and that organization account tags are not usable for billing allocation, while current AWS Billing supports a 12-month tag backfill and activated account tags. Replaced that stale supporting link with current AWS Cost Categories, user-defined tag, and account-tag documentation.
6. **The confidence definitions overlapped**: The original definitions classified an authoritative one-to-one registry match as `Direct` while also classifying deterministic internal joins as `Derived`. Assigned billing-container and provider metadata to `Direct` and authoritative internal joins to `Derived` so the categories are reproducible and distinct.

## Review Notes
- The post contains no executable code, terminal commands, or configuration snippets, but it is a technical implementation guide with provider- and specification-specific behavior, so it received a full technical review and the `validated` status.
- FOCUS 1.4 is a published release. The post's distinction between accrual-oriented `EffectiveCost` and invoice-oriented `BilledCost` matches the specification.
- AWS Cost Categories support the dimensions named in the post, including accounts, services, charge types, and cost-allocation tags.
- Azure tag inheritance affects Cost Management usage records for the current month and does not write inherited tags to the resources themselves, as the post states.
- Google Cloud resource labels appear in billing reports and exports only for supported resources, and billing data reflects labels from the time they are applied rather than retroactively.
