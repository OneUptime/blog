# Version Showback Rules for Reproducible Monthly Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Showback, FinOps, Cost Allocation, Data Governance, Reproducibility, AWS CUR, Auditability

Description: Freeze allocation rules, ownership dimensions, rates, code, and billing snapshots so a historical showback rerun produces the same result.

---

Re-running last month's showback with today's tags, service catalog, cost categories, and allocation SQL does not reproduce last month. It creates a new report that happens to use old billing dates.

Reproducibility requires a complete calculation contract: immutable billing input, effective-dated rules, frozen business dimensions, rates, code, and rounding behavior. Versioning only the SQL file is not enough.

## Define What Same Result Means

For identical inputs and a named rule bundle, require:

- the same source rows;
- the same selected cost basis;
- the same owner and association evidence;
- the same allocation weights;
- the same output rows and amounts before presentation rounding;
- the same control totals and exception classifications.

If AWS later adds a refund or support fee, a refreshed run should change. If finance approves a corrected owner, a restatement should change. Those are different run types, not failures of deterministic processing.

## Create an Allocation Run Manifest

Persist one manifest with every run:

```json
{
  "run_id": "2026-07-close-v1",
  "billing_period": "2026-07",
  "run_type": "close",
  "billing_snapshot_id": "cur-export-snapshot-2026-08-07T04:00:00Z",
  "invoice_ids": ["example-final-invoice-id"],
  "cost_basis": "net_amortized",
  "rule_bundle": "showback-rules/4.3.1",
  "rule_bundle_sha256": "example-content-hash",
  "dimension_snapshot_id": "service-catalog-2026-08-06T23:00:00Z",
  "rate_card_version": "aws-internal-2026-q3-v2",
  "currency_policy": "usd-source-no-fx",
  "code_image_digest": "sha256:example-image-digest",
  "rounding_policy": "aggregate-then-round-2dp",
  "created_at": "2026-08-07T09:30:00Z"
}
```

Use real immutable identifiers and hashes. A branch name such as `main`, a mutable container tag such as `latest`, or a path that AWS overwrites is not a snapshot.

## Version the Rule Bundle

Store rules as reviewed data or code with:

```text
rule_id
rule_bundle_version
effective_from
effective_to
priority
match_expression
allocation_method
recipient_or_driver
fallback_recipient
approved_by
approved_at
reason
```

Use semantic versioning for communication and a content hash for identity. Two artifacts must not share a version if their bytes or dependencies differ.

An effective date answers *which cost intervals this rule governs*. The bundle version answers *which approved implementation evaluated those intervals*. Keep both.

For example, a team transfer effective July 15 should create two ownership intervals. Editing a July 1 row in place would make the original report impossible to reproduce.

## Snapshot Every Mutable Dimension

The calculation may depend on:

- service catalog ownership;
- resource-to-service associations;
- AWS Organizations account hierarchy and account tags;
- cost allocation tags and Cost Categories;
- Kubernetes namespaces, labels, and UIDs;
- network routes and IP-to-resource mapping;
- shared-cost driver quantities;
- commitment purchaser and entitlement registries;
- currency and internal rate cards.

Save the exact dimension rows used, or reference an immutable warehouse snapshot. A query against a current `services` table is nondeterministic even if the query text is versioned.

For dynamic shared-cost drivers, save the denominator and recipient weights. Recomputing a July support allocation from today's team spend changes every share.

## Pin the Billing Input

AWS updates CUR during the month and can update a finalized period for credits, refunds, and support fees. Legacy CUR can overwrite report files or create versioned assemblies; its manifest identifies the files in a report update. CUR identity line-item IDs are not stable across different reports and are only unique within a partition.

Persist:

- export name and configuration;
- billing period;
- report update or export execution ID;
- manifest and source object versions or immutable copies;
- selected partitions and file hashes;
- schema fingerprint;
- CUR status and invoice IDs;
- ingestion deduplication result.

Do not define the snapshot as `the latest files under this prefix`. That pointer changes.

## Separate Reproduction, Refresh, and Restatement

Use explicit run types:

| Run type | Billing input | Rules and dimensions | Expected result |
| --- | --- | --- | --- |
| Reproduction | same snapshot | same snapshot | byte-equivalent facts |
| Billing refresh | newer provider snapshot | same approved policy | provider deltas only |
| Policy restatement | named input snapshot | newly approved rules or dimensions | explained allocation deltas |
| Correction | corrected code or data | explicitly selected versions | defect-specific delta |

Never overwrite the published run. Link the successor with `supersedes_run_id` and preserve a delta table by source cost and recipient.

## Make Time Logic Deterministic

Avoid `current_date`, latest catalog joins, and open-ended lookups whose result depends on run time. Pass period boundaries and an `as_recorded_at` cutoff into the job.

Use half-open intervals:

```text
cost_time >= effective_from
AND cost_time < effective_to
```

Store UTC source time. Convert to business-calendar periods only in a versioned calendar dimension. Document how leap days, daylight-saving changes, and month boundaries affect interval allocation.

## Version Arithmetic Too

Results can change without business-rule changes if implementation details drift:

- net versus non-net fallback order;
- allocation before or after aggregation;
- decimal precision;
- currency conversion source and date;
- treatment of negative credits and refunds;
- zero-denominator fallback;
- residual tolerance;
- ordering of overlapping rules.

Keep money in a suitable fixed-precision decimal representation through the canonical model. Allocate at high precision, reconcile, then apply presentation rounding. If rounded recipient amounts must sum exactly, use a deterministic remainder rule and version it.

## Account for AWS Rule Reprocessing

AWS Cost Categories are effective at the start of the current month when created or edited, and can be configured with a prior effective month. Rules are evaluated in order. A current query can therefore show a historical category result that differs from an earlier run.

Snapshot the Cost Category value on each source row and identify the category configuration used. Do not assume the current AWS result is the value originally published.

Cost allocation tag backfill can also change historical availability. Treat a backfilled export as a new billing or dimension snapshot and publish its delta intentionally.

## Test the Bundle Before Approval

Run automated controls such as:

- no overlapping effective intervals at the same rule precedence;
- exactly one winning direct rule per matched source row;
- split weights are nonnegative and sum to one;
- every new account, service, usage type, and charge type is handled or residualized;
- all referenced owners exist in the frozen registry;
- direct plus shared plus central plus unresolved equals the selected control total;
- a second run against the same manifest has identical fact hashes;
- fixture rows for RI, Savings Plans, credits, refunds, tax, and shared assets select expected branches.

An approval should cover the rule artifact and its tests, not a screenshot of final totals.

## Publish Provenance with the Report

At report level expose:

- run ID and status;
- billing snapshot and finalization state;
- cost basis;
- rule bundle and rate-card versions;
- dimension snapshot date;
- central and unresolved totals;
- predecessor and delta if restated.

At row level retain source-row key, allocation rule ID, driver snapshot, weight, and pre-round amount. Users may not need every field in the default dashboard, but the drill-through must exist.

## Official Documentation

- [AWS Data Exports: Understanding CUR report versions and manifests](https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html)
- [AWS Data Exports: Finalized reports and later adjustments](https://docs.aws.amazon.com/cur/latest/userguide/view-finalized-cur.html)
- [AWS Data Exports: CUR 2.0 identity field scope and stability](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-identity.html)
- [AWS Data Exports: CUR 2.0 fixed schema and table configurations](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html)
- [AWS Billing: Cost Category effective dates and reprocessing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-cost-categories.html)
- [AWS Billing: Cost allocation tag backfill](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html)

## Conclusion

A reproducible showback is identified by more than a billing month. Pin the provider snapshot, rules, dimensions, rates, code, time logic, and arithmetic in an immutable run manifest. Then distinguish exact reproduction from a billing refresh or approved restatement. Historical reports can change, but never without a named input and an explained delta.
