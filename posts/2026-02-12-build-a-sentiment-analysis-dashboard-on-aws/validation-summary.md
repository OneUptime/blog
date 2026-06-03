# Validation Summary: How to Build a Sentiment Analysis Dashboard on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudFormation
- Amazon Kinesis Data Streams
- AWS Lambda
- Python and boto3
- Amazon Comprehend
- Amazon DynamoDB
- Amazon Data Firehose
- Amazon S3
- Amazon Athena
- Amazon QuickSight
- API Gateway

## Sources Consulted
- AWS CloudFormation AWS::Kinesis::Stream documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-kinesis-stream.html
- AWS CloudFormation AWS::DynamoDB::Table documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html
- AWS CloudFormation DynamoDB TimeToLiveSpecification documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-dynamodb-table-timetolivespecification.html
- AWS Lambda Kinesis event source documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis-example.html
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- boto3 Amazon Comprehend detect_sentiment documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/comprehend/client/detect_sentiment.html
- boto3 Amazon Comprehend detect_key_phrases documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/comprehend/client/detect_key_phrases.html
- boto3 Amazon Comprehend detect_entities documentation: https://docs.aws.amazon.com/botocore/latest/reference/services/comprehend/client/detect_entities.html
- boto3 Amazon Comprehend detect_targeted_sentiment documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/comprehend/client/detect_targeted_sentiment.html
- Amazon Comprehend targeted sentiment documentation: https://docs.aws.amazon.com/comprehend/latest/dg/how-targeted-sentiment.html
- Amazon DynamoDB update expression documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Amazon Data Firehose rename announcement: https://aws.amazon.com/about-aws/whats-new/2024/02/amazon-data-firehose-formerly-kinesis-data-firehose/
- OneUptime linked blog page: https://oneuptime.com/blog/post/2026-02-12-build-a-content-moderation-system-on-aws/view

## Issues Found
- The architecture diagram showed Amazon Comprehend invoking a separate results processor Lambda. The code uses synchronous Comprehend APIs from Lambda, so the diagram was updated to show Lambda calling Comprehend and then writing results.
- The diagram used the old "Kinesis Firehose" service name. It was updated to "Amazon Data Firehose", the current AWS service name.
- Python snippets used `datetime.utcnow()`, which is deprecated in current Python documentation. Replaced it with timezone-aware `datetime.now(timezone.utc)`.
- Comprehend snippets truncated input with `text[:5000]`, but the synchronous sentiment and targeted sentiment APIs limit text by UTF-8 bytes. Added a UTF-8-safe truncation helper and used it for Comprehend calls.
- The sentiment storage code computed an unused `date_str` and omitted the extracted entities from the DynamoDB item. Removed the unused variable and stored `entities` with the record.
- The API handler referenced `get_trend` and `get_top_topics`, but those functions were not defined. Added implementations matching the routed endpoints.
- The default `source=all` summary path did not read any DynamoDB items, so it always returned zero counts. Added an all-source hourly scan path.
- The recent-records endpoint used DynamoDB `Scan` with `Limit` before sorting, which does not reliably return the newest records because scans are unordered. Updated the example to collect matching records, handle pagination, then sort by timestamp.

## Review Notes
- The DynamoDB scan-based API examples are now correct for the tutorial schema, but the post's existing note about using a GSI in production remains important for larger tables.
- The CloudFormation snippets use valid resource types and properties for Kinesis Data Streams, DynamoDB on-demand billing, and DynamoDB TTL.
- The targeted sentiment example correctly uses English, which is the supported language for Amazon Comprehend targeted sentiment.
