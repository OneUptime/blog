# Validation Summary: AWS Savings Plans Coverage vs Utilization: What Is the Difference?

## Status
validated

## Post Type
Technical reference and cost-optimization guide

## Technologies Covered
- AWS Savings Plans
- AWS Cost Explorer utilization and coverage reports
- Savings Plans Purchase Analyzer
- AWS Budgets
- AWS Organizations consolidated billing and discount sharing
- AWS Billing Conductor and billing transfer
- Amazon EC2 Reserved Instances

## Sources Consulted
- [Using the Savings Plans utilization report](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-usingPR.html)
- [Understanding utilization metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-pr-metrics.html)
- [Understanding coverage metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html)
- [SavingsPlansUtilization API data type](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_SavingsPlansUtilization.html)
- [SavingsPlansCoverageData API data type](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_SavingsPlansCoverageData.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Deciding which Savings Plans to purchase](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-analyzer.html)
- [Understanding your Purchase Analyzer calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis-calculations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Reviewing your Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-review-purchase-analysis.html)
- [Downloading your Savings Plans utilization report](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-dl-pr.html)
- [Downloading your Savings Plans coverage report](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-dl-cr.html)
- [Analyzing Savings Plans, reservation coverage, and utilization reports with AWS Billing Conductor](https://docs.aws.amazon.com/billingconductor/latest/userguide/analyzing-abc-sp.html)
- [Creating a Savings Plans budget](https://docs.aws.amazon.com/cost-management/latest/userguide/create-savingsplans-budget.html)

## Issues Found
- The high-utilization/low-coverage discussion equated high utilization with a fully consumed commitment. Changed it to say the commitment is well used and nearly or fully consumed, because a high percentage can still leave some commitment unused.
- The Savings Plans application-order sentence compressed Reserved Instance priority, Savings Plans type priority, and usage priority into an ambiguous sequence. Clarified that EC2 Reserved Instances apply first, EC2 Instance Savings Plans precede Compute Savings Plans, and commitments apply to eligible usage with the highest potential savings percentage first.
- The cross-account utilization example omitted the requirement that Savings Plans discount sharing be enabled. Added that condition.
- The Purchase Analyzer step could imply that adjusted demand can be supplied to the analyzer. Clarified that a custom commitment can be sized to the independently calculated durable floor, but Purchase Analyzer still evaluates it against historical usage from the selected lookback period.
- The AWS Budgets statement implied that coverage could be monitored against a general policy range. Changed it to the supported behavior: Savings Plans utilization and coverage alerts trigger when the metric falls below a configured threshold.

## Review Notes
The post contains no executable code, terminal commands, or configuration snippets. The formulas, report metrics, supported report filters and granularities, CSV export behavior, consolidated-billing aggregation, pro forma reporting caveat, and up-to-48-hour metric-generation delay were verified against current AWS documentation. No version-specific or deprecated interfaces are used.
