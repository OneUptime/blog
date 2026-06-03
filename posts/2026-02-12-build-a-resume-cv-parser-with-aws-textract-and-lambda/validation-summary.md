# Validation Summary: How to Build a Resume/CV Parser with AWS Textract and Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Textract
- AWS Lambda
- Amazon S3
- Amazon Comprehend
- Amazon DynamoDB
- AWS CloudFormation
- Python
- Boto3

## Sources Consulted
- Amazon Textract document quotas: https://docs.aws.amazon.com/textract/latest/dg/limits-document.html
- Amazon Textract StartDocumentTextDetection API reference: https://docs.aws.amazon.com/textract/latest/APIReference/API_StartDocumentTextDetection.html
- Amazon Textract GetDocumentTextDetection API reference: https://docs.aws.amazon.com/textract/latest/dg/API_GetDocumentTextDetection.html
- AWS CloudFormation AWS::S3::Bucket NotificationConfiguration reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-notificationconfiguration.html
- AWS CloudFormation AWS::S3::Bucket LambdaConfiguration reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-lambdaconfiguration.html
- Amazon Comprehend guidelines and quotas: https://docs.aws.amazon.com/comprehend/latest/dg/guidelines-and-limits.html
- Boto3 DynamoDB Table.scan reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/scan.html
- Amazon DynamoDB Scan developer guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html

## Issues Found
- The opening paragraph implied AWS Textract can directly process Word documents. Updated it to clarify that Word documents need conversion before Textract.
- The CloudFormation snippet referenced a Lambda function but did not include the Lambda function, execution role, or S3 invoke permission. Labeled the snippet as an excerpt and documented the omitted resources.
- The Textract size check applied a 10 MB limit to all files, but asynchronous PDF and TIFF processing supports larger documents than synchronous operations. Updated the sample to use a 500 MB limit for PDF/TIFF and 10 MB for image files.
- The Textract sample only used asynchronous processing for PDFs. Updated it to use the async API for TIFF files as well.
- The Textract async polling helper returned only the first GetDocumentTextDetection page. Updated it to follow NextToken and collect all blocks.
- The structure parser called parse_summary and parse_education without defining them. Added minimal implementations so the example is syntactically complete.
- The Comprehend sample sliced text by Python characters while the service quota is byte-based for UTF-8 text. Added a UTF-8-safe truncation helper and reused the truncated text for key phrase and entity detection.
- The DynamoDB search helper returned only the first Scan page. Added scan pagination using LastEvaluatedKey and ExclusiveStartKey.

## Review Notes
- The code examples are tutorial snippets and still omit production concerns such as IAM policies, retry/backoff behavior, asynchronous Textract completion via SNS/EventBridge instead of polling inside Lambda, S3 bucket name uniqueness, and using a search service or secondary indexes instead of broad DynamoDB scans for larger candidate pools.
