# Validation Summary: How to Use Amazon Textract with Intelligent Document Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS
- Amazon Textract
- Amazon Comprehend Custom Classification
- AWS Lambda
- AWS Step Functions
- Amazon S3 event notifications
- Amazon SQS
- Amazon DynamoDB
- Python
- Boto3

## Sources Consulted
- Amazon Textract Detecting Text: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-detecting.html
- Amazon Textract AnalyzeDocument API Reference: https://docs.aws.amazon.com/textract/latest/APIReference/API_AnalyzeDocument.html
- Amazon Textract AnalyzeExpense API Reference: https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeExpense.html
- Amazon Textract invoice and receipt standard fields: https://docs.aws.amazon.com/textract/latest/dg/invoices-receipts.html
- Amazon Textract AnalyzeID API Reference: https://docs.aws.amazon.com/textract/latest/APIReference/API_AnalyzeID.html
- Amazon Textract identity document fields: https://docs.aws.amazon.com/textract/latest/dg/identitydocumentfields.html
- Amazon Comprehend custom classification documentation: https://docs.aws.amazon.com/comprehend/latest/dg/how-document-classification.html
- AWS Lambda tutorial for S3 triggers: https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html
- Amazon S3 event message structure: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html
- Boto3 DynamoDB type serialization behavior: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html

## Issues Found
- The Lambda pipeline read the S3 object key directly from the S3 event. Amazon S3 event notifications URL-encode object keys, so keys containing spaces or other encoded characters would fail when passed to Textract or stored for review. Added `unquote_plus` and decoded the key before use.
- The complete pipeline called `store_results(...)` but did not define it, so the example would raise `NameError` after a successful validation. Added a small DynamoDB `put_item` helper to match the pipeline diagram's database storage step.
- The added storage helper serializes the extracted payload with `json.dumps(...)` because Textract confidence scores are Python floats, and Boto3's DynamoDB resource serializer does not accept float values directly.

## Review Notes
- The Textract APIs used in the post are current and match the official request shapes: `DetectDocumentText`, `AnalyzeDocument`, `AnalyzeExpense`, and `AnalyzeID`.
- The AnalyzeExpense field names used for invoices and receipts match Amazon Textract's documented standard fields.
- The AnalyzeID required fields checked in the validator match documented normalized identity document field names.
- The classifier is intentionally keyword-based for the tutorial, while the post correctly notes that Comprehend Custom Classification is the production-oriented option.
