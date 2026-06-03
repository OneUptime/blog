# Validation Summary: How to Use Amazon Translate for Text Translation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS
- Amazon Translate
- Amazon Comprehend language detection
- Boto3 for Python
- Amazon S3
- Amazon DynamoDB
- Custom terminology
- Parallel data
- Asynchronous batch translation
- Real-time document translation

## Sources Consulted
- Amazon Translate Boto3 `translate_text` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/translate/client/translate_text.html
- Amazon Translate Boto3 `import_terminology` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/translate/client/import_terminology.html
- Amazon Translate Boto3 `create_parallel_data` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/translate/client/create_parallel_data.html
- Amazon Translate API `StartTextTranslationJob` documentation: https://docs.aws.amazon.com/translate/latest/APIReference/API_StartTextTranslationJob.html
- Amazon Translate API `InputDataConfig` documentation: https://docs.aws.amazon.com/translate/latest/APIReference/API_InputDataConfig.html
- Amazon Translate Boto3 `translate_document` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/translate/client/translate_document.html
- Amazon Translate supported languages documentation: https://docs.aws.amazon.com/translate/latest/dg/what-is-languages.html
- Amazon Translate custom terminology documentation: https://docs.aws.amazon.com/translate/latest/dg/creating-custom-terminology.html
- Amazon Translate parallel data input files documentation: https://docs.aws.amazon.com/translate/latest/dg/customizing-translations-parallel-data-input-files.html
- Amazon Translate real-time translation API documentation: https://docs.aws.amazon.com/translate/latest/dg/sync-api.html
- Amazon Translate do-not-translate tags documentation: https://docs.aws.amazon.com/translate/latest/dg/customizing-translations-tags.html
- Referenced OneUptime Amazon Comprehend post: https://oneuptime.com/blog/post/2026-02-12-amazon-comprehend-text-analysis/view

## Issues Found
- Clarified that `SourceLanguageCode='auto'` calls Amazon Comprehend and requires a region where Comprehend supports language detection.
- Updated the custom terminology helper to accept a single terminology name, because Amazon Translate supports only one custom terminology resource per `TranslateText` request.
- Updated the batch translation helper to accept a single terminology name, because `StartTextTranslationJob` accepts only one custom terminology resource.
- Fixed the multilingual application cache key to include the terminology name so translations generated with different terminology resources do not collide in the cache.
- Replaced the HTML example's `translate_text` call with `translate_document` using `ContentType='text/html'`, which is the documented API for preserving HTML document format in synchronous document translation.

## Review Notes
The examples are illustrative and still require real AWS resources, IAM permissions, S3 buckets, and a DynamoDB table to run. Parallel data is created in the article but not applied to a batch job; applying it would use `ParallelDataNames` and creates an Active Custom Translation job with separate pricing.
