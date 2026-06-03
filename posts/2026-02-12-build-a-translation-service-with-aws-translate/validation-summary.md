# Validation Summary: How to Build a Translation Service with AWS Translate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Translate
- AWS Lambda
- Amazon API Gateway
- Amazon Comprehend
- Amazon DynamoDB
- Amazon S3
- Amazon CloudWatch
- Python
- Boto3
- Custom terminology
- Batch translation
- Document translation

## Sources Consulted
- AWS Boto3 documentation: TranslateText - https://docs.aws.amazon.com/boto3/latest/reference/services/translate/client/translate_text.html
- AWS Boto3 documentation: ImportTerminology - https://docs.aws.amazon.com/boto3/latest/reference/services/translate/client/import_terminology.html
- AWS Boto3 documentation: TranslateDocument - https://docs.aws.amazon.com/boto3/latest/reference/services/translate/client/translate_document.html
- AWS Botocore documentation: StartTextTranslationJob - https://docs.aws.amazon.com/botocore/latest/reference/services/translate/client/start_text_translation_job.html
- AWS Translate Developer Guide: Creating a custom terminology - https://docs.aws.amazon.com/translate/latest/dg/creating-custom-terminology.html
- AWS Translate pricing - https://aws.amazon.com/translate/pricing/

## Issues Found
- The document translation section claimed synchronous document translation supports Word, PowerPoint, Excel, and HTML. AWS Translate's synchronous `TranslateDocument` API supports plain text, HTML, and DOCX. Updated the wording to list the supported real-time document formats.
- The document translation code used `json.loads` and `json.dumps` without importing `json`. Added the missing import so the snippet is syntactically complete.
- The batch translation IAM role ARN used a 9-digit placeholder account ID. AWS account IDs are 12 digits, so the placeholder was changed to `123456789012`.
- The rate limiting example defined `requests_per_minute` limits but only checked monthly character usage. Added a per-minute usage lookup and update so the code enforces the declared request limit.

## Review Notes
- The AWS Translate API calls and parameter names are current and match the Boto3/Botocore documentation.
- `TranslateDocument` allows `SourceLanguageCode='auto'`, but this requires Amazon Comprehend permissions because Amazon Translate uses Comprehend for source-language detection.
- The DynamoDB examples assume tables with the shown key schema and TTL configured on the `ttl` attribute.
- The pricing statement for standard text and batch translation at $15 per million characters is current as of this review; real-time DOCX document translation is priced differently.
