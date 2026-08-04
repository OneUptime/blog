# Validation Summary: Detect Showback Drift Between Service Catalogs and Cloud Tags

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Billing and Cost Management
- AWS Cost and Usage Report (CUR) 2.0 and Data Exports
- AWS cost allocation tags
- AWS Organizations account tags
- AWS Cost Categories
- AWS Config
- AWS Resource Groups Tagging API
- Internal service catalogs, effective-dated ownership data, and FinOps showback controls

## Sources Consulted
- [AWS Billing: Activating user-defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html)
- [AWS Billing: Organizing and tracking costs using AWS cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html)
- [AWS Billing: Backfill cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html)
- [AWS Billing: Using account tags for cost allocation](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/account-tags-cost-allocation.html)
- [AWS Data Exports: CUR 2.0 Tags column](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-tag-columns.html)
- [AWS Data Exports: CUR 2.0 resource tags columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-resource-tags.html)
- [AWS Billing: Organizing costs using AWS Cost Categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-cost-categories.html)
- [AWS Billing: Creating cost categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/create-cost-categories.html)
- [AWS Billing: Editing cost categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/edit-cost-categories.html)
- [AWS Billing and Cost Management API: CostCategoryRule](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_CostCategoryRule.html)
- [AWS Config: Recording AWS resources](https://docs.aws.amazon.com/config/latest/developerguide/select-resources.html)
- [AWS Config: Looking up discovered resources](https://docs.aws.amazon.com/config/latest/developerguide/looking-up-discovered-resources.html)
- [AWS Resource Groups Tagging API: GetResources](https://docs.aws.amazon.com/resourcegroupstagging/latest/APIReference/API_GetResources.html)

## Issues Found
No technical issues found.

## Review Notes
The post correctly treats the field lists, effective-date predicate, and drift-rate expression as conceptual data-model and control examples rather than complete runnable code. AWS documentation confirms the activation delays for user-defined cost allocation tags, the CUR 2.0 tag-source prefixes, the 12-month backfill limit and historical-assignment requirement, account-level cost allocation tags, ordered Cost Category rules and retroactive effective months, and AWS Config coverage for supported created, changed, and deleted resources.

The post also correctly avoids treating a current CUR 2.0 category result as immutable: cost allocation tag backfill and Cost Category reprocessing can update historical cost-management data. In an implementation, AWS Config coverage depends on the resource type, Region, recorder configuration, recording frequency, and retention settings, while `GetResources` is limited to services supported by the Resource Groups Tagging API and returns current tag state (including empty tag sets for some previously tagged resources). These limitations are consistent with the post's qualified language and do not require changes.
