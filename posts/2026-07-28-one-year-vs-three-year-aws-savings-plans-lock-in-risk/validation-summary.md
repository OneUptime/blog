# Validation Summary: One-Year vs Three-Year AWS Savings Plans: How to Quantify Lock-In Risk

## Status

validated

## Post Type

Technical FinOps guide

## Technologies Covered

- AWS Savings Plans
- Compute Savings Plans
- EC2 Instance Savings Plans
- SageMaker AI Savings Plans
- Database Savings Plans
- Amazon EC2, AWS Fargate, and AWS Lambda
- AWS Cost Explorer and Savings Plans Purchase Analyzer
- Financial scenario modeling and present-value analysis

## Sources Consulted

- [What are Savings Plans?](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [AWS Savings Plans FAQ](https://aws.amazon.com/savingsplans/faqs/)
- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Compute Savings Plans and Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)
- [Reviewing and finalizing Savings Plans purchases](https://docs.aws.amazon.com/savingsplans/latest/userguide/review-purchase-cart.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Queuing a Savings Plan purchase](https://docs.aws.amazon.com/savingsplans/latest/userguide/queued-sp-cart.html)
- [Returning a purchased Savings Plan](https://docs.aws.amazon.com/savingsplans/latest/userguide/return-sp.html)
- [DescribeSavingsPlansOfferings API](https://docs.aws.amazon.com/savingsplans/latest/APIReference/API_DescribeSavingsPlansOfferings.html)
- [DescribeSavingsPlansOfferingRates API](https://docs.aws.amazon.com/savingsplans/latest/APIReference/API_DescribeSavingsPlansOfferingRates.html)

## Issues Found

- The cart-cost instruction could be read as adding the upfront payment, monthly payment, and total cost fields together, even though AWS defines `Total cost` as already including upfront and recurring payments. Changed it to use `Total cost` for nominal contractual cost and the other fields only for payment timing.
- The hourly utilization model did not account for AWS's benefit-application order. Added the documented ordering for Amazon EC2 Reserved Instances, EC2 Instance Savings Plans, Compute Savings Plans, savings percentage, and tie-breaking by the lowest Savings Plans rate, plus the rule that unused hourly commitment does not carry forward.
- The statement that No Upfront Savings Plans are not cancellable omitted AWS's limited return mechanism. Clarified that eligible plans of $100/hour or less can be returned only within seven days, in the same calendar month, and within the applicable return quota; otherwise the term commitment remains.

## Review Notes

- The headline maximum discounts, 365-day and 1,095-day term definitions, plan scopes, Database Savings Plans' one-year No Upfront offering, recommendation lookback periods, and recommendation non-forecasting caveat match current AWS documentation.
- The financial formulas are conceptually correct provided the time unit for `t` matches the approved discount-rate convention, as the post states.
- Savings Plans products, eligibility, rates, return rules, and purchase options can change. Recheck the linked AWS documentation and current offerings at each purchase decision.
