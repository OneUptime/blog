# Allocate Untaggable Cloud Cost with an Association Table

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Showback, FinOps, Cost Allocation, Cloud Tags, Data Governance, AWS CUR

Description: Allocate untaggable or resource-less cloud charges through a governed, effective-dated association table instead of fabricating resource tags.

---

Some cloud charges cannot carry a useful resource tag. Data transfer, support, tax, commitment fees, API requests, and shared subscriptions may have a blank resource ID or exist above resource grain. Assigning a made-up tag value makes the report look complete while destroying provenance.

Use a controlled association table. It can map an authoritative combination of account, service, usage type, Region, billing entity, or another observed dimension to an internal owner without pretending the provider emitted that owner.

## Distinguish Three Facts

Keep these separate:

1. **Provider fact:** fields and tags actually present on the billing row.
2. **Association evidence:** an approved rule or catalog record linking that billing scope to an owner.
3. **Allocation result:** the recipient selected by the rule version used for the report.

AWS documents that `lineItem/ResourceId` is optional and blank for some usage that is not associated with an instantiated host, including some transfer and API-request usage, as well as charge types such as discounts, credits, and tax. No pipeline can recover a resource tag that never applied to the billed object.

Account cost allocation tags can now help allocate account-wide and otherwise untaggable cost in an AWS Organization. They remain account-grain metadata. If several products share one account, an account tag alone does not identify the consumer.

## Design the Association Table

A useful schema is:

```text
rule_id
rule_version
cloud_provider
account_id
service_code
usage_type
operation
region
billing_entity
charge_type
owner_key
effective_from
effective_to
priority
specificity
status
approved_by
approved_at
evidence_reference
reason
```

Use `NULL` in a match dimension to mean any value and calculate `specificity` from the number of constrained dimensions. Never use an empty string for both any value and a real provider blank.

Examples:

- all Route 53 hosted-zone charges in account A belong to `network-platform`;
- a named Marketplace product in account B belongs to `security`;
- transfer usage for a dedicated account and Region belongs to `analytics`;
- tax remains with `central-tax` regardless of service.

The examples are internal policies. AWS does not guarantee those owners.

## Set a Clear Precedence

A common precedence is:

1. valid native resource cost allocation tag;
2. exact historical resource association;
3. approved account tag where account ownership is sufficient;
4. controlled account-plus-service association;
5. controlled broader association;
6. central or unresolved residual.

Do not let a broad `account_id = A` rule override a specific, valid resource tag. Encode precedence as data, test it, and show the winning `rule_id` and `rule_version` on every allocated row.

AWS Cost Categories also evaluate grouping rules in order and use the first matching rule. If Cost Categories are part of the source, preserve their values and effective behavior rather than reproducing them approximately in an undocumented SQL branch.

## Use Effective Time, Not Current Ownership

An association is valid only for a bounded interval:

```text
usage_start >= effective_from
AND usage_start < effective_to
```

Use an exclusive `effective_to` to avoid overlaps at midnight. Open-ended rules can use a sentinel date in the physical table, but expose a proper temporal type in the model.

If ownership changes on July 15, July 1–14 and July 15 onward need different rule intervals. Updating one row in place would make a rerun of early July use the wrong owner.

When one source charge spans an ownership boundary, split it using a finer source interval or a documented time-overlap rule before matching. Testing only the usage start is safe only when each row lies wholly within one rule interval.

Separate:

- **business effective time:** when the ownership was true;
- **system recorded time:** when the data team learned or approved it.

That bitemporal distinction supports corrections without hiding late changes.

## Match Without Creating Fan-Out

First create a globally unique source-row key. In CUR 2.0, `identity_line_item_id` is unique only within a partition and is not guaranteed unique across an entire delivery or stable across reports. Combine it with the export identity, partition identity, and an immutable ingestion snapshot of the delivery.

Then rank candidate association rules:

```sql
WITH candidates AS (
    SELECT
        c.source_row_key,
        a.rule_id,
        a.rule_version,
        a.owner_key,
        a.priority,
        a.specificity,
        DENSE_RANK() OVER (
            PARTITION BY c.source_row_key
            ORDER BY a.priority ASC, a.specificity DESC
        ) AS precedence_rank
    FROM canonical_cost c
    JOIN cost_association a
      ON a.status = 'approved'
     AND c.cloud_provider = a.cloud_provider
     AND c.usage_start >= a.effective_from
     AND c.usage_start <  a.effective_to
     AND (a.account_id     IS NULL OR c.account_id     = a.account_id)
     AND (a.service_code   IS NULL OR c.service_code   = a.service_code)
     AND (a.usage_type     IS NULL OR c.usage_type     = a.usage_type)
     AND (a.operation      IS NULL OR c.operation      = a.operation)
     AND (a.region         IS NULL OR c.region         = a.region)
     AND (a.billing_entity IS NULL OR c.billing_entity = a.billing_entity)
     AND (a.charge_type    IS NULL OR c.charge_type    = a.charge_type)
), top_candidates AS (
    SELECT *
    FROM candidates
    WHERE precedence_rank = 1
)
SELECT
    c.source_row_key,
    COUNT(t.rule_id) AS winning_rule_count,
    MIN(t.rule_id) AS candidate_rule_id,
    MIN(t.rule_version) AS candidate_rule_version,
    MIN(t.owner_key) AS candidate_owner
FROM canonical_cost c
LEFT JOIN top_candidates t
  ON c.source_row_key = t.source_row_key
GROUP BY c.source_row_key;
```

Only `winning_rule_count = 1` is safe to apply. More than one top-precedence rule is ambiguous even if both happen to name the same owner. Zero candidates is unmatched. Route both states to controls rather than using `MIN` as an allocation decision.

## Support Split Associations Explicitly

Some shared services require multiple recipients. Do not create several ordinary owner rows and let a join multiply cost. Use a separate split table:

```text
rule_id
recipient_key
weight
driver_snapshot_id
```

Validate:

```text
sum(weight by rule_id) = 1
```

Fixed weights need an approval period. Dynamic weights need an immutable driver snapshot, such as tenant request counts for the same month. Keep central and unresolved recipients as real values so every source amount reconciles.

## Govern the Table Like Financial Logic

Require:

- stable owner IDs from an authoritative registry;
- review and approval before a rule becomes active;
- no overlapping effective ranges for the same match scope and precedence;
- evidence and a human-readable reason;
- peer review for broad wildcards;
- expiry dates for temporary exceptions;
- immutable historical versions;
- tests against representative billing rows;
- a report of amount and row count matched by each rule.

A rule that suddenly matches ten times more cost should alert even when the SQL is valid.

## Do Not Invent Tags

Expose allocation results as fields such as:

```text
allocated_owner
allocation_source = association_table
allocation_rule_id
allocation_rule_version
allocation_confidence
```

Do not write them into the CUR 2.0 `tags` map under a key such as `resourceTags/Owner`. In CUR 2.0, tag prefixes distinguish resource, account, user-attribute, IAM-principal, and cost-category sources. Preserve that distinction so auditors and engineers know what came from AWS and what came from company policy.

## Validate Coverage

- Native tags, account tags, associations, central, and unresolved totals are reported separately.
- Every source row receives zero or one winning direct rule.
- Split rule weights sum to one.
- Effective intervals do not overlap.
- Source-row identity includes partition and export snapshot.
- No association result overwrites raw provider tags.
- Rules match only the intended service and charge types.
- Allocated plus central plus unresolved cost equals the selected control total.

Coverage is not the percentage of rows with a nonblank owner. Report cost coverage and the evidence source behind it.

## Official Documentation

- [AWS Data Exports: Resource ID behavior in line item details](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Data Exports: CUR 2.0 identity column uniqueness](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-identity.html)
- [AWS Data Exports: CUR 2.0 tag prefixes and sources](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-tag-columns.html)
- [AWS Billing: Account tags for untaggable and account-wide cost](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/account-tags-cost-allocation.html)
- [AWS Billing: Activating user-defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html)
- [AWS Billing: Cost Category rule dimensions and evaluation order](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/create-cost-categories.html)

## Conclusion

Untagged and untaggable costs need evidence, not fictional metadata. Match provider billing dimensions to an approved, effective-dated association table; reject ambiguous winners; and preserve the rule and source on every result. This produces high allocation coverage without confusing an internal ownership decision with an AWS resource tag.
