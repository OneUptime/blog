# Validation Summary: Allocating Savings Plan and Reserved Instance Discounts Fairly

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- FinOps commitment-discount allocation and showback
- FinOps Open Cost and Usage Specification (FOCUS) 1.4
- AWS Savings Plans, Reserved Instances, Cost and Usage Reports, and Data Exports
- AWS Organizations discount sharing and cost-allocation tags
- Azure Cost Management Actual Cost and Amortized Cost datasets
- Azure savings plans, reservations, and cost allocation rules
- Google Cloud committed use discount attribution and BigQuery billing exports

## Sources Consulted
- FOCUS Specification v1.4: https://focus.finops.org/focus-specification/v1-4/
- FinOps Foundation Allocation capability: https://www.finops.org/framework/capabilities/allocation/
- AWS Understanding Savings Plans in Cost and Usage Reports: https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html
- AWS Savings Plans data columns: https://docs.aws.amazon.com/cur/latest/userguide/savingsplans-columns.html
- AWS reservation data columns: https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html
- AWS Data Exports table dictionary: https://docs.aws.amazon.com/cur/latest/userguide/dataexports-table-dictionary.html
- AWS CUR 2.0 table dictionary: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html
- AWS Reserved Instances and Savings Plans discount sharing: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html
- AWS user-defined cost allocation tag activation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html
- Azure savings plan cost and usage details: https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/utilization-cost-reports
- Azure reservation cost and usage details: https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/understand-reserved-instance-usage-ea
- Azure amortized benefit costs: https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/view-amortized-costs
- Azure cost allocation rules: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/allocate-costs
- Google Cloud committed use discount attribution: https://cloud.google.com/docs/cuds-attribution

## Issues Found
- The `EffectiveCost` description characterized the whole metric as amortized cost. FOCUS defines it more broadly as charge-period cost after applicable pricing adjustments, including the recognized or amortized portion of related covering purchases. Reworded the description to preserve that distinction.
- The `ListCost` description said that the metric represents provider-published list-price cost only "when that data is available." FOCUS 1.4 makes `ListCost` a mandatory, non-null Cost and Usage column, even when `ListUnitPrice` is null. Removed the availability qualifier so the description matches the specification.

## Review Notes
The post contains no executable code, terminal commands, or configuration snippets, but it is a technical guide because it gives concrete, provider-specific billing-data and allocation guidance. The AWS claims match the current legacy CUR/Data Exports field definitions: `savingsPlan/SavingsPlanEffectiveCost` is allocated to covered-usage lines, `reservation/EffectiveCost` applies to discounted usage, and unused RI cost is represented through the unused upfront and recurring fee fields. Current AWS documentation also supports organization-wide, prioritized-group, restricted-group, and account-level discount-sharing controls.

Azure documentation confirms that Actual Cost contains purchase and benefit-application details, while Amortized Cost assigns prorated benefit cost to consuming resources and reports unused reservation or savings-plan cost separately. Azure Cost Management cost allocation rules do not support reservation or savings-plan purchases.

Google Cloud documentation confirms unattributed, proportional, and prioritized attribution behavior and its representation in billing reports and the BigQuery usage-cost export. Prioritized attribution applies to resource-based commitments, while newer spend-based commitments use proportional attribution; some spend-based products are migrating from fee-and-credit records to a discount-based consumption model, so implementations should continue to follow the post's product-specific verification advice.
