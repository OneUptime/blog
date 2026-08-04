# Prove Showback Completeness with Control Totals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Showback, FinOps, Cost Allocation, Data Quality, Reconciliation, AWS CUR, Auditability

Description: Use control totals, residual buckets, and allocation tests to prove every in-scope cost is processed once and only once.

---

A dashboard that assigns every visible row to a team can still be incomplete. Source files may be missing, a join may duplicate cost, unsupported charges may be filtered out, or shared-cost weights may add up to more than one.

Completeness is a set of testable invariants. For a declared scope and cost basis, every source amount must be ingested once, classified once, and either allocated or placed in a named residual or central bucket. The allocated output must reconcile to the source without unexplained gain or loss.

## Start with a Written Reconciliation Contract

Before comparing totals, declare:

- billing period and source-delivery version;
- payer and linked accounts in scope;
- currency and any exchange-rate policy;
- included AWS billing entities and Marketplace treatment;
- line-item types in scope;
- cost basis, such as unblended or net amortized cost;
- treatment of tax, credits, refunds, support, and commitment fees;
- rounding precision and materiality threshold.

Two totals built with different definitions are not a failed reconciliation; they are an invalid comparison. An amortized showback, for example, will not follow the same timing as a cash-oriented invoice view without a bridge.

## Control the Ingestion Boundary

For versioned AWS CUR deliveries, process the report files named by one manifest. Do not scan a prefix that contains assemblies from multiple deliveries. Record each file's key, size, checksum when available, row count, and load status.

Useful ingestion controls include:

1. expected manifest files equal successfully loaded files;
2. no file identifier is loaded twice into the same source snapshot;
3. input data row count equals staged row count plus explicitly rejected rows;
4. every rejection has a reason and, when its amount is parseable, a monetary total; an unparseable monetary field fails the run;
5. the schema version and selected columns are recorded with the run.

Legacy CUR columns can vary monthly with usage. CUR 2.0 provides a more consistent schema, but table configurations can still add or remove columns. The pipeline should fail visibly when required fields disappear or change type.

## Give Every Source Row a Durable Run-Scoped Key

AWS documents that `identity/LineItemId` is unique within a CUR partition and may not remain consistent across separate reports. Do not treat it as a permanent global primary key.

Create a key scoped to the frozen source delivery. One practical pattern is:

```text
source_row_key = hash(
  source_delivery_id,
  source_partition,
  identity_line_item_id
)
```

Treat a repeated `(source_partition, identity_line_item_id)` within the frozen delivery as a failed uniqueness control rather than making the duplicate unique with a row ordinal. Preserve relevant native identity, bill, account, product, usage-interval, line-item-type, and resource fields for drill-through.

## Make Residuals Part of the Model

Completeness does not mean pretending every charge has a business owner. It means accounting for every charge. Create explicit recipients such as:

- `UNMATCHED_TAG`;
- `AMBIGUOUS_OWNER`;
- `MISSING_TELEMETRY`;
- `ZERO_DRIVER_TOTAL`;
- `UNSUPPORTED_LINE_TYPE`;
- `SHARED_PLATFORM_CENTRAL`;
- `TAX_CENTRAL`;
- `POST_CLOSE_ADJUSTMENT`.

Residuals remain in the control total and have named owners and remediation targets. A filtered-out `NULL` is not a residual bucket; it is lost cost.

Track both monetary coverage and row coverage. Ninety-nine percent of rows can conceal a material unallocated fee, while a large number of zero-cost rows can distort row-count percentages.

## Test Conservation at the Source Row

Represent every allocation, including direct assignment and residual classification, as a weighted output from one source row. The core invariant is:

```text
sum(allocation_weight per source_row_key) = 1
sum(allocated_cost per source_row_key) = source_cost
```

A source-row test can expose under-allocation, over-allocation, and fan-out:

```sql
SELECT
  source_row_key,
  MAX(source_cost) AS source_cost,
  SUM(allocation_weight) AS weight_sum,
  SUM(allocated_cost) AS allocated_cost
FROM allocation_fact
WHERE is_final_stage = TRUE
GROUP BY source_row_key
HAVING ABS(SUM(allocation_weight) - 1.0) > 0.0000001
    OR ABS(SUM(allocated_cost) - MAX(source_cost)) > 0.01;
```

This assumes each allocation output repeats the same source amount and that the allocation fact contains one final-stage row per recipient share. If your schema stores intermediate stages, run the same conservation test separately for each stage.

Run the test before display rounding. Allocate in high precision, then use a deterministic remainder policy so rounded recipient amounts still equal the rounded source total.

## Detect Double Allocation

A cost can reconcile globally while individual rows are duplicated and other rows are missing by the same amount. Add structural tests:

```sql
SELECT
  source_row_key,
  allocation_stage,
  rule_id,
  recipient_key,
  COUNT(*) AS copies
FROM allocation_fact
WHERE is_final_stage = TRUE
GROUP BY source_row_key, allocation_stage, rule_id, recipient_key
HAVING COUNT(*) > 1;
```

Also compare the distinct source-row population before and after every ownership, telemetry, and service-catalog join. A one-to-many join is acceptable only when it deliberately creates allocation candidates and applies normalized weights. It must never multiply the source amount implicitly.

Commitment and container data need special controls:

- reserved-instance and Savings Plans benefits must include both used and unused commitment treatment without counting the same fee twice;
- an EC2-backed EKS container allocation built from split cost and unused cost fields must reconcile to its parent EC2 cost and must not be added on top of that same parent cost;
- negation and covered-usage relationships must follow the selected AWS cost formula rather than treating every line as an independent positive charge.

## Reconcile Through Layered Control Totals

Use a waterfall so failures are localized:

| Layer | Required equality |
| --- | --- |
| Delivery | Manifest files = loaded files |
| Staging | Parsed amount = accepted amount + rejected amount |
| Canonical cost | In-scope raw charges = chosen cost components + excluded components |
| Attribution | Canonical cost = direct + shared + central + residual |
| Publication | Attribution output = team reports + central report + residual report |
| Finance bridge | Published showback plus named timing and policy differences = comparison target |

Store the amount and row count at every layer. When a control fails, stop publication or mark the run failed; do not merely log a warning that no one reviews.

## Publish Evidence with the Report

An audit-friendly run manifest should contain:

- source delivery and query version;
- cost formula and allocation-rule bundle;
- input, output, central, and residual totals;
- count and value of failed controls;
- largest residual reasons;
- predecessor run and delta for a restatement;
- approver and publication timestamp.

Expose residuals to service owners instead of hiding them from the dashboard. An unresolved amount with a reason is evidence of completeness and an operational backlog. A smaller total created by dropping hard-to-attribute rows is neither.

## Official Documentation

- [AWS Data Exports: Understanding CUR report versions and manifests](https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html)
- [AWS Data Exports: CUR identity columns](https://docs.aws.amazon.com/cur/latest/userguide/identity-columns.html)
- [AWS Data Exports: CUR 2.0 line item dictionary](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html)
- [AWS Data Exports: CUR line-item type definitions](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Data Exports: CUR 2.0 schema and table configurations](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html)
- [AWS Data Exports: Reserved Instance columns](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)
- [AWS Data Exports: Savings Plans columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)
- [AWS Data Exports: Understanding split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html)

## Conclusion

A complete showback is not one with an owner name on every chart. It is one where a defined source scope flows through controlled transformations without disappearance or duplication. Reconcile each layer, conserve every source row, keep residuals visible, and publish the control evidence alongside the result. Then completeness is demonstrable, not assumed.
