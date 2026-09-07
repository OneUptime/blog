# Validation Summary: Validating Savings Before Changing Cloud Commitments

## Status
validated

## Post Type
Technical FinOps guide with cost equations, an hourly analysis outline, scenario examples, and an illustrative YAML approval checklist. These technical details warrant review rather than classification as a non-code blog.

## Technologies Covered
- AWS Reserved Instances and Savings Plans
- Azure reservations, Reserved VM Instances, and savings plans
- Google Cloud spend-based and resource-based committed use discounts (CUDs)
- Cloud billing exports, recommendation systems, rightsizing, and commitment utilization
- YAML

## Sources Consulted
- AWS recommendation calculations: https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html
- AWS Savings Plans overview: https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html
- AWS Savings Plans types: https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html
- Azure reservation purchase analysis: https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/determine-reservation-purchase
- Azure Reserved VM Instances: https://learn.microsoft.com/en-us/azure/virtual-machines/prepay-reserved-vm-instances
- Azure savings plan discount application: https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/discount-application
- Google Cloud CUD overview: https://cloud.google.com/docs/cuds
- Google Cloud CUD recommendations: https://cloud.google.com/docs/cuds-recommender
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- Author profile link: https://www.github.com/nawazdhandala

## Issues Found
- The resource normalization sentence listed region and family as units alongside vCPU, memory, and GPU. Changed it to distinguish resource quantities (vCPU counts, memory capacity, and GPU counts) from region and family eligibility constraints. Google Cloud documentation makes this distinction when describing resource-based commitments.

## Review Notes
- AWS confirms that recommendations use historical lookback usage, do not forecast demand, and should reflect recent optimizations. Current inventory and sharing settings matter; recommendations should be refreshed after purchases, returns, or expirations.
- Azure supports consistent-base purchasing and hourly usage analysis. Reserved VM Instances provide billing discounts without guaranteed capacity. Reservation matching is more restrictive than savings plan matching, and reservation benefits apply first.
- Google documents both recommendation models and the previous 30-day analysis window. The 30% discount example is mathematically correct: at 70% utilization, standard usage cost equals a full-period commitment priced at 70% of the standard rate; greater utilization produces savings under those assumptions. This example is not a universal product discount or utilization target.
- The savings equations are conceptual and correct when evaluated over the same period with comparable rates. Cost with commitment must include unused commitment charges and any uncovered usage, as the scenario evaluation paragraph requires.
- The YAML block is syntactically valid by inspection: nested mappings contain boolean values and an integer. Its keys are a proposed organizational checklist, not cloud-provider configuration fields. Two observation cycles, a 20% downside scenario, and the migration gate are author-selected policies rather than provider requirements.
- The text blocks describe analytical inputs and scenarios; there are no executable programs, terminal commands, SDK APIs, or deployment configuration to run. No live cloud purchase or workload test was necessary or performed.
- All six documentation links and the author link resolved to the intended resources, including normal Google Cloud and GitHub redirects.
- Product eligibility, commitment units, terms, sharing, and purchase availability vary and can change. Google also documents non-hourly commitment products; the post appropriately allows other documented commitment units. Hourly modeling should be adapted to the selected product's actual benefit window. Azure documents purchase and renewal restrictions for selected legacy VM series from July 2026; the post makes no contrary availability claim.
