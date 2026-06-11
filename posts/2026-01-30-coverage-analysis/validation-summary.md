# Validation Summary: How to Implement Coverage Analysis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Cost Explorer
- AWS Reserved Instances
- AWS Savings Plans
- AWS Cost and Usage Reports
- Python 3
- YAML dashboard configuration
- Mermaid diagrams

## Sources Consulted
- AWS Savings Plans coverage report metrics: https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html
- AWS Savings Plans coverage report usage: https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-usingCR.html
- AWS Savings Plans types: https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html
- AWS Compute Savings Plans and Reserved Instances: https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html
- AWS EC2 Reserved Instance overview: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html
- AWS EC2 Reserved Instance scope and size flexibility: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-scope.html
- AWS Cost Explorer Reserved Instance reporting: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-ris.html
- AWS Cost Explorer GetReservationCoverage API: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetReservationCoverage.html
- AWS Cost Explorer GetSavingsPlansCoverage API: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetSavingsPlansCoverage.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python typing documentation: https://docs.python.org/3/library/typing.html

## Issues Found
- The introduction described coverage as protection for "on-demand cloud spend" and asserted a broad 30-60% overpayment range. Changed it to "eligible usage cost" and a less absolute statement about leaving commitment discounts unused, which better matches AWS coverage terminology.
- Spot usage was included in the coverage denominator in the Python examples and first Mermaid flow. Updated the flow and Python logic so Spot usage is tracked separately and does not reduce RI/SP coverage percentage.
- The first gap-analysis savings estimate multiplied uncovered hours by a discount without applying an hourly rate. Changed it to calculate uncovered on-demand cost first, then apply the savings estimate.
- The gap detector returned a 0-100 stability score while the recommendation engine expected a 0-1 score. Changed the detector to return a ratio so the examples are internally consistent.
- The recommendation text referred to "enabling SP regional flexibility," which is not an AWS action. Reworded it to recommend Regional RIs or Compute Savings Plans for cross-region flexibility.
- The recommendation engine always rendered Savings Plan purchase steps as a Compute Savings Plan, even when the selected plan was EC2 Instance or database-oriented. Added Database Savings Plan pricing and plan-name selection so service-level examples such as RDS do not produce EC2-only guidance.
- Some runnable examples used fixed January/February 2026 dates that no longer fell inside their "last 30 days" or "expiring soon" windows. Updated those sample dates to be relative to the run date.
- The related-reading link for right-sizing pointed to a DNSSEC article. Changed it to the right-sizing strategy post.

## Review Notes
The Python snippets were extracted from the Markdown, compiled with Python 3.12.3, and executed successfully. The dashboard YAML is illustrative rather than tied to a specific dashboard product schema, so it was reviewed as pseudoconfiguration rather than as Grafana, CloudWatch, or another concrete format.
