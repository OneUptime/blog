# Validation Summary: How to Create AWS IoT Core Rules with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IoT Core Rules Engine
- AWS IoT SQL and substitution templates
- Amazon DynamoDB
- AWS Lambda
- Amazon S3
- Amazon SNS
- Amazon SQS
- AWS IAM

## Sources Consulted
- AWS IoT rule actions: https://docs.aws.amazon.com/iot/latest/developerguide/iot-rule-actions.html
- Rules for AWS IoT: https://docs.aws.amazon.com/iot/latest/developerguide/iot-rules.html
- DynamoDBv2 rule action: https://docs.aws.amazon.com/iot/latest/developerguide/dynamodb-v2-rule-action.html
- Lambda rule action: https://docs.aws.amazon.com/iot/latest/developerguide/lambda-rule-action.html
- S3 rule action: https://docs.aws.amazon.com/iot/latest/developerguide/s3-rule-action.html
- SNS rule action: https://docs.aws.amazon.com/iot/latest/developerguide/sns-rule-action.html
- SQS rule action: https://docs.aws.amazon.com/iot/latest/developerguide/sqs-rule-action.html
- AWS IoT SQL functions: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-functions.html
- AWS IoT substitution templates: https://docs.aws.amazon.com/iot/latest/developerguide/iot-substitution-templates.html
- AWS::IoT::TopicRule reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iot-topicrule.html
- AWS provider `aws_iot_topic_rule` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iot_topic_rule.html.markdown
- AWS provider `aws_lambda_permission` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Amazon S3 required API permissions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html
- Amazon S3 `PutObject` API: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html

## Issues Found
- The S3 object key used `year()`, `month()`, and `day()` functions, but AWS IoT SQL documents `timestamp()` and `parse_time(...)` for date formatting instead. I replaced the key template with `parse_time(...)` substitution templates so the example uses documented functions.
- The S3 action set `canned_acl = "private"`. On modern S3 buckets with Object Ownership set to bucket owner enforced, ACLs are disabled by default and specifying an ACL can fail. I removed the ACL line because S3 objects are private by default and the example's IAM policy only needs `s3:PutObject` afterward.
- The S3 rule description said it archived "all device messages" even though the SQL filter only matches `devices/+/data`. I changed the description to "device data messages" so the prose matches the actual rule behavior.

## Review Notes
- The Lambda permission example is technically valid with `source_arn`. Adding `source_account` would tighten the resource policy further, but it is not required for the example to work.
- The DynamoDBv2 action requires the final message written by the rule to include attributes that match the target table's partition key, and sort key if the table defines one. The example is valid if `aws_dynamodb_table.telemetry` is defined with matching key attributes.
- Amazon SNS and Amazon SQS rule actions do not support FIFO topics or queues. The post does not define those resources, so readers should ensure they use standard topic and queue types for these examples.
