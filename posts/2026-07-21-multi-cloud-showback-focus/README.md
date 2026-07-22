# Multi-Cloud Showback: Normalizing AWS, Azure, and GCP Costs with FOCUS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, FOCUS, Multi-Cloud, Showback

Description: Normalize AWS, Azure, and Google Cloud billing data with FOCUS while preserving invoice controls, provider detail, and allocation policy.

---

Multi-cloud showback becomes difficult when every provider uses different names for accounts, services, discounts, commitments, and cost measures. FOCUS, the FinOps Open Cost and Usage Specification, provides a common schema and common semantics for that billing data. It removes a large amount of translation work, but it does not remove the need for provider controls or business allocation rules.

The strongest design uses FOCUS as the normalized cost fact, retains each native export as evidence, and adds business ownership in a separate enrichment layer.

## What FOCUS normalizes

FOCUS 1.2 defines common fields that are otherwise easy to confuse across providers. Provider exports can still have documented conformance gaps, so support must be checked for each source:

- `ProviderName`, `PublisherName`, and `InvoiceIssuerName`
- `BillingAccountId` and `SubAccountId`
- `BillingPeriodStart` and `BillingPeriodEnd`
- `ChargePeriodStart` and `ChargePeriodEnd`
- `ServiceName`, `ServiceCategory`, and `ServiceSubcategory`
- `ResourceId`, `ResourceName`, and `ResourceType`
- `ChargeCategory`, `ChargeClass`, and `ChargeFrequency`
- `BillingCurrency`, pricing fields, and cost fields
- commitment discount identity, category, status, and type
- `Tags` and SKU details

The distinctions matter. A provider can make a service available, a marketplace publisher can produce it, and another entity can issue the invoice. A billing period identifies the invoice window, while a charge period identifies when an individual charge occurred. Normalization should preserve those meanings rather than collapsing them into generic `vendor` and `date` columns.

## Choose one supported schema version

Pin the FOCUS version in your data contract. FOCUS 1.4 is the current published specification, but the official FOCUS dataset directory currently lists AWS, Microsoft, and Google Cloud exports at version 1.2. A pipeline based on those native exports should conform to 1.2 until each source offers an intentional upgrade. Do not mix 1.4-only fields into a 1.2 union.

The providers expose FOCUS 1.2 in different product states and delivery systems:

| Provider | Official export | Important qualification |
| --- | --- | --- |
| AWS | Data Exports table named `FOCUS_1_2_AWS` | Includes AWS extension columns such as `x_Discounts`, `x_Operation`, and `x_ServiceCode` |
| Azure | Cost and usage details (FOCUS) export | The documented 1.2 schema is marked preview and applies to supported agreement types |
| Google Cloud | FOCUS usage cost export to BigQuery | The export is marked Preview, is stored as an immutable BigQuery dataset, and has documented gaps for several FOCUS columns and values |

Preview status, agreement coverage, conformance gaps, and field population can change. For example, the current Google Cloud export does not provide `InvoiceId`, `InvoiceIssuerName`, `ServiceCategory`, `ServiceSubcategory`, `Tags`, or the commitment discount columns, and AWS publishes cases where required values can be missing. Treat provider documentation, published conformance reports, and delivered schema metadata as part of each ingestion contract. Do not assume that declaring support for a FOCUS version means an export fully conforms to every requirement or populates every conditional or recommended column.

## Keep four data layers

A maintainable pipeline separates concerns:

1. **Native raw:** Immutable AWS, Azure, and Google Cloud source exports, manifests, and delivery metadata.
2. **FOCUS conformed:** Provider records mapped to the pinned FOCUS version, including provider extension columns.
3. **Business enriched:** Stable application, team, product, customer, cost center, and environment identifiers.
4. **Allocated:** Direct and shared costs produced by a versioned allocation policy.

Do not overwrite `Tags` or retained provider tag and label extensions to fix ownership. These fields are provider observations and can be missing, late, or historically inconsistent. The current Google Cloud export, for example, exposes labels and tags in extension fields instead of the common `Tags` column. Add derived ownership columns with their source and effective dates. This preserves the ability to explain what the provider delivered and what the organization inferred.

## Select the right cost column

FOCUS provides several cost perspectives:

- `ListCost` is based on provider-published list pricing.
- `ContractedCost` reflects contracted unit pricing, including negotiated discounts when present but excluding negotiated commitment discounts or any other discounts.
- `BilledCost` is the charge serving as the basis for invoicing and excludes amortization of upfront charges.
- `EffectiveCost` includes reduced rates, discounts, and the applicable portion of prepaid purchases covering the charge.

Use `BilledCost` to reconcile provider invoices. Use `EffectiveCost` when the showback goal is to associate commitment economics with the usage that benefited. Keep both in the fact table, and never sum them together.

List and contracted costs are useful comparison measures, not amounts owed. A savings chart may compare them with billed or effective cost, but its definition must state which discounts and commitment effects it is intended to show.

## Do not sum unlike currencies

`BillingCurrency` identifies the currency of cost fields used for billing. Multi-cloud data can contain more than one billing currency. A global total is invalid until amounts share a reporting currency.

FOCUS does not choose your corporate foreign-exchange policy. Add a separate conversion table containing the source currency, reporting currency, rate, rate date, rate source, and finance-approved policy. Preserve the original amount and currency beside the converted amount. Reconcile invoices in their original billing currencies before conversion.

## Build a portable allocation key

Provider account structures do not mean the same thing:

- an AWS member account can appear as a FOCUS subaccount
- an Azure subscription can appear as a subaccount within the applicable billing account
- a Google Cloud project can be represented at the subaccount level

These are useful allocation signals, but they are not automatically teams or products. Create a governed mapping such as:

```text
(ProviderName, BillingAccountId, SubAccountId, ResourceId,
 Tags, provider_tag_fields, effective_time)
    -> application_id
    -> team_id
    -> product_id
    -> cost_center_id
```

Apply the most specific valid mapping first, then fall back through resource, common or provider-specific tag fields, subaccount, and billing-account rules. Record an explicit `unallocated` result rather than inserting a guessed owner.

## Normalize services without erasing detail

`ServiceCategory` and `ServiceSubcategory`, when populated, support cross-provider analysis at a common functional level. `ServiceName`, `SkuId`, `SkuMeter` when available, and provider extension columns retain operational detail. The current Google Cloud preview export does not provide either category column or `SkuMeter`; if you derive them from service, SKU, or extension fields, record the mapping and provenance rather than presenting them as provider-delivered values.

Use the category fields for questions such as total multi-cloud compute or database cost. Use provider fields for optimization work, because an AWS operation, Azure meter, and Google Cloud SKU are not interchangeable merely because they share a category. Maintain both views in the same record.

The same rule applies to regions. `RegionId` and `RegionName` are provider-assigned. Do not infer that similarly named regions provide identical geography, price, availability, or service capability. If the business needs broader geography, add a governed region group as enrichment.

## Treat commitments and credits as charge data

Commitment discounts differ among AWS, Azure, and Google Cloud, but FOCUS defines common columns for their identity, type, category, and status. Use those fields where the provider populates them to distinguish covered usage, purchases, and unused commitment amounts. The current Google Cloud preview export does not provide the FOCUS commitment discount columns and instead retains related information in extensions such as `x_Credits` and `x_SubscriptionInstanceId`, so preserve those extensions and the native export.

Credits also need classification. `ChargeCategory` and `ChargeClass` can help identify credits and corrections, but allocation remains a policy choice. The current Google Cloud export does not support the `Credit` value in `ChargeCategory` and exposes credit detail in `x_Credits`. A resource-specific credit may follow its resource owner; an account-level commercial credit may remain central or be spread by an approved rule. Keep that policy outside provider normalization.

## Validate each provider before combining them

Run validation in this order:

1. Verify expected files, partitions, manifests, accounts, and periods arrived.
2. Validate types, required fields, allowed values, and exclusive period-end logic against the pinned FOCUS version and each provider's published conformance gaps.
3. Reconcile `BilledCost` by provider, billing account, billing period, and currency, adding invoice issuer and invoice ID where populated. Use native invoice metadata when those common fields are unavailable.
4. Reconcile `EffectiveCost` to each provider's native amortized or commitment-aware view where available.
5. Confirm business enrichment does not change source cost totals.
6. Confirm direct, shared, central, and unallocated outputs conserve the input allocation pool.
7. Only then aggregate providers into a multi-cloud report.

A compact conformed query might start like this. The named placeholders are client-side pseudocode; use the parameter syntax supported by your query engine.

```sql
SELECT
  ProviderName,
  BillingCurrency,
  ServiceCategory,
  SUM(BilledCost) AS billed_cost,
  SUM(EffectiveCost) AS effective_cost
FROM focus_cost
WHERE BillingPeriodStart = :period_start
  AND BillingPeriodEnd = :period_end
GROUP BY ProviderName, BillingCurrency, ServiceCategory;
```

Keep currency in the grouping unless a controlled conversion has already produced a separate reporting-currency measure.

## Design the showback contract

Every report should publish its FOCUS version, provider export versions, refresh cutoff, currency policy, cost basis, allocation rule version, and treatment of credits, tax, support, marketplace purchases, and shared costs. Provider-specific fields should remain available for drill-down even when the summary uses only common columns.

FOCUS gives AWS, Azure, and Google Cloud costs a shared language. The organization still owns the definitions of application, product, customer, fairness, and accountability. Keeping conformance separate from enrichment makes both parts easier to validate and change.

## Official documentation

- [FOCUS specification v1.4](https://focus.finops.org/focus-specification/v1-4/)
- [FOCUS: Available provider datasets and versions](https://focus.finops.org/get-started/)
- [AWS: FOCUS 1.2 with AWS columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-focus-1-2-aws.html)
- [AWS: FOCUS 1.2 column dictionary](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-focus-1-2-aws-columns.html)
- [Azure: FOCUS cost and usage details schema](https://learn.microsoft.com/en-us/azure/cost-management-billing/dataset-schema/cost-usage-details-focus)
- [Azure: Create and manage Cost Management exports](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-improved-exports)
- [Google Cloud: Export Cloud Billing data to BigQuery](https://cloud.google.com/billing/docs/how-to/export-data-bigquery)
- [FinOps Foundation: Allocation](https://www.finops.org/framework/capabilities/allocation/)
