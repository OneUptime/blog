# Validation Summary: How to Create DynamoDB Global Tables in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform / HCL
- AWS provider for Terraform
- Amazon DynamoDB
- DynamoDB global tables
- DynamoDB Streams
- AWS KMS
- Application Auto Scaling
- Amazon Route 53
- Amazon CloudWatch

## Sources Consulted
- Terraform Registry: `aws_dynamodb_table` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table.html
- Terraform Registry: `aws_appautoscaling_target` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target.html
- Terraform Registry: `aws_appautoscaling_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy.html
- Terraform Registry: `aws_route53_record` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record.html
- Terraform Registry: `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm.html
- AWS DynamoDB global tables overview: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html
- AWS DynamoDB global tables behavior and capacity settings: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html
- AWS DynamoDB global tables versions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_versions.html
- AWS DynamoDB global tables billing: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/global-tables-billing.html
- AWS DynamoDB metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- AWS DynamoDB `UpdateTable` API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateTable.html
- AWS DynamoDB point-in-time recovery: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html

## Issues Found
- The introduction said global tables remove "eventual consistency headaches," which overstated the default behavior. I changed it to say they remove custom replication logic, while keeping consistency considerations in the rest of the post.
- The conflict-resolution explanation described last-writer-wins as universal. Current DynamoDB global tables support both multi-Region eventual consistency and multi-Region strong consistency, so I clarified that last-writer-wins applies to the default eventual consistency mode.
- The versions section did not mention that the examples use the default multi-Region eventual consistency mode. I added that caveat so the later conflict-resolution and replication-latency discussion has the right scope.
- The post said provisioned capacity must be managed independently in each region. For current global tables, write capacity and write auto scaling are synchronized, while read capacity and read auto scaling can be configured or overridden per replica. I corrected the wording in the on-demand note and provisioned-capacity section.
- The strong-consistency note implied global tables may not be suitable whenever cross-region strong consistency is required. DynamoDB now supports multi-Region strong consistency for supported global table configurations, so I updated the note to distinguish default eventual consistency from MRSC.
- The cost example used "10 WCU write" and "additional 10 replicated WCUs" wording. AWS documents replicated write units for global tables and item-size based billing, so I changed the example to a 1 KB write consuming one replicated write unit in each replica table, plus cross-region data transfer fees.

## Review Notes
- The Terraform snippets use current `aws_dynamodb_table` `replica` blocks for DynamoDB global tables version 2019.11.21, and the documented nested `kms_key_arn` and replica `point_in_time_recovery` arguments are valid in the AWS provider.
- The CloudWatch `ReplicationLatency` alarm uses the documented `AWS/DynamoDB` metric and `TableName, ReceivingRegion` dimensions.
- `terraform` and `tofu` were not installed in the review environment, so validation was documentation-based rather than CLI schema-based.
