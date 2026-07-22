# How to Build a Cloud Showback Model Without Perfect Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cloud Cost Management, Showback, Cost Allocation, Cloud Tags

Description: Build a credible cloud showback model by combining account structure, billing metadata, inference, and an explicit unallocated-cost process.

---

Waiting for perfect tags is a reliable way to postpone cloud cost accountability forever. Tags are useful, but real cloud estates include services that cannot be tagged, old resources with inconsistent keys, shared infrastructure, and charges that arrive without a resource identifier. A useful showback model has to work with that reality.

The goal is not to make every billing row look certain. The goal is to assign costs using repeatable evidence, expose uncertainty, and improve the evidence over time. The FinOps Foundation describes allocation as a combination of account structures, tags, labels, naming standards, derived metadata, and shared-cost rules. That gives teams more options than a single tag column.

## Start With the Reporting Contract

Define the report before writing allocation logic. Each team should be able to see:

- direct costs clearly attributable to it;
- shared costs added through a published rule;
- commitment discounts and amortized purchase costs;
- estimated allocations, with their evidence and confidence;
- costs still unallocated; and
- corrections made after a prior reporting period.

Choose one cost basis as well. For operating showback, an amortized metric is usually more useful than invoice cash flow. In FOCUS, `EffectiveCost` represents cost after reduced rates, discounts, and the applicable amortized portion of relevant purchases. `BilledCost` serves a different purpose: it represents the amount used for invoice reconciliation. Keep both, but do not silently switch between them.

The total must reconcile:

`direct + derived + estimated + shared + unallocated = total showback cost`

If the report excludes tax, credits, or marketplace charges, state that scope and reconcile to the same scoped total.

## Build an Allocation Ladder

Apply evidence in fixed stages, allowing more specific evidence to replace broad defaults. A practical ladder looks like this:

1. **Dedicated billing container:** map an AWS account, Azure subscription, Google Cloud project, or equivalent subaccount to its owner.
2. **Provider billing metadata:** use cost categories, resource groups, folders, account tags, subscription tags, and provider-generated dimensions.
3. **Resource metadata:** use activated cost-allocation tags, labels, resource identifiers, and stable naming conventions.
4. **Authoritative internal data:** join a resource ID to an infrastructure-as-code state, service catalog, CMDB, deployment record, or platform registry.
5. **Documented inference:** infer an owner from evidence such as a unique account and resource-name combination, then mark the result as estimated.
6. **Shared-cost rule:** allocate a known shared pool using an approved fixed, proportional, or usage-based driver.
7. **Unallocated:** retain costs that still lack defensible evidence.

This order matters. A resource-level service identifier should normally override an account default because it is more specific. A manually maintained exception may override both, but it should have an owner and expiry date. Store precedence as data rather than scattering it across dashboard formulas.

## Use Hierarchy Before Tags

Large parts of a cloud estate can often be allocated through hierarchy. If a Google Cloud project belongs to one product, an Azure subscription belongs to one cost center, or an AWS account belongs to one platform team, that mapping can assign every scoped charge, including some charges without resource tags.

Hierarchy is especially valuable for early showback because it is stable and easy to explain. Its weakness is granularity. A shared account may contain several applications, and a production subscription may serve several teams. Use the hierarchy as a default, then allow more specific evidence to replace it.

Provider tools can help. AWS Cost Categories can group costs by accounts, services, charge types, cost-allocation tags, and other dimensions. For supported billing account types (EA, MCA, and MPA with Azure plan subscriptions), Azure Cost Management can apply subscription or resource-group tags to child usage records through tag inheritance. Google Cloud billing data can be grouped by projects and resource labels. These features are not identical, so preserve provider-specific logic in the ingestion layer.

## Treat Tags as Evidence, Not Truth

A tag is only useful when its meaning is controlled. Normalize key names and values before allocation, but retain the raw value for audit. For example, `payments`, `Payments`, and `pay-ments` might map to one service ID after an approved alias lookup. Never perform fuzzy matching without recording the rule that produced the result.

Validate tag evidence against a registry of valid teams, services, environments, and cost centers. A syntactically present tag with a departed employee's email address is not high-quality allocation evidence. Stable service IDs and cost-center codes tend to age better than display names.

Also account for billing behavior. On AWS, user-defined resource tag keys must be activated as cost-allocation tags before they appear in billing data; some keys, such as `awsApplication`, are automatically activated. AWS supports cost-allocation tag backfill for up to 12 months, but historical values are available only for periods when the tag was actually assigned to the resource. In Azure, directly applied resource tags are included only while the resource emits usage with that tag; tag inheritance can update usage records for the current month, but it does not modify the resource itself. Google Cloud labels flow to billing reports and exports only for supported resources.

## Add Derived Allocation With Confidence

Derived metadata closes the gap when billing metadata is incomplete. Build a mapping table with fields such as:

| Field | Purpose |
|---|---|
| Billing row or resource ID | Identifies the charge being classified |
| Allocated service and team | Supplies the showback target |
| Evidence source | Records whether the mapping came from hierarchy, IaC, CMDB, or another source |
| Rule version | Makes the result reproducible |
| Confidence | Separates deterministic mapping from estimation |
| Effective and expiry dates | Prevents stale exceptions from living forever |

Use a small confidence vocabulary. `Direct` can mean provider metadata or dedicated billing-container ownership. `Derived` can mean a deterministic join to an authoritative internal source. `Estimated` can mean a weaker proxy that an owner must review. `Unallocated` means no approved evidence exists.

Confidence should be visible in the report. A team is much more likely to trust a showback total when it can distinguish an exact subscription mapping from an inferred resource-name match.

## Keep an Honest Unallocated Bucket

Forcing every cost onto a team produces false precision. An unallocated bucket is a control, not a failure. Break it down by provider, service, billing account, charge type, age, and materiality. Then assign investigation owners for the largest or fastest-growing items.

Do not mix unallocated costs with deliberate shared costs. A central observability service with a published allocation rule is shared. A database charge with no identifiable owner is unallocated. The remediation paths are different.

The FinOps allocation guidance recognizes that some organizations make an explicit decision to budget selected shared items centrally. Record that as an informed allocation policy. It should not be indistinguishable from missing data.

## Publish Rules Alongside Results

Every monthly report should identify the rule set and source-data version used to produce it. Give teams a short review window and a simple dispute path. Corrections should be entered as dated adjustments rather than silent history rewrites, especially if finance has already closed the period.

Track improvement with cost-weighted measures:

- percentage of effective cost allocated directly;
- percentage allocated through derived evidence;
- percentage estimated;
- percentage deliberately shared or centrally funded;
- percentage unallocated; and
- age and value of unresolved allocation exceptions.

Resource-count compliance alone can mislead. A thousand correctly tagged low-cost objects do not compensate for one large unidentified data service.

## Improve the Model in Small Loops

Start with billing-container ownership, the most reliable metadata, a small set of shared-cost rules, and an unallocated queue. Review high-value exceptions with engineering teams. When a recurring inference proves reliable, move it into a service registry or provisioning default. When a tag repeatedly causes disputes, improve the schema or stop using it for allocation.

The result is a model that is useful now and becomes more accurate through operation. Perfect tags are not the prerequisite for showback. Transparent evidence, reconciliation, and a controlled path from unknown to known are.

## Official Documentation

- [FinOps Foundation: Allocation capability](https://www.finops.org/framework/capabilities/allocation/)
- [FOCUS Specification 1.4](https://focus.finops.org/focus-specification/v1-4/)
- [AWS: Organizing costs using AWS Cost Categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-cost-categories.html)
- [AWS: Using user-defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/custom-tags.html)
- [AWS: Using account tags for cost allocation](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/account-tags-cost-allocation.html)
- [AWS: Backfill cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html)
- [Azure: Group and allocate costs using tag inheritance](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/enable-tag-inheritance)
- [Google Cloud: Labels overview](https://cloud.google.com/resource-manager/docs/labels-overview)
