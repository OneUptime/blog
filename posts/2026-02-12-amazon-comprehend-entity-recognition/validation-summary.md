# Validation Summary: How to Use Amazon Comprehend for Entity Recognition

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Comprehend
- AWS SDK for Python (Boto3)
- Named entity recognition
- PII entity detection
- Amazon S3 asynchronous Comprehend jobs
- Amazon DynamoDB
- Python

## Sources Consulted
- Amazon Comprehend Developer Guide: Entities - https://docs.aws.amazon.com/comprehend/latest/dg/how-entities.html
- Amazon Comprehend API Reference: DetectEntities - https://docs.aws.amazon.com/comprehend/latest/APIReference/API_DetectEntities.html
- Boto3 documentation: comprehend.detect_entities - https://docs.aws.amazon.com/boto3/latest/reference/services/comprehend/client/detect_entities.html
- Amazon Comprehend API Reference: BatchDetectEntities - https://docs.aws.amazon.com/comprehend/latest/APIReference/API_BatchDetectEntities.html
- AWS CLI documentation: detect-pii-entities - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/comprehend/detect-pii-entities.html
- AWS CLI documentation: start-entities-detection-job - https://docs.aws.amazon.com/cli/latest/reference/comprehend/start-entities-detection-job.html
- Amazon Comprehend Developer Guide: Custom entity recognition - https://docs.aws.amazon.com/comprehend/latest/dg/custom-entity-recognition.html

## Issues Found
- The production pipeline described a 5000 byte limit for `detect_entities`. Current AWS documentation states that the real-time `Text` parameter supports a maximum string size of 100 KB. Updated the comment, default chunk size, and call site to use 100000 bytes.
- The chunking helper used byte offsets as Python string offsets when adjusting entity positions. This would produce incorrect offsets for text containing multi-byte UTF-8 characters. Reworked the helper to keep offsets in Python character positions while still enforcing the byte-size limit.
- The chunking helper could split in the middle of a UTF-8 byte sequence and decode with `errors='ignore'`, which could silently drop characters. Reworked chunking to build chunks by complete Python characters and measure each character's UTF-8 byte length.
- The introduction said the post would walk through both built-in and custom recognizer approaches, but the post only demonstrates the built-in entity APIs. Changed the wording to "core APIs."
- The custom entity paragraph linked to a custom classification guide even though custom classification does not train entity recognizers. Updated the link to the official Amazon Comprehend custom entity recognition documentation.

## Review Notes
- Python code blocks were parsed with `ast.parse` and are syntactically valid.
- The `batch_detect_entities` limit of 25 documents per request is correct, and AWS documentation also notes a 5 KB maximum per document for this batch API.
- PII entity examples use valid entity type names such as `EMAIL` and `PHONE`.
- `StartEntitiesDetectionJob` parameters, including `InputFormat='ONE_DOC_PER_LINE'`, `DataAccessRoleArn`, `LanguageCode`, and `JobName`, match the documented API shape.
