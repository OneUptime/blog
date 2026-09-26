# Cloudability Cost Metrics Compared: List Through Adjusted Amortized

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Management, AWS, Cost Optimization

Description: Choose a Cloudability cost metric for invoice analysis, usage comparisons, budgets, and showback while keeping commitment timing and custom pricing explicit.

Two Cloudability reports can disagree while both are correct. One might show the cash charge for purchasing a commitment, while another spreads that commitment's cost across the usage that benefits from it. A third might apply enterprise pricing rules.

Choose the metric before designing the dashboard. Its name should be part of the report's contract with its audience, alongside scope, dates, currency, and allocation policy.

## Separate the questions a metric can answer

There are three decisions behind the five common cost metrics:

1. Are you studying public-rate consumption or billed amounts?
2. Should commitment purchases remain at their billing time or be amortized?
3. Should configured custom pricing adjustments apply?

The practical comparison is:

| Metric | Interpretation | Useful starting point |
| --- | --- | --- |
| Cost (List) | Public on-demand comparison, with Cloudability's documented treatment of particular charge types | Demand comparison and budgets designed around list cost |
| Cost (Total) | Vendor-reported cash-oriented cost | Billing analysis and an invoice reconciliation bridge |
| Cost (Adjusted) | Total cost with custom pricing rules | Cash-oriented reporting with configured discounts applied |
| Cost (Amortized) | Commitment cost attributed over consumption | Economic showback and commitment analysis |
| Cost (Adjusted Amortized) | Amortized cost with custom pricing rules | Economic showback incorporating configured pricing |

The adjusted metrics require Cloudability's custom pricing module. They should not be assumed to appear or to carry meaningful adjustments in every organization. [IBM cost metric glossary](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reference-cloudability-glossary-cost-dimensions-metrics), [Custom discounts and EDP](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=plan-custom-discounts-enterprise-discount-programs-edp)

## Use Total for billing timing

For AWS, IBM changed Cost (Total) in January 2024 to directly reflect CUR `lineItem/UnblendedCost`, removing older RI-specific redistribution rules. Aggregate totals were unaffected, but the allocation between RI usage and recurring fee rows changed. This matters when comparing old saved reports with newly processed data. [IBM's Cost (Total) change notice](https://community.ibm.com/community/user/viewdocument/notice-upcoming-changes-to-the-cos?CommunityKey=15c0e07d-35c0-49de-a84b-019253d13376&hlmlt=VT&tab=librarydocuments)

A resource with no cash charge on a covered-usage row is not necessarily free. Its commitment purchase or recurring charge can be recorded elsewhere. Consequently, a resource-level Total report should not automatically become a team-efficiency leaderboard.

For invoice work, keep taxes, credits, refunds, support, and other fee classes visible. A report filtered to normal usage cannot reconcile an invoice containing additional charges, regardless of which cost metric you select.

## Use Amortized for period economics

IBM documents AWS amortization as combining CUR components for covered consumption, with unused commitment cost represented separately against its owner. This makes the metric useful when benefits cross account boundaries. [IBM's amortized cost explanation](https://www.ibm.com/support/pages/node/7283570)

Consider an illustrative commitment with a $120 economic cost for a reporting period. Team A consumes $70, Team B consumes $30, and $20 remains unused. A consumption-oriented report should preserve those three amounts:

```text
Team A consumed commitment:  70
Team B consumed commitment:  30
Unused commitment:          20
Period commitment total:   120
```

The purchase invoice may have a completely different timing pattern. Comparing that invoice directly with the $100 consumed subtotal would miss both the unused amount and the timing difference.

Decide separately who absorbs unused commitments. A cost metric provides the economic information; your organization's allocation policy decides whether that residual stays with a central team or is distributed.

## Treat Adjusted as configured business logic

Adjusted cost is not a universal synonym for “the final invoice.” It expresses the pricing rules configured in the product. Before relying on it, record the applicable agreement, date range, exclusions, and owner of the pricing configuration.

For an internal report, ask whether enterprise savings should flow to individual teams. If yes, an adjusted basis may support that policy. If finance deliberately retains those savings centrally, publish the central adjustment rather than quietly changing team rates.

Review a small sample of affected and unaffected usage whenever custom pricing changes. A blanket percentage assumption can be wrong when the agreement excludes particular services or charge types.

Also avoid equating Cloudability Adjusted Amortized with an AWS net-cost field solely because both involve discounts. Reconciliation requires checking the actual transformation and configuration, not matching similar labels.

## List is a comparison basis, not a larger invoice

Cloudability's budgeting documentation explains that List can assign on-demand cost to covered or spot usage while zeroing selected commitment fees and pricing credits. It is therefore possible for List to be lower than another cost metric for some report slices. [IBM budgets and forecasts](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=plan-budgets-forecasts)

That behavior makes a simple “List minus Total equals realized savings” calculation unreliable unless the scopes and charge treatments are aligned. A purchase-month commitment fee can distort the comparison even if underlying consumption is unchanged.

Use List as a consistent reference where that is the intended business question. For example, a workload owner may need to understand whether demand increased independently of a newly negotiated discount. Pair the cost comparison with usage quantities so a rate change does not hide growing consumption.

## Write a report contract

A useful report description might read:

> Monthly engineering showback, using Cost (Adjusted Amortized), covering the production account group in USD. Unused commitment cost remains with central FinOps. Shared platform allocation is shown separately.

That description prevents a reader from mistaking the report for a payable invoice or a public-rate budget.

Before publishing, compare one uncommitted usage row, one RI-covered row, one Savings Plan-covered row, a commitment fee, and a credit where those classes exist. Then reconcile the aggregate using the same view and period.

Keep different metrics in separate named columns rather than renaming every amount to `cost`. The right metric is the one whose timing, pricing treatment, and scope match the decision the report is intended to support.
