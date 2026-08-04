# Allocate AWS Credits, Refunds, Support, Marketplace, and Tax

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Showback, FinOps, Credit, AWS Marketplace, AWS Support, Tax

Description: Classify AWS billing adjustments and indirect charges before assigning them with explicit, auditable showback policies.

---

Direct resource cost is only part of an AWS bill. Credits, refunds, support fees, AWS Marketplace purchases, and tax can materially change the amount owed, yet many of these rows have no useful resource ID or application tag. A single proportional spread across cloud spend is easy to implement and hard to defend.

First preserve what AWS recorded. Then choose an allocation driver that matches the reason for each charge. The AWS Cost and Usage Report provides billing facts; it does not determine internal responsibility.

## Keep Charge Classes Separate

AWS documents the relevant `lineItem/LineItemType` values:

- `Credit`: credits AWS applied to the bill;
- `Refund`: negative charges AWS refunded;
- `Tax`: taxes applied to the bill;
- `Fee`: upfront annual subscription and other fee lines, depending on the product;
- ordinary and commitment-specific types for service consumption.

Use additional fields rather than guessing from a description:

- `bill/BillingEntity` distinguishes AWS Marketplace transactions from other AWS service purchases;
- `lineItem/LegalEntity` identifies the seller of record and can differ for third-party Marketplace transactions;
- `bill/InvoiceId` is blank until the line is final;
- `lineItem/ProductCode`, `UsageType`, and `Operation` retain service context;
- `lineItem/LineItemDescription` supplies detail but should not be the only classifier;
- `lineItem/TaxType` identifies the tax type where applicable.

Store raw signed amounts. Credits and refunds are normally negative. Converting them to positive values for display and subtracting them later is a common source of double negation.

## Use a Policy Matrix

Create an approved matrix before allocating:

| Charge class | Preferred direct evidence | Defensible fallback |
| --- | --- | --- |
| Service-specific credit | account, service, credit detail, eligible recipient | central credit pool |
| Refund | original charge or affected account and service | central adjustment pool |
| AWS Support | supported account or agreed eligible-spend base | central platform |
| Marketplace usage | purchasing account, product, activated tags, metering tags | subscription owner |
| Marketplace contract | contract owner, seats, entitlement, or measured use | procurement or central SaaS |
| Tax | invoice, legal entity, account, jurisdiction, tax policy | central tax owner |

Every fallback should produce a visible reason such as `no_original_charge_link`, not a generic `unallocated` label.

## Allocate Credits Without Erasing Consumption

AWS applies eligible credits according to credit scope and sharing preferences. The resulting CUR row tells you where AWS applied a credit, which may not be the team that obtained, funded, or was promised it.

Choose among three policies:

1. **Follow application:** assign the credit to the account and service on the billing row.
2. **Follow sponsorship:** assign a promotional or migration credit to the approved program owner.
3. **Centralize:** keep company-level credits in a central pool.

Preserve gross service cost and credit separately:

```text
net_reported_cost = gross_allocated_cost + signed_credit
```

Do not lower historical unit quantities or rewrite a service's effective rate to hide the credit. A temporary credit is not evidence that the service became permanently cheaper.

## Link Refunds to the Original Cost When Possible

A refund is a negative charge, and AWS may update a report after finalization to add it. If the refund detail, account, service, invoice, or support case reliably identifies an original charge, send it to the same owner and preserve an `original_period` reference.

If no reliable link exists, centralize the refund until reviewed. Spreading it across current-month consumers can reward teams that did not incur the original cost and changes current unit economics for an event from another period.

Publish refunds as adjustments or restatements according to the close policy. Do not silently overwrite an already approved prior-month showback.

## Allocate Support by Benefit or Keep It Central

AWS Support is a shared service. AWS notes that support fees can be added to a prior month's CUR after usage charges are finalized. The amount and timing come from AWS; an internal allocation driver does not.

Common policies are:

- central platform or operations budget;
- account-level assignment when accounts independently select and benefit from plans;
- proportional allocation using the exact eligible spend base approved by finance;
- a hybrid with a central minimum and variable usage-related share.

If using spend, define which cost basis and charge classes are eligible. A driver of `all cloud cost` can recursively include support, tax, and Marketplace charges and distort the denominator. Snapshot the denominator before calculating support allocation.

Support-case count is usually a poor cost driver: plans provide organizational coverage and preventative guidance even to teams that open no cases. Use it only if the program intentionally treats cases as the benefit measure.

## Separate Marketplace Usage from Contracts

AWS Marketplace supports cost allocation tags for eligible software products. AMI software charges can inherit tags from the associated EC2 instance, and vendors may provide metering tags for some AMI, container, and SaaS products. AWS warns that tags track costs from activation onward, subject to available backfill behavior.

Marketplace does not have one universal driver:

- usage-metered software can follow the metered account, resource, or vendor tag;
- a per-seat SaaS contract should follow an entitlement or active-seat ledger;
- an upfront enterprise contract may belong to procurement and be amortized internally;
- a shared security or observability product may follow protected assets, telemetry volume, or central ownership.

Do not allocate an upfront contract by the account where the purchase line landed merely because no resource ID exists. That account is a billing location, not necessarily the beneficiary.

## Treat Tax as a Legal and Finance Policy

Tax can depend on the invoicing entity, seller of record, account tax settings, product, and jurisdiction. Product teams should not invent a tax allocation rule.

Finance should define whether tax:

- follows the invoice unit or legal entity;
- follows pre-tax attributable charges within the same tax scope;
- remains in a corporate tax center;
- is excluded from engineering showback but included in finance reporting.

Never spread one tax total across charges from a different seller or legal scope without approval. Preserve `TaxType`, legal entity, invoice ID, currency, and original signed value.

## Implement a Two-Stage Pipeline

Stage one classifies billing facts:

```text
billing_classification
  = line_item_type
  + billing_entity
  + legal_entity
  + product_code
  + invoice_id
```

Stage two applies policy:

```text
allocation_result
  = classified_amount
  + driver_snapshot
  + policy_version
  + recipient
  + explanation
```

Do not combine the stages into one giant product-description `CASE`. New Marketplace products, support adjustments, or contract changes should fail into a controlled exception queue rather than inherit an unrelated rule.

## Reconcile Every Class

For each billing period, prove:

```text
raw_class_total
  = directly_allocated
  + policy_distributed
  + central
  + unresolved
```

Also test that allocation weights sum to one per source charge, signed credits and refunds retain their sign, and one row cannot be assigned both directly and through a shared pool. Keep a separate invoice bridge because amortized commitment cost and purchase-time cash can have different timing.

## Official Documentation

- [AWS Data Exports: Line item types, credits, refunds, fees, and tax](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Data Exports: CUR 2.0 bill columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-bill.html)
- [AWS Data Exports: Finalized reports and late support adjustments](https://docs.aws.amazon.com/cur/latest/userguide/view-finalized-cur.html)
- [AWS Billing: Applying AWS credits](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/useconsolidatedbilling-credits.html)
- [AWS Billing: Differences in credits, refunds, and taxes across billing views](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/differences-billing-data-cost-explorer-data.html)
- [AWS Marketplace: Using cost allocation tagging](https://docs.aws.amazon.com/marketplace/latest/buyerguide/cost-allocation-tagging.html)
- [AWS Support: AWS Support plans](https://docs.aws.amazon.com/awssupport/latest/user/aws-support-plans.html)

## Conclusion

Credits, refunds, support, Marketplace, and tax should not share one allocation rule. Classify each from authoritative billing fields, preserve its signed amount and scope, then apply a documented benefit, ownership, or legal driver. Anything that cannot be supported belongs in a visible central or unresolved bucket, not an invented resource tag.
