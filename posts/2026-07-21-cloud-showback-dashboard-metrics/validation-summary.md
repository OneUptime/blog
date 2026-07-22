# Validation Summary: Which Metrics Belong in a Cloud Showback Dashboard?

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered
- FinOps Framework
- FinOps Allocation, Reporting and Analytics, Unit Economics, Usage Optimization, Rate Optimization, and Practice Operations capabilities
- FinOps Open Cost and Usage Specification (FOCUS)
- AWS Cost Categories split charge rules
- Cloud cost showback dashboards, cost allocation, forecasting, and unit economics

## Sources Consulted
- [FOCUS Specification overview and current version](https://focus.finops.org/focus-specification/)
- [FOCUS Specification v1.4](https://focus.finops.org/focus-specification/v1-4/)
- [FinOps Foundation: Allocation](https://www.finops.org/framework/capabilities/allocation/)
- [FinOps Foundation: Reporting and Analytics](https://www.finops.org/framework/capabilities/reporting-analytics/)
- [FinOps Foundation: Unit Economics](https://www.finops.org/framework/capabilities/unit-economics/)
- [FinOps Foundation: Usage Optimization](https://www.finops.org/framework/capabilities/usage-optimization/)
- [FinOps Foundation: Rate Optimization](https://www.finops.org/framework/capabilities/rate-optimization/)
- [FinOps Foundation: FinOps Practice Operations](https://www.finops.org/framework/capabilities/finops-practice-operations/)
- [AWS Billing: Splitting charges within Cost Categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/splitcharge-cost-categories.html)
- [AWS Cost Management API: CostCategorySplitChargeRule](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_CostCategorySplitChargeRule.html)

## Issues Found
- The `EffectiveCost` explanation reflected the narrower wording used by earlier FOCUS versions and mentioned only amortized prepaid commitments. It was updated to match FOCUS 1.4: effective cost recognizes resources or services used, or contract commitments recognized in a charge period, and includes applicable pricing adjustments and recognized portions of related covering purchases such as amortized prepayments and drawdowns. This also accounts for FOCUS 1.4's treatment of prepaid and postpaid covering purchases.

## Review Notes
- The post was reviewed as a technical guide because it contains FOCUS field semantics, an explicit variance calculation, allocation categories, and provider-specific split-charge behavior.
- The variance formulas are mathematically correct for an actual-minus-expected convention, and the post correctly requires explicit handling when expected cost is zero.
- AWS currently supports proportional, fixed, and even split methods. AWS also documents that split charge results appear on the Cost Categories details page and its CSV export but do not alter Cost and Usage Reports, Cost Explorer, or other AWS Cost Management tools; the post does not claim otherwise.
- FOCUS 1.4 was the current ratified specification at validation time. No deprecated commands, APIs, or configuration formats are present.
