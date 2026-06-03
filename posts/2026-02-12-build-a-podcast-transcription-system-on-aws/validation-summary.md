# Validation Summary: How to Build a Podcast Transcription System on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Transcribe
- AWS Lambda
- Amazon S3
- Amazon DynamoDB
- AWS CloudFormation
- Python
- Boto3
- SRT subtitles

## Sources Consulted
- Amazon Transcribe StartTranscriptionJob API: https://docs.aws.amazon.com/transcribe/latest/APIReference/API_StartTranscriptionJob.html
- Boto3 Transcribe start_transcription_job reference: https://docs.aws.amazon.com/boto3/latest/reference/services/transcribe/client/start_transcription_job.html
- Amazon Transcribe data input and output: https://docs.aws.amazon.com/transcribe/latest/dg/how-input.html
- Amazon Transcribe speaker diarization: https://docs.aws.amazon.com/transcribe/latest/dg/diarization.html
- Amazon Transcribe custom vocabulary table format: https://docs.aws.amazon.com/transcribe/latest/dg/custom-vocabulary-create-table.html
- Amazon Transcribe custom vocabulary list format: https://docs.aws.amazon.com/transcribe/latest/dg/custom-vocabulary-create-list.html
- Amazon Transcribe CreateVocabulary API: https://docs.aws.amazon.com/transcribe/latest/APIReference/API_CreateVocabulary.html
- AWS CloudFormation S3 NotificationConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-notificationconfiguration.html
- AWS CloudFormation S3 LambdaConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-lambdaconfiguration.html
- AWS CloudFormation AWS::Lambda::Permission: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html
- Boto3 DynamoDB scan reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/client/scan.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Amazon Transcribe pricing: https://aws.amazon.com/transcribe/pricing/

## Issues Found
- The architecture diagram showed OpenSearch full-text search, but the post only implements a DynamoDB-backed search API. Updated the diagram to match the implementation.
- The CloudFormation snippet referenced an undefined `TranscribeTriggerLambda` and omitted the Lambda resource permission required for S3 event notifications. Replaced the undefined reference with a Lambda ARN parameter and added `AWS::Lambda::Permission`.
- The transcription job Lambda used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(UTC)`.
- The transcription job Lambda could create invalid Transcribe job names from filenames with spaces or special characters. Added filename sanitization.
- The media format mapping omitted some supported batch formats and silently defaulted unknown extensions to `mp3`. Added supported mappings and explicit rejection for unsupported formats.
- The custom vocabulary example built `SoundsLike` data but then ignored it by calling `create_vocabulary` with `Phrases`. Updated the example to use the preferred table format with `VocabularyFileUri`.
- The custom vocabulary example implied `SoundsLike` is still useful. Updated the code comments because Amazon Transcribe no longer supports `SoundsLike` or `IPA` values for custom vocabulary.
- The transcription job did not apply the custom vocabulary it created. Added `VocabularyName` to the Transcribe job `Settings`.
- The post-processing Lambda used `datetime.utcnow()` without importing `datetime`. Imported `datetime` and switched to `datetime.now(UTC)`.
- Speaker segment extraction expected `alternatives` inside `speaker_labels.segments[].items`, but Amazon Transcribe speaker-label items contain timing and speaker labels, while word content is in `results.items`. Added a timestamp-based lookup from `results.items`.
- SRT time formatting used `timedelta.seconds`, which wraps after 24 hours. Switched to `total_seconds()`.
- The DynamoDB search projected away `fullText`, so result context would always be empty. Added `fullText` to the projection.
- The DynamoDB search lowercased the query but filtered against mixed-case `fullText`, making search unintentionally case-sensitive. Added `fullTextLower` during indexing and filtered against it.

## Review Notes
- The DynamoDB scan search works for a small tutorial example, but a production catalog should paginate scan results and use OpenSearch or another search service for scalable full-text search.
- With `RedactionOutput` set to `redacted_and_unredacted`, Amazon Transcribe creates two transcript files. A production post-processor should decide whether to process only the redacted file, only the unredacted file, or both.
