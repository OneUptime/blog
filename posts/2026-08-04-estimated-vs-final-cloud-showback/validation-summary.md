# Validation Summary: Daily Estimated Cost vs Finalized Monthly Showback

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- AWS Cost and Usage Reports (AWS CUR)
- AWS Data Exports CUR 2.0
- AWS Billing and Cost Management
- Cloud cost showback and FinOps allocation
- SQL snapshot persistence
- Billing-data reconciliation and restatement workflows

## Sources Consulted

- [AWS Data Exports: What are AWS Cost and Usage Reports?](https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html)
- [AWS Data Exports: Understanding your report versions](https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html)
- [AWS Data Exports: Viewing your finalized report](https://docs.aws.amazon.com/cur/latest/userguide/view-finalized-cur.html)
- [AWS Data Exports: Editing your Cost and Usage Reports configuration](https://docs.aws.amazon.com/cur/latest/userguide/edit-cur.html)
- [AWS Data Exports: CUR 2.0 bill columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-bill.html)
- [AWS Data Exports: CUR 2.0 identity columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-identity.html)
- [AWS Data Exports: Legacy CUR line item details](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Billing: Getting set up with Billing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-getting-started.html)
- [AWS Billing: Knowing the differences between Billing and Cost Explorer data](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/differences-billing-data-cost-explorer-data.html)

## Issues Found

- The invoice identifier was named only as `bill/InvoiceId`, which is the legacy CUR column name even though the post also references CUR 2.0. The text now distinguishes legacy CUR's `bill/InvoiceId` from CUR 2.0's `bill_invoice_id`.
- The reconciliation guidance recommended including delivery identity in a stable composite key across snapshots. AWS assigns a new assembly ID to every report update, so that identifier cannot match records between deliveries. The text now keeps delivery identity as snapshot provenance and recommends aggregate reconciliation at a chosen grain without treating the assembly ID or line-item ID as a cross-version key.
- The line-item identity discussion used only the legacy `identity/LineItemId` name while citing the CUR 2.0 dictionary. The text now also names CUR 2.0's `identity_line_item_id` and clarifies that AWS documents no stable line-item identifier across reports.

## Review Notes

- The SQL example is a valid parameterized `INSERT` pattern, but the named placeholder syntax depends on the database driver or query library and the post intentionally does not prescribe one.
- The four lifecycle states, close controls, materiality thresholds, adjustment classifications, and restatement policies are internal governance recommendations rather than AWS-defined states.
- No product or API version is pinned. The reviewed claims match the AWS documentation available on 2026-08-04.
