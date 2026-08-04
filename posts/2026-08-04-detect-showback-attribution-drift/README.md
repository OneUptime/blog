# Detect Showback Drift Between Service Catalogs and Cloud Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Showback, FinOps, AWS, Service Catalog, Cloud Tags, Data Governance, Cost Allocation

Description: Compare effective-dated catalog ownership, live resource tags, and billing-time tags so attribution conflicts become controlled drift instead of silent cost moves.

---

An internal service catalog can say that `checkout-api` belongs to Commerce while its EC2, RDS, and load balancer tags say Payments. A showback pipeline that trusts one source silently may be consistent and still wrong.

Treat the disagreement as attribution drift. Preserve both claims, measure the affected cost, apply a documented precedence for reporting, and send the conflict through an ownership workflow.

## Define What Each Source Proves

The sources do not have identical semantics:

- **Internal service catalog:** usually expresses intended application or service ownership.
- **Cloud resource tag:** expresses metadata attached to one resource at a point in time.
- **Billing cost allocation tag:** expresses an activated tag value that applies to a billing line under provider timing rules.
- **Account tag:** expresses organization metadata inherited at account grain.
- **Cost Category:** expresses the result of ordered AWS billing rules.
- **AWS Config or inventory history:** can preserve supported resource configuration changes and deletion history.

None is automatically the universal source of truth. A catalog may be stale after a reorganization. A tag may be copied incorrectly. A billing tag may lag activation or be absent for an untaggable charge.

Write an authority matrix by dimension:

| Dimension | Example authority | Conflict behavior |
| --- | --- | --- |
| Accountable owner | Service catalog | report with catalog owner, open drift |
| Cost center | Finance registry | block invalid value |
| Environment | Provisioning metadata | quarantine conflict |
| Technical contact | Resource tag | warn if absent |
| Billing category | Approved allocation policy | retain source and rule ID |

This matrix is organizational policy, not an AWS guarantee.

## Use Stable IDs and Effective Dates

Names change. Store stable identifiers:

```text
service_id
owner_id
resource_key
effective_from
effective_to
recorded_at
source_system
```

Normalize aliases such as `payments-platform`, `Payments Platform`, and a Slack handle to one `owner_id`. Do not normalize two genuinely different teams merely because their names are similar.

Take ownership and tag snapshots over time. Comparing today's catalog and tags to a July billing line can create false drift after an August transfer.

For each cost interval, join evidence with:

```text
cost_time >= effective_from
AND cost_time < effective_to
```

Keep `recorded_at` separately so a late correction is visible.

## Create Explicit Drift States

Assign each resource-period one state:

- `aligned`: valid catalog and tag owners agree;
- `catalog_only`: no usable resource tag;
- `tag_only`: no catalog resource association;
- `owner_conflict`: both exist and disagree;
- `invalid_tag_value`: tag does not resolve to an approved owner;
- `multiple_catalog_services`: resource maps to more than one service;
- `historical_evidence_missing`: current state exists but billing-time state does not;
- `not_taggable`: provider row cannot carry resource ownership;
- `deleted_resource_unresolved`: billed ID outlived available inventory.

Do not collapse all of these into `untagged`. Each has a different remediation owner.

## Measure Drift by Cost, Not Just Resource Count

One untagged NAT gateway can matter more than thousands of tagged development objects. For every state report:

- resource count;
- billing row count;
- selected economic cost;
- first and last observed times;
- services, accounts, and Regions affected;
- age of the conflict;
- report recipient used under precedence;
- remediation owner and due date.

A useful service-level control is:

```text
drift_cost_rate
  = cost_in_conflict_states / attributable_service_cost
```

Keep the denominator definition stable and exclude genuinely untaggable central charges only when the policy says so.

## Compare Billing-Time and Live Tags Carefully

AWS requires user-defined tag keys to be activated before they appear in cost allocation data, with documented activation delay. CUR 2.0 distinguishes `resourceTags/`, `accountTag/`, `costCategory/`, and other tag sources in its tags map.

Live tagging APIs answer current-state questions. They do not by themselves prove the tag that applied when July usage occurred. AWS Config can record supported resource creation, changes, and deletion, while CUR provides the billing-time value that AWS emitted.

AWS supports cost allocation tag backfill for up to 12 months, but only where the resource tag was historically assigned. Backfill cannot invent a tag that was absent on the resource.

Record:

```text
observed_resource_tag
billing_tag
catalog_owner
tag_activation_state
evidence_timestamp
```

This distinguishes a real ownership conflict from a reporting-activation gap.

## Detect Drift Before Cost Arrives

Run two complementary controls:

1. **Inventory drift:** compare service catalog associations and resource tags daily for fast remediation.
2. **Billing drift:** compare catalog ownership with tags and categories on each CUR refresh to measure financial impact.

Inventory drift is earlier but can miss deleted resources and untaggable charges. Billing drift is financially authoritative for what appeared in the report but arrives later.

Apply grace periods only where propagation delay is expected. A newly created resource might receive tags through automation within minutes; a long-lived resource whose owner differs for weeks is not propagation noise.

## Do Not Auto-Heal Without Proven Authority

An automatic job that overwrites the cloud tag from the catalog can propagate a stale catalog value. One that rewrites the catalog from tags can let any resource operator change financial ownership.

Use this workflow:

1. detect and retain both claims;
2. determine which source is authoritative for that dimension;
3. identify the change event and effective date;
4. obtain approval from the proper owner or finance steward;
5. update the incorrect source prospectively;
6. decide whether historical showback needs a restatement;
7. close the drift record with evidence.

For low-risk metadata with a clearly authoritative provisioning system, automated correction may be appropriate. Record the policy and the event.

## Handle Reporting While Drift Is Open

Choose one documented mode:

- report under authoritative catalog owner and mark `owner_conflict`;
- quarantine cost in `attribution-review`;
- report native billing tag and show a catalog exception;
- retain the previous approved owner during a bounded transfer window.

Never split the full amount to both claimants. If a temporary split is approved, normalize weights to one and retain the drift ticket.

Show users both `reported_owner` and `ownership_evidence`. That prevents a temporary reporting decision from being mistaken for resolution.

## Account for Cost Category Reprocessing

AWS Cost Categories apply ordered rules to billing lines. AWS documents that a change during a month applies from the start of that month, and users can choose a prior effective month for retroactive application.

That behavior is useful, but it means a current Cost Category result is not an immutable record of what a prior showback run saw. Snapshot category values and the category rule version used by each published report.

## Validation Checklist

- Every owner value resolves to a stable registry ID.
- Catalog, live-tag, billing-tag, account-tag, and category sources remain distinct.
- Joins use billing-time effective intervals.
- Cost is assigned once while a conflict is open.
- Drift cost and age are reported.
- Backfill is not treated as proof of tags that never existed.
- Deleted resources retain historical evidence.
- Category reprocessing cannot silently rewrite a published report.
- Remediation includes approver, effective date, and restatement decision.

## Official Documentation

- [AWS Billing: Activating user-defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html)
- [AWS Data Exports: CUR 2.0 tag prefixes and tag sources](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-tag-columns.html)
- [AWS Billing: Backfill cost allocation tags and historical-assignment requirement](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html)
- [AWS Billing: Cost Category effective dates and reprocessing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-cost-categories.html)
- [AWS Config: Recording created, changed, and deleted resources](https://docs.aws.amazon.com/config/latest/developerguide/select-resources.html)
- [AWS Config: Looking up discovered and deleted resources](https://docs.aws.amazon.com/config/latest/developerguide/looking-up-discovered-resources.html)
- [AWS Resource Groups Tagging API: GetResources](https://docs.aws.amazon.com/resourcegroupstagging/latest/APIReference/API_GetResources.html)

## Conclusion

Catalog ownership and cloud tags are independent claims with different timing and authority. Compare them at billing-time grain, classify the exact drift state, measure affected cost, and apply a documented temporary precedence. Resolve conflicts through evidence and effective dates instead of letting whichever source was easiest to query silently move the bill.
