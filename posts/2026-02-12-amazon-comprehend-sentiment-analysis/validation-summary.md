# Validation Summary: How to Use Amazon Comprehend for Sentiment Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS
- Amazon Comprehend
- Amazon Comprehend sentiment analysis
- Amazon Comprehend targeted sentiment
- Boto3 for Python
- Amazon S3 asynchronous analysis jobs

## Sources Consulted
- Amazon Comprehend API Reference: DetectSentiment - https://docs.aws.amazon.com/comprehend/latest/APIReference/API_DetectSentiment.html
- Boto3 documentation: detect_sentiment - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/comprehend/client/detect_sentiment.html
- AWS CLI Command Reference: batch-detect-sentiment - https://docs.aws.amazon.com/cli/latest/reference/comprehend/batch-detect-sentiment.html
- Amazon Comprehend Developer Guide: Supported languages - https://docs.aws.amazon.com/comprehend/latest/dg/supported-languages.html
- Amazon Comprehend Developer Guide: Sentiment - https://docs.aws.amazon.com/comprehend/latest/dg/how-sentiment.html
- Amazon Comprehend Developer Guide: Targeted sentiment - https://docs.aws.amazon.com/comprehend/latest/dg/how-targeted-sentiment.html
- Amazon Comprehend API Reference: DetectTargetedSentiment - https://docs.aws.amazon.com/comprehend/latest/APIReference/API_DetectTargetedSentiment.html
- AWS CLI Command Reference: start-sentiment-detection-job - https://docs.aws.amazon.com/cli/latest/reference/comprehend/start-sentiment-detection-job.html

## Issues Found
- The post said Comprehend sentiment models work across "dozens of languages." Amazon Comprehend sentiment supports the service's listed primary languages, currently 12 language codes. Changed the wording to "the primary languages supported by Amazon Comprehend."
- The trend aggregation example used `enumerate(sentiments)` to look up dates, which could misalign feedback dates if `BatchDetectSentiment` returns errors for some documents. Changed the lookup to use each result's original `index`.
- The real-time example used `message[:5000]`, which slices Python characters rather than UTF-8 bytes. Changed it to trim the UTF-8 encoded text before decoding it back to a string.
- The targeted sentiment helper accepted an arbitrary language parameter, but Amazon Comprehend targeted sentiment currently supports English. Added a note and changed the helper to use `LanguageCode='en'`.
- The tips section said Comprehend truncates input longer than 5,000 bytes. Official API documentation says oversized input raises `TextSizeLimitExceededException`. Changed the wording to say synchronous input must stay under the 5 KB API limit and oversized input returns a text-size error.

## Review Notes
The Boto3 method names and request/response fields for `detect_sentiment`, `batch_detect_sentiment`, `detect_targeted_sentiment`, `start_sentiment_detection_job`, and `describe_sentiment_detection_job` are current and match AWS documentation. All Python snippets compile with `python3`; runtime execution still requires configured AWS credentials, IAM permissions, valid S3 URIs for asynchronous jobs, and the `boto3` package.
