# Daily Estimated Cost vs Finalized Monthly Showback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Showback, FinOps, AWS CUR, Billing Data, Cost Allocation, Financial Operations, Data Quality

Description: Publish useful daily cost estimates while preserving a controlled monthly close and a clear path for late billing adjustments.

---

A daily showback and a finalized monthly showback answer different questions. The daily view helps teams react to spend while the month is open. The final view supports a stable internal statement after provider billing has matured.

Problems begin when both are presented as the same product. An estimate changes as services report usage, discounts are calculated, and AWS publishes later data. A closed report should change only through an explicit adjustment or restatement process.

The solution is not to hide estimates. Give every showback run a visible lifecycle state and make changes between states explainable.

## Know What the AWS Data Represents

AWS Cost and Usage Reports are cumulative for the current billing period. AWS updates them at least daily and may update them as often as three times a day. Different services can report usage at different times. Current-month data is therefore estimated, not a complete stream of immutable daily files.

Do not add successive current-month snapshots together. Replace the prior snapshot for that billing period, or compare two complete snapshots to calculate a change.

When AWS finalizes a report, `bill/InvoiceId` is populated for line items associated with an invoice. That is a valuable close signal, but it does not mean the dataset can never change again. AWS documents that refunds, credits, and support fees can be applied after the bill is finalized. If the report's data-refresh option is enabled, those changes can update a closed billing period.

This leads to four useful report states:

| State | Meaning | Recommended use |
| --- | --- | --- |
| Provisional | Current-month data still arriving | Engineering trend and anomaly response |
| Close candidate | Month ended and invoice signals are present | Finance review and control checks |
| Final | Approved source snapshot and allocation run are frozen | Published monthly showback |
| Restated | A later provider adjustment or approved correction was applied | Replacement report with a delta trail |

These are internal governance states. AWS supplies source evidence; your organization decides when an internal showback is approved.

## Build a Daily Estimate That Can Change Safely

Every daily publication should display:

- billing period and source-data `as_of` time;
- source report and manifest or export version;
- selected cost basis, such as net amortized cost;
- report state, prominently marked `Provisional`;
- unallocated and centrally held amounts;
- change since the preceding complete snapshot;
- known incomplete sources or late-reporting services.

Rebuild the month from the newest complete delivery. If using an AWS CUR report with versioned deliveries, process only the files identified by that delivery's manifest. Mixing files from old and new assemblies can duplicate line items.

A snapshot table can preserve what users actually saw:

```sql
INSERT INTO showback_snapshot (
  snapshot_id,
  billing_period,
  source_version,
  source_as_of,
  status,
  payload_hash
)
VALUES (
  :snapshot_id,
  :billing_period,
  :source_version,
  :source_as_of,
  'PROVISIONAL',
  :payload_hash
);
```

Store the resulting allocation rows under `snapshot_id`; do not overwrite them in place. The next run can be different without rewriting the historical record of what was published.

## Use a Controlled Monthly Close

An effective close checklist should verify more than the calendar date:

1. The expected AWS delivery completed and its manifest was processed exactly once.
2. Invoice identifiers are present where expected for invoiced charges.
3. The configured wait period for late service data and support charges has passed.
4. Source totals reconcile to the chosen billing scope and cost basis.
5. All allocation weights conserve cost, including central and unresolved buckets.
6. Material differences from the final provisional snapshot are explained.
7. Finance or the designated owner approves the run ID for publication.

AWS notes that monthly bills are generally available by the seventh accounting day of the next month. Treat that as provider guidance, not a universal promise that your own close should happen on a fixed day. Your close threshold should reflect account structure, contracts, Marketplace activity, and observed data arrival.

Freeze the approved billing snapshot, allocation-rule version, ownership snapshot, exchange rates, and output. A rerun against newer AWS data is a new run, not a silent replacement.

## Handle Late Adjustments as Deltas

When a credit, refund, support fee, or corrected usage line appears after close, classify it before changing team statements:

- **Provider adjustment:** the source billing data changed.
- **Attribution correction:** the source amount stayed the same but ownership changed.
- **Policy correction:** a rate or allocation rule was approved incorrectly.
- **Presentation correction:** only labels or formatting changed.

For a provider adjustment, calculate the delta between the frozen final source snapshot and the refreshed snapshot using a stable composite source key. AWS states that `identity/LineItemId` is unique only within a CUR partition and is not guaranteed to remain consistent across different reports. Include delivery identity, billing period, account, service, usage interval, line-item type, resource identifier when present, and other distinguishing source fields in the reconciliation design.

Publish late changes through one of two explicit policies:

- restate the original month and link the replacement to its predecessor; or
- post the delta in the current period with an adjustment month and originating month.

Whichever policy finance chooses, retain both amounts. Users should be able to see `previous_final`, `adjustment`, and `revised_final`, rather than seeing last month's chart move without explanation.

## Bridge Showback and Invoice Views

An operational showback may use amortized commitment costs while an invoice follows cash timing. Taxes, credits, refunds, and support charges may also follow policies that differ from workload allocation. A mismatch is not automatically a defect.

Maintain a bridge with named components:

```text
invoice-scope source total
+/- cost-basis timing differences
+/- excluded or centrally managed charge classes
+/- late adjustments not yet posted to showback
= published showback control total
```

Do not force the showback to equal the invoice by hiding the bridge. Reconciliation requires the same scope, period, currency, account population, and cost definition on both sides.

## Communicate Material Changes

Set thresholds for notifying users when a provisional number changes. Useful measures include absolute cost, percentage of the team's monthly total, and whether the change crosses a budget threshold. Show both the data timestamp and the publication timestamp.

For the final-to-restated transition, publish a concise reason code, affected teams, source classes, and total delta. A team should never have to infer whether its number changed because AWS reported late data or because the allocation policy changed.

## Official Documentation

- [AWS Data Exports: What AWS Cost and Usage Reports contain and when they update](https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html)
- [AWS Data Exports: Understanding report versions and manifests](https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html)
- [AWS Data Exports: Viewing finalized reports and post-finalization changes](https://docs.aws.amazon.com/cur/latest/userguide/view-finalized-cur.html)
- [AWS Data Exports: Editing a report and enabling data refresh](https://docs.aws.amazon.com/cur/latest/userguide/edit-cur.html)
- [AWS Data Exports: CUR 2.0 bill columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-bill.html)
- [AWS Data Exports: CUR 2.0 identity columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-identity.html)
- [AWS Billing: Getting started with monthly billing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-getting-started.html)
- [AWS Billing: Differences between billing data and Cost Explorer](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/differences-billing-data-cost-explorer-data.html)

## Conclusion

Daily estimates should be fast, transparent, and allowed to change. Final monthly showback should be frozen, reconciled, and approved. Preserve each source snapshot, expose the report state, and process later billing changes through an explicit delta or restatement. That gives engineering timely signals without asking finance to treat a moving estimate as a closed statement.
