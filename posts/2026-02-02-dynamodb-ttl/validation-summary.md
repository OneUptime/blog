# Validation Summary: How to Implement TTL (Time to Live) in DynamoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB (Time to Live feature)
- AWS CLI (`aws dynamodb update-time-to-live`, `update-table`, `describe-time-to-live`)
- AWS CloudFormation (`AWS::DynamoDB::Table` with `TimeToLiveSpecification`)
- Terraform (`aws_dynamodb_table` resource with `ttl` block)
- Python with Boto3 (`boto3.resource('dynamodb')`)
- Node.js with AWS SDK v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- Go with AWS SDK v2 (`github.com/aws/aws-sdk-go-v2/service/dynamodb`)
- DynamoDB Streams (TTL deletion capture via Lambda)
- AWS Lambda
- Amazon S3 (archival)
- Amazon SNS (notifications)
- Amazon CloudWatch (`TimeToLiveDeletedItemCount` metric, alarms)

## Sources Consulted
- [Using time to live (TTL) in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)
- [update-time-to-live AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-time-to-live.html)
- [AWS::DynamoDB::Table TimeToLiveSpecification](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-dynamodb-table-timetolivespecification.html)
- [Terraform aws_dynamodb_table resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table)
- [DynamoDB Metrics and dimensions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html)
- [DynamoDB Streams and Time to Live](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-streams.html)
- [@aws-sdk/lib-dynamodb](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/)
- [aws-sdk-go-v2 dynamodb types package](https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/service/dynamodb/types)

## Issues Found
1. **Go code missing imports**: The `ExtendSession` function in the Go example referenced `types.AttributeValueMemberS`, `types.AttributeValueMemberN`, and `strconv.FormatInt`, but the `import` block omitted both `strconv` and `github.com/aws/aws-sdk-go-v2/service/dynamodb/types`. The Go file would not compile. Added the two missing imports so the example compiles and runs as written.

## Review Notes
- The post states expired items are deleted "within 48 hours of the TTL timestamp." Current AWS documentation has softened this language to "typically within a few days, on a best-effort basis." The 48-hour figure still appears in the DynamoDB FAQ and is a useful upper-bound guideline, so the statement is not incorrect and was left unchanged.
- AWS CLI examples use `"Enabled=true, AttributeName=expirationTime"` with a space after the comma. The official examples omit the space, but the shorthand parser accepts both forms — no change needed.
- The DynamoDB Streams TTL deletion signature (`userIdentity.type = "Service"`, `userIdentity.principalId = "dynamodb.amazonaws.com"`) is accurate. Worth noting (not in the post) that in global tables only the source region's stream record carries this field.
- CloudFormation, Terraform, CloudWatch metric, Boto3, and AWS SDK v3 (JavaScript) examples are all correct against current official documentation.
