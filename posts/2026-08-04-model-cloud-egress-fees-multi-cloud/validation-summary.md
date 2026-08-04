# Validation Summary: Model Cloud Egress Fees Before Building Multi-Cloud

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS data transfer pricing, Availability Zones, Regions, Direct Connect, PrivateLink, NAT gateways, and billing exports
- Microsoft Azure bandwidth pricing, Availability Zones, Regions, ExpressRoute, Private Link, and Cost Management
- Google Cloud VPC networking, Cloud Interconnect, Private Service Connect, Cloud NAT, load balancing, and Cloud Billing exports
- Multi-cloud traffic modeling and FinOps
- Python tiered-pricing calculation
- YAML traffic-flow records

## Sources Consulted
- [AWS EC2 On-Demand Pricing — Data Transfer](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer)
- [AWS Global Network FAQs — data transfer categories, billing, and exit credits](https://aws.amazon.com/about-aws/global-infrastructure/global-network/faqs/)
- [AWS Data Exports — understanding data transfer charges](https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html)
- [Azure Bandwidth Pricing](https://azure.microsoft.com/en-us/pricing/details/bandwidth/)
- [Azure subscription cancellation and exit-transfer process](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/cancel-azure-subscription)
- [Azure Cost Management overview](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/overview-cost-management)
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- [Google Cloud VPC Network Pricing](https://cloud.google.com/vpc/network-pricing)
- [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)
- [Google Cloud Billing — estimate monthly costs](https://cloud.google.com/billing/docs/how-to/estimate-costs)
- [Google Cloud Billing export to BigQuery](https://cloud.google.com/billing/docs/how-to/export-data-bigquery-setup)
- [Google Cloud free data transfer exit program](https://cloud.google.com/exit-cloud)
- [Google Cloud Interconnect production-level topology](https://cloud.google.com/network-connectivity/docs/interconnect/tutorials/production-level-overview)
- [Python language reference — compound statements](https://docs.python.org/3/reference/compound_stmts.html)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)

## Issues Found
- The traffic record used `compression_ratio`, and the sensitivity table labeled the variable only as `Compression`. Because “compression ratio” is used for both size reduction and compressed-to-original size, the values could be interpreted in opposite directions. Renamed the record field to `compression_factor` and the table row to `Post-compression size`, making clear that the values multiply logical bytes and that a larger value produces more billable traffic.

## Review Notes
- The Python `tiered_cost` example was executed against single-tier, multi-tier, and overflow cases; it produced the expected bracketed costs and raised the documented error when modeled tiers were exhausted.
- The YAML example parses successfully. Its keys are an illustrative model schema rather than provider configuration fields.
- The post intentionally contains no hard-coded provider rates. Current rates, units, service-specific exceptions, contract pricing, taxes, and exit-program eligibility must still be checked at model execution time, as the post advises.
