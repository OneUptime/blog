# How to Reconcile Showback Reports with the Cloud Provider Invoice

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Showback, Cloud Costs, Invoice Reconciliation

Description: Build an auditable bridge from cloud invoices to team showback, while keeping billed, effective, shared, credit, tax, and support costs distinct.

---

A showback report can be useful even when it does not equal the invoice on every row. It cannot be trusted, however, unless its totals can be traced back to the amount the provider billed. The solution is not to force one cost measure to serve every purpose. It is to create a controlled bridge between the provider invoice, the billing export, and the allocation model.

The invoice answers, "What does the organization owe?" A showback report usually answers, "Which teams benefited from this technology, and what cost should they understand?" Those questions overlap, but prepaid commitments, credits, taxes, support charges, refunds, and shared services can make their answers look different.

## Start with two explicit cost views

Maintain at least these views in the same reporting model:

- **Invoice view:** Billed or actual cost for the closed billing period. This is the financial control total.
- **Ownership view:** Effective or amortized cost, with commitment purchases spread to the usage that benefited and shared costs distributed according to policy.

FOCUS defines `BilledCost` as the charge used for invoicing, excluding amortization of upfront charges. It defines `EffectiveCost` as cost after reduced rates and discounts, including the applicable portion of prepaid purchases. Those columns are not alternatives where one is universally correct. They answer different questions.

Do not silently replace billed cost with effective cost in the reconciliation layer. Store both, label them clearly, and state which one each report uses.

## Define the reconciliation grain

Before comparing totals, align the scope on both sides:

- legal invoice issuer and provider
- billing account or payer account
- invoice identifier, where the export supplies one
- closed billing period rather than usage date alone
- billing currency
- tax treatment
- marketplace and third-party charges
- credit, refund, and adjustment treatment

This matters because one organization can receive multiple invoices for a month, sometimes from different sellers or in different currencies. A usage-date filter can also place a late-rated charge in a different bucket from the invoice that contains it.

The reconciliation key should therefore look more like `(provider, invoice issuer, billing account, invoice, billing period, currency)` than simply `(month)`.

## Build a provider control total first

Ingest the provider's final detailed billing data without allocation changes. Preserve the raw export and its delivery or manifest metadata so a later rerun is reproducible.

Provider-specific details affect the control:

- **AWS:** The Bills page and issued invoice are the authority for the amount owed. AWS documents that Cost Explorer can differ from billing data because of grouping, timing, rounding, and the presentation of discounts, credits, refunds, and taxes. Reconcile at the payer or billing-transfer scope that actually receives the invoice, and retain invoice IDs and service providers.
- **Azure:** Use actual cost when reconciling the invoice. Microsoft describes actual cost as the view showing charges as billed, while amortized cost spreads reservation and savings plan purchases. Azure also notes that Cost Management data does not include some invoice elements, including support, taxes, and credits, so those need an explicit invoice-only bridge when applicable.
- **Google Cloud:** Use billing period and invoice-level reporting, not only usage date. Google's invoice view includes items such as taxes, contractual credits, adjustments, surcharges, and rounding. The BigQuery billing export exposes `invoice.month`, credits, and cost types that can be used to calculate invoice-period totals.

Do not allocate anything yet. First prove that the detailed provider data plus documented invoice-only items reaches the invoice total.

## Use a three-part reconciliation bridge

A practical bridge separates provider facts from internal policy:

| Layer | Question | Typical contents |
| --- | --- | --- |
| Provider bridge | Does detailed billing explain the invoice? | usage, purchases, credits, refunds, tax, support, adjustments, rounding |
| Cost-basis bridge | Why does ownership cost differ from billed cost? | commitment purchases, amortized benefits, unused commitments |
| Allocation bridge | Where did the ownership cost go? | direct teams, shared allocations, central costs, unallocated costs |

For each layer, require a conservation check:

```text
invoice total
= provider detailed billed cost
+ invoice-only items
+ documented reconciliation differences

ownership cost pool
= direct effective cost
+ shared effective cost
+ centrally held cost
+ unallocated effective cost

allocated showback total
= sum of every team's direct and shared allocation
```

The labels in these equations should match the semantics of the provider data. For example, do not add tax again if it is already represented as a detailed cost row.

## Give special charges an explicit policy

The most common reconciliation failures are not missing arithmetic. They are undocumented decisions.

### Commitments and discounts

An upfront reservation or savings commitment may appear as a billed purchase in one period while its benefit applies across later usage. Keep that purchase in the invoice view. In the ownership view, use effective or amortized cost to associate the commitment with covered usage and show any unused commitment separately. Never add the billed purchase to the amortized usage in the same ownership total.

### Credits and refunds

First classify each credit. A resource-specific service credit can follow the affected owner. A negotiated account-level credit may be spread proportionally, assigned to a central budget, or reported separately. A refund correcting an earlier period should retain its correction relationship where the source exposes it. Whatever the choice, the allocated credit plus any centrally retained portion must equal the credit in scope.

### Taxes and support

Tax can be kept only in the finance view, allocated by taxable billed cost, or handled using a finance-approved rule. Support can be central, proportional to eligible spend, or based on a provider-specific calculation. These are allocation policies, not resource usage facts. Present them as separate lines rather than blending them into compute rates.

### Marketplace charges

Marketplace invoices may involve a publisher, provider, and invoice issuer that are not the same entity. Preserve those identities. Allocate a dedicated purchase directly when ownership is known; otherwise keep it in a visible shared or unallocated pool until an owner is established.

## Reconcile before and after allocation

Run controls in a fixed order:

1. Confirm all expected accounts, invoices, currencies, and export partitions arrived.
2. Reconcile raw billed data to each issued invoice.
3. Explain invoice-only and timing differences in a named bridge table.
4. Transform billed cost into the approved effective-cost view without losing either measure.
5. Apply versioned allocation rules to direct and shared pools.
6. Confirm every allocated, central, and unallocated amount sums back to its source pool.
7. Publish both the invoice reconciliation status and allocation coverage with the showback.

Use stable rule IDs and an allocation-run ID on every derived row. A team should be able to follow one showback amount through the allocation rule to source billing rows. Finance should be able to rebuild the invoice total without reversing team-level transformations.

## Handle open and closed periods differently

Current-period cost is provisional. Providers can add late usage, rerate records, issue corrections, or finalize invoice-level charges after the usage occurred. Mark an open-period showback as estimated and allow it to refresh.

When the invoice is issued, create a closed version. If later data changes a closed period, do not overwrite the prior report invisibly. Publish a correction with the affected invoice, allocation policy version, old amount, new amount, and reason. This gives engineering timely information without weakening the financial audit trail.

## What a trustworthy report shows

The report footer should state:

- billing period and data cutoff
- whether the period is estimated or invoice-final
- invoice control total and reconciliation status
- cost basis used for team totals
- treatment of credits, tax, support, and commitments
- total direct, shared, central, and unallocated cost
- allocation policy and run versions

A difference is acceptable when it is named, measured, and governed. An unexplained difference is not. By retaining billed cost, effective cost, and allocation policy as separate layers, showback can be both operationally fair and financially reconcilable.

## Official documentation

- [FOCUS specification v1.4](https://focus.finops.org/focus-specification/v1-4/)
- [AWS: Knowing the differences between Billing and Cost Explorer data](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/differences-billing-data-cost-explorer-data.html)
- [AWS: Understanding your bill](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/getting-viewing-bill.html)
- [Azure: Understand Cost Management data](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data)
- [Azure: Customize views in Cost Analysis](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/customize-cost-analysis-views)
- [Google Cloud: View charges on invoices](https://cloud.google.com/billing/docs/how-to/reports/charges-on-invoices)
- [Google Cloud: Billing export example queries](https://cloud.google.com/billing/docs/how-to/bq-examples)
