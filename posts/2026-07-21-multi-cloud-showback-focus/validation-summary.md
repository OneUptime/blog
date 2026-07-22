# Validation Summary: Multi-Cloud Showback: Normalizing AWS, Azure, and GCP Costs with FOCUS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- FinOps Open Cost and Usage Specification (FOCUS) 1.2 and 1.4
- AWS Data Exports and the `FOCUS_1_2_AWS` table
- Microsoft Azure Cost Management FOCUS exports
- Google Cloud Billing FOCUS export to BigQuery
- SQL-based showback, cost allocation, and currency normalization

## Sources Consulted
- FOCUS specification v1.2 — https://focus.finops.org/focus-specification/v1-2/
- FOCUS specification v1.4 — https://focus.finops.org/focus-specification/v1-4/
- FOCUS provider dataset directory — https://focus.finops.org/get-started/
- AWS FOCUS 1.2 with AWS columns — https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-focus-1-2-aws.html
- AWS FOCUS 1.2 column dictionary — https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-focus-1-2-aws-columns.html
- AWS FOCUS 1.2 conformance gaps — https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-focus-1-2-aws-conformance.html
- Microsoft FOCUS cost and usage details schema — https://learn.microsoft.com/en-us/azure/cost-management-billing/dataset-schema/cost-usage-details-focus
- Microsoft Cost Management exports — https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-improved-exports
- Microsoft guidance for validating FOCUS data — https://learn.microsoft.com/en-us/cloud-computing/finops/focus/validate
- Google Cloud Billing export to BigQuery — https://cloud.google.com/billing/docs/how-to/export-data-bigquery
- Google Cloud FOCUS export schema and conformance gaps — https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/focus-export
- FinOps Foundation Allocation capability — https://www.finops.org/framework/capabilities/allocation/

## Issues Found
- **Provider support was presented too close to full schema conformance.** The three providers are listed as supporting FOCUS 1.2, but their exports can have documented conformance gaps. The Google Cloud preview export currently omits multiple common columns and allowed values, while AWS also documents cases where required values can be missing. Updated the schema and provider-status guidance to require conformance reports and delivered schema metadata as part of each ingestion contract.
- **Cross-provider service analysis assumed category fields were available from every export.** Google Cloud currently does not provide `ServiceCategory`, `ServiceSubcategory`, or `SkuMeter`. Qualified the category guidance and required any derived categories to retain mapping provenance instead of being represented as provider-delivered values.
- **Commitment and credit handling overstated the common fields available from Google Cloud.** Google Cloud currently omits the FOCUS commitment discount columns and the `Credit` value for `ChargeCategory`, exposing related data through extensions such as `x_Credits` and `x_SubscriptionInstanceId`. Added the provider-specific fallback and preservation requirements.
- **Allocation guidance relied only on the common `Tags` field.** Google Cloud currently exposes tags and labels in provider extension fields instead of `Tags`. Updated the allocation key and fallback order to include retained provider-specific tag and label fields.
- **Invoice reconciliation required dimensions that are unavailable in the Google Cloud export.** Updated the validation sequence so `InvoiceIssuerName` and `InvoiceId` are used only where populated and native invoice metadata is used for provider gaps.
- **`ContractedCost` wording was imprecise.** Aligned it with FOCUS 1.2: contracted pricing includes negotiated discounts when present but excludes negotiated commitment discounts and other discounts.
- **The SQL example used generic named placeholders without identifying them as pseudocode.** Clarified that readers must substitute their query engine's parameter syntax. The aggregation remains correct because provider, currency, and service category are all grouped, and billed and effective cost remain separate measures.

## Review Notes
- FOCUS 1.4 is the current published specification as of the validation date, while the FOCUS provider directory lists AWS, Microsoft Azure, and Google Cloud at version 1.2.
- AWS documents the table name `FOCUS_1_2_AWS` and the extension columns `x_Discounts`, `x_Operation`, and `x_ServiceCode`.
- Azure's documented schema is `1.2-preview`; Cost Management documents the supported agreement types and explicitly excludes MOSP billing scopes and subscriptions from FOCUS exports.
- Google Cloud's dedicated FOCUS usage cost export remains Preview and uses a Google-managed immutable BigQuery dataset. Its documented conformance gaps are significant enough that native fields and provider extensions must remain part of validation and drill-down.
