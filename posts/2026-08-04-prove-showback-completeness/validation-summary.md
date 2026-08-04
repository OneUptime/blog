# Validation Summary: Prove Showback Completeness with Control Totals

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- AWS Cost and Usage Reports (AWS CUR)
- AWS Data Exports and CUR 2.0
- Amazon S3 delivery manifests
- Amazon Athena SQL
- Reserved Instances and Savings Plans cost allocation
- Amazon EKS split cost allocation data
- FinOps showback reconciliation and data-quality controls

## Sources Consulted

- [AWS Data Exports: Understanding your report versions](https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html)
- [AWS Data Exports: Understanding export delivery](https://docs.aws.amazon.com/cur/latest/userguide/dataexports-export-delivery.html)
- [AWS Data Exports: CUR identity details](https://docs.aws.amazon.com/cur/latest/userguide/identity-columns.html)
- [AWS Data Exports: CUR 2.0 identity columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-identity.html)
- [AWS Data Exports: Cost and Usage Report (CUR) 2.0](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html)
- [AWS Data Exports: CUR line-item definitions](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Data Exports: CUR 2.0 line-item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html)
- [AWS Data Exports: Reservation details](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)
- [AWS Data Exports: Understanding amortized reservation data](https://docs.aws.amazon.com/cur/latest/userguide/amortized-reservation.html)
- [AWS Data Exports: Savings Plans columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)
- [AWS Data Exports: Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Data Exports: Understanding split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html)
- [AWS Data Exports: Split line-item details](https://docs.aws.amazon.com/cur/latest/userguide/split-line-item-columns.html)
- [Amazon Athena: SELECT syntax](https://docs.aws.amazon.com/athena/latest/ug/select.html)

## Issues Found

- The ingestion row-count control compared parsed rows with staged and rejected rows, even though parsing failures are themselves rejected rows. Changed the left-hand side to the input data row count and clarified that an unparseable monetary field must fail the run because it cannot contribute a reliable rejected-cost total.
- The CUR 2.0 description called its schema a fixed-schema configuration. AWS documents a consistent set of columns compared with legacy CUR, while table configurations can still add or remove columns. Updated the wording to preserve that distinction.
- The proposed source-row key included an original row ordinal to distinguish duplicate identity values. AWS guarantees `identity/LineItemId` uniqueness within a partition; assigning separate ordinals could hide a duplicated load. Removed the ordinal and made a repeated partition-and-line-item tuple a failed uniqueness control.
- The conservation query aggregated every row in `allocation_fact`, which would overcount when the table also held intermediate allocation stages. Added `WHERE is_final_stage = TRUE` and aligned the surrounding explanation with stage-specific testing.
- The EKS reconciliation statement assumed a parent EC2 instance without identifying the launch model. Clarified that the statement applies to EC2-backed EKS workloads; AWS split-cost records can also cover workloads that do not have a parent EC2 resource.
- The identity documentation link was labeled as CUR 2.0 even though the text uses the legacy `identity/LineItemId` column name. Replaced it with the matching CUR identity reference.

## Review Notes

The SQL examples use syntax supported by Amazon Athena, including aggregate expressions, `GROUP BY`, `HAVING`, boolean predicates, and final-stage filtering. The monetary and weight tolerances remain policy choices that should match the reconciliation contract's currency precision and materiality threshold. All external links in the post resolve to the intended AWS documentation topics.
