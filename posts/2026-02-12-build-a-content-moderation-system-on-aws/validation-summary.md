# Validation Summary: How to Build a Content Moderation System on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon Rekognition
- Amazon Comprehend
- Amazon SQS
- Amazon DynamoDB
- Amazon API Gateway
- Python / boto3
- Mermaid architecture diagrams

## Sources Consulted
- Amazon Rekognition DetectModerationLabels API: https://docs.aws.amazon.com/rekognition/latest/APIReference/API_DetectModerationLabels.html
- Amazon Rekognition image and video moderation APIs: https://docs.aws.amazon.com/rekognition/latest/dg/moderation-api.html
- Amazon Comprehend DetectToxicContent SDK reference: https://docs.aws.amazon.com/botocore/latest/reference/services/comprehend/client/detect_toxic_content.html
- Amazon Comprehend DetectSentiment API: https://docs.aws.amazon.com/comprehend/latest/APIReference/API_DetectSentiment.html
- Amazon Comprehend trust and safety / toxicity detection guide: https://docs.aws.amazon.com/comprehend/latest/dg/trust-safety.html
- Amazon SQS receive_message SDK reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs/client/receive_message.html
- Python 3.12 datetime deprecations: https://docs.python.org/3.12/whatsnew/3.12.html
- OneUptime linked blog page: https://oneuptime.com/blog/post/2026-02-12-build-a-sentiment-analysis-dashboard-on-aws/view

## Issues Found
- The description claimed the workflow used Step Functions, but the implementation uses SQS for the human review queue. Updated the description to reference SQS.
- The architecture diagram included a video path, while the router example only supports image and text submissions. Removed the video path from the diagram and updated the router comment.
- The Comprehend toxicity example sent one `TextSegments` item containing up to 10,000 characters, but `DetectToxicContent` limits each segment to 1 KB and allows up to 10 segments. Added byte-aware splitting into up to 10 segments.
- The sentiment example used character slicing for a 5 KB API limit. Added UTF-8 byte-aware truncation before calling `DetectSentiment`.
- The Lambda examples used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with timezone-aware `datetime.now(timezone.utc).isoformat()`.

## Review Notes
The examples are suitable as tutorial snippets, but a production implementation should add IAM policy examples, payload validation, pagination for DynamoDB violation queries, SQS visibility timeout handling for review workflows, and explicit error handling for AWS SDK exceptions.
