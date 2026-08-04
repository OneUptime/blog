# Validation Summary: AWS CUR Showback SQL for Usage, Commitments, and Fees

## Status

validated

## Post Type

Technical guide and SQL reference

## Technologies Covered

- AWS Cost and Usage Reports (legacy CUR)
- AWS Data Exports Cost and Usage Report 2.0 (CUR 2.0)
- Amazon Athena SQL
- AWS Savings Plans
- AWS Reserved Instances
- Amortized cost, net amortized cost, and showback allocation

## Sources Consulted

- [AWS Data Exports: Line item details](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Data Exports: Reservation details](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)
- [AWS Data Exports: Understanding your reservation line items](https://docs.aws.amazon.com/cur/latest/userguide/regular-reserved-instances.html)
- [AWS Data Exports: Understanding your amortized reservation data](https://docs.aws.amazon.com/cur/latest/userguide/amortized-reservation.html)
- [AWS Data Exports: Savings plan columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)
- [AWS Data Exports: Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Data Exports: Running Amazon Athena queries](https://docs.aws.amazon.com/cur/latest/userguide/cur-ate-run.html)
- [AWS Data Exports: Cost and Usage Report 2.0](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html)
- [AWS Data Exports: Migrating from CUR to Data Exports CUR 2.0](https://docs.aws.amazon.com/cur/latest/userguide/dataexports-migrate.html)
- [AWS Data Exports: Understanding report versions](https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html)
- [AWS Cloud Intelligence Dashboards: Net amortized cost](https://docs.aws.amazon.com/guidance/latest/cloud-intelligence-dashboards/net-amortized-cost.html)

## Issues Found

- The component query selected `line_item_resource_id` even though it did not use that column. Resource IDs are optional in legacy CUR and are added to CUR 2.0 only when `INCLUDE_RESOURCES` is enabled, so the unnecessary reference could make the query fail against a valid export. Removed the column from the CTE.
- The RI formula did not state that AWS currently omits amortized-upfront reservation fields for Dedicated Host reservations. Because the query coalesces missing values to zero, those rows could otherwise appear reconciled while being understated. Added a narrow caveat requiring Dedicated Host reservation rows to be isolated as unsupported.

## Review Notes

- The non-net amortized branches and the net counterparts match AWS's documented CUR semantics and Cloud Intelligence Dashboards formula.
- Current AWS documentation also lists line-item types such as `BundledDiscount`, `Discount`, and `FlatRateSubscription`. The post intentionally routes types outside its explicit list to `unclassified_cost` for review instead of assuming their showback treatment.
- Legacy CUR can omit optional reservation, Savings Plans, resource, and net column groups when they are not applicable. The post correctly tells readers to inspect the actual monthly schema.
- The SQL was checked against Athena syntax and AWS field definitions, but no account-specific CUR dataset was available for execution or reconciliation testing.
