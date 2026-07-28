# Validation Summary: How to Allocate Shared Savings Plans Discounts for Chargeback and Showback

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Savings Plans
- AWS Organizations consolidated billing
- AWS Cost and Usage Report (CUR) 2.0
- AWS Data Exports
- Amazon S3
- AWS Glue Data Catalog
- Amazon Athena and Trino SQL
- AWS Cost Categories
- FinOps chargeback and showback

## Sources Consulted
- Savings Plans columns in CUR and AWS Data Exports - https://docs.aws.amazon.com/cur/latest/userguide/savingsplans-columns.html
- CUR 2.0 Savings plan column dictionary - https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html
- CUR 2.0 Bill column dictionary - https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-bill.html
- CUR 2.0 Line item column dictionary - https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html
- Understanding Savings Plans line items in CUR - https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html
- AWS Savings Plans chargeback strategy - https://aws.amazon.com/blogs/aws-cloud-financial-management/aws-savings-plans-how-to-implement-an-effective-chargeback-strategy/
- Reserved Instances and Savings Plans discount sharing - https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html
- Understanding how Savings Plans apply to usage - https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html
- Creating a standard AWS Data Export - https://docs.aws.amazon.com/cur/latest/userguide/dataexports-create-standard.html
- Processing Data Exports with AWS Glue and Athena - https://docs.aws.amazon.com/cur/latest/userguide/dataexports-processing.html
- Running Amazon Athena queries on CUR data - https://docs.aws.amazon.com/cur/latest/userguide/cur-ate-run.html
- Amazon Athena timestamp guidance - https://docs.aws.amazon.com/athena/latest/ug/data-types-timestamps.html
- Amazon Athena SELECT syntax - https://docs.aws.amazon.com/athena/latest/ug/select.html
- Understanding consolidated AWS bills - https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html
- Returning a purchased Savings Plan - https://docs.aws.amazon.com/savingsplans/latest/userguide/return-sp.html
- Viewing Savings Plans inventory - https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-inventory.html

## Issues Found
- The Athena query used `DATE 'YYYY-MM-01'`. The placeholder is not a valid SQL date literal, and CUR 2.0 defines `bill_billing_period_start_date` as a timestamp. Replaced it with the runnable, type-aligned example `TIMESTAMP '2026-06-01 00:00:00'` and identified the example period in the surrounding sentence.
- The net-cost guidance mentioned only `NetSavingsPlanEffectiveCost`, while the unused-commitment formula used the non-net `UsedCommitment` field. AWS documents net recurring commitment, net amortized upfront commitment, and net effective cost fields, but no net equivalent of `UsedCommitment`. Clarified that a net reconciliation must derive net unused commitment from net plan fee minus summed net effective cost and must not mix net and non-net fields.

## Review Notes
The account and Cost Category sharing behavior is current as of the validation date: the owner account receives benefits first; prioritized groups can pass remaining benefits to the wider organization; restricted groups cannot; the payer account cannot join a sharing group; and an account can belong to only one sharing group. AWS also documents that the final bill uses the sharing preferences set at 23:59:59 UTC on the last day of the month. The query remains intentionally simplified, so readers must use their generated table name and inspect any customized or aliased export schema.
