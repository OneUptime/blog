# Validation Summary: How to Build an IoT Dashboard with QuickSight

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon QuickSight
- Amazon Athena
- AWS Glue Data Catalog
- Amazon S3
- Amazon Timestream
- AWS IoT Core
- Amazon Kinesis Data Streams
- Amazon Data Firehose
- SPICE
- AWS CLI
- SQL

## Sources Consulted
- AWS CLI Command Reference: quicksight create-data-source - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-source.html
- AWS CLI Command Reference: quicksight create-data-set - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-set.html
- AWS CLI Command Reference: quicksight create-refresh-schedule - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-refresh-schedule.html
- Amazon QuickSight Developer Guide: UpdateDashboardPermissions - https://docs.aws.amazon.com/quicksight/latest/developerguide/update-dashboard-permissions.html
- Amazon Athena User Guide: CREATE TABLE - https://docs.aws.amazon.com/athena/latest/ug/create-table.html
- Amazon Athena User Guide: MSCK REPAIR TABLE - https://docs.aws.amazon.com/athena/latest/ug/msck-repair-table.html
- Amazon QuickSight User Guide: Using Amazon Timestream data with Amazon QuickSight - https://docs.aws.amazon.com/quick/latest/userguide/using-data-from-timestream.html
- AWS Business Intelligence Blog: Best practices for Amazon QuickSight SPICE and direct query mode - https://aws.amazon.com/blogs/business-intelligence/best-practices-for-amazon-quicksight-spice-and-direct-query-mode/
- Amazon QuickSight pricing - https://aws.amazon.com/quick/quicksight/pricing/
- Amazon QuickSight User Guide: Configure SPICE memory capacity - https://docs.aws.amazon.com/quick/latest/userguide/managing-spice-capacity.html
- AWS IoT Analytics User Guide: AWS IoT Analytics end of support - https://docs.aws.amazon.com/iotanalytics/latest/userguide/iotanalytics-end-of-support.html
- AWS What's New: Introducing Amazon Data Firehose, formerly known as Amazon Kinesis Data Firehose - https://aws.amazon.com/about-aws/whats-new/2024/02/amazon-data-firehose-formerly-kinesis-data-firehose/

## Issues Found
- The architecture and walkthrough referenced AWS IoT Analytics as a current pipeline option. AWS ended support for AWS IoT Analytics on December 15, 2025, so I updated the text to use supported ingestion patterns such as AWS IoT Core rules, Kinesis, Amazon Data Firehose, and Glue.
- The post stated that Timestream supports direct query mode in QuickSight "not SPICE." Official QuickSight documentation says Timestream can use either SPICE import or direct query, while published dashboard autorefresh requires direct query. I updated that explanation.
- The SPICE description said dashboards load "instantly." I changed this to "quickly and consistently" to avoid an absolute performance claim.
- The pricing section gave an outdated Reader pricing example of "$5/month per user with session pricing." I replaced it with a current, non-price-specific recommendation to use Reader accounts or Reader capacity pricing, and clarified that QuickSight pricing includes user pricing, optional Reader capacity pricing, and SPICE capacity.

## Review Notes
The AWS CLI command shapes for `create-data-source`, `create-data-set`, `create-refresh-schedule`, and `update-dashboard-permissions` match the current AWS CLI documentation. The Athena DDL and `MSCK REPAIR TABLE` example are valid for Hive-compatible S3 partitions, assuming the S3 layout uses partition folders such as `year=2026/month=2/day=12/`.
