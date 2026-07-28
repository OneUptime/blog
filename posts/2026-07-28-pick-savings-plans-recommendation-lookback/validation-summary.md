# Validation Summary: How to Pick a 7-, 30-, or 60-Day Lookback for AWS Savings Plans Recommendations

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- AWS Savings Plans
- AWS Cost Explorer and Billing and Cost Management
- Savings Plans Purchase Analyzer
- AWS Organizations and consolidated billing
- Reserved Instances
- AWS Cost and Usage Reports and AWS Data Exports
- FinOps commitment planning

## Sources Consulted

- [Understanding your recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-recommendations.html)
- [Customizing Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-customizing.html)
- [Viewing Savings Plans recommendation details](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-details-view.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [GetSavingsPlansPurchaseRecommendation API reference](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetSavingsPlansPurchaseRecommendation.html)
- [StartSavingsPlansPurchaseRecommendationGeneration API reference](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_StartSavingsPlansPurchaseRecommendationGeneration.html)
- [AWS Savings Plans FAQ](https://aws.amazon.com/savingsplans/faqs/)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Understanding your analysis calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis-calculations.html)
- [Savings Plans quotas and restrictions](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-quotas.html)
- [Getting Started with AWS Savings Plans](https://aws.amazon.com/blogs/aws-cloud-financial-management/getting-started-with-aws-savings-plans/)
- [Understanding AWS Savings Plan Recommendations: Payer vs. Linked Account Views](https://aws.amazon.com/blogs/aws-cloud-financial-management/understanding-aws-savings-plan-recommendations-payer-vs-linked-account-views/)
- [Introducing Target Coverage in Savings Plans Purchase Analyzer](https://aws.amazon.com/blogs/aws-cloud-financial-management/introducing-target-coverage-in-savings-plans-purchase-analyzer/)
- [Understanding the Cost and Usage Report](https://docs.aws.amazon.com/cur/latest/userguide/dataexports-cur-info.html)
- [Cost and Usage Report (CUR) 2.0](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html)

## Issues Found

- The inputs list referred to the "current RI and Savings Plans inventory." AWS explicitly documents that refreshed recommendations use the current Savings Plans inventory, while existing Reserved Instances affect which historical usage remains uncovered and eligible for an additional Savings Plans commitment. Changed this to "current Savings Plans inventory and existing RI coverage."
- The phrase "usage and offering rates in the chosen period" could incorrectly imply that the recommendation uses historical offering rates from the lookback window. The lookback applies to eligible usage; AWS calculates the recommendation using Savings Plans rates for the selected offering. Changed the phrase to distinguish the historical usage window from the offering rates.

## Review Notes

- The post contains no code examples, terminal commands, or configuration snippets, but it is a technical guide because it explains how to configure and interpret AWS Savings Plans recommendations.
- AWS currently supports the stated 7-, 30-, and 60-day recommendation lookbacks. The recommendation calculation is historical, uses hourly usage, assumes an immediate purchase, does not forecast usage, and does not account for queued or scheduled purchases.
- The plan types, account-scope behavior, Database Savings Plans one-year/No Upfront limitation, Purchase Analyzer controls, 90-day expiring-plan exclusion horizon, target-coverage option, and three-refreshes-per-day consolidated-family quota were verified against current AWS documentation.
- All seven AWS links in the post's Official Documentation section resolve to the appropriate AWS documentation or FAQ pages.
