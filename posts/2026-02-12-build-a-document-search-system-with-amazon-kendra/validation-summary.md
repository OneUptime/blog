# Validation Summary: How to Build a Document Search System with Amazon Kendra

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Kendra
- AWS CloudFormation
- AWS Lambda
- Amazon API Gateway
- Amazon S3
- Amazon DynamoDB
- Amazon CloudWatch
- Python
- Boto3

## Sources Consulted
- AWS CloudFormation Template Reference: AWS::Kendra::Index: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-kendra-index.html
- AWS CloudFormation Template Reference: AWS::Kendra::Index DocumentMetadataConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-kendra-index-documentmetadataconfiguration.html
- Boto3 documentation: Kendra create_data_source: https://docs.aws.amazon.com/boto3/latest/reference/services/kendra/client/create_data_source.html
- Boto3 documentation: Kendra query: https://docs.aws.amazon.com/boto3/latest/reference/services/kendra/client/query.html
- AWS Kendra Developer Guide: Data source template schemas: https://docs.aws.amazon.com/kendra/latest/dg/ds-schemas.html
- AWS Kendra Developer Guide: Amazon S3 document metadata: https://docs.aws.amazon.com/kendra/latest/dg/s3-metadata.html
- AWS Kendra Developer Guide: Query responses and response types: https://docs.aws.amazon.com/kendra/latest/dg/query-responses-types.html
- AWS Kendra Developer Guide: Adding frequently asked questions to an index: https://docs.aws.amazon.com/kendra/latest/dg/in-creating-faq.html
- Boto3 documentation: Kendra create_faq: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/kendra/client/create_faq.html
- AWS Kendra Developer Guide: Submitting feedback for incremental learning: https://docs.aws.amazon.com/kendra/latest/dg/submitting-feedback.html
- AWS Kendra pricing: https://aws.amazon.com/kendra/pricing/

## Issues Found
- The CloudFormation index example used `ENTERPRISE_EDITION` as the default and only mentioned Developer Edition. Updated it to use the current `GEN_AI_ENTERPRISE_EDITION` value and list the other valid editions.
- The S3 connector example used the older `S3Configuration` object. Updated it to create an upgraded S3 connector with `Type='TEMPLATE'` and `TemplateConfiguration`, including `metadataFilesPrefix` and `inclusionPrefixes`.
- The search Lambda parsed `ANSWER` and `QUESTION_ANSWER` fields as if `AnswerText` and `QuestionText` were top-level Boto3 result keys. Added a helper to read those values from Kendra `AdditionalAttributes`, with sensible fallbacks to excerpts and titles.
- The search Lambda tried to return facets but did not request any facets from Kendra. Added `Facets` for `department` and `document_type`.
- The highlight output placed the boolean `TopAnswer` value in a field named `text`. Changed highlight objects to return offsets, `topAnswer`, and highlight `type`.
- The cost section omitted the current GenAI Enterprise Edition price tier and framed Developer/Enterprise as the only starting points. Updated the pricing summary to reflect GenAI Enterprise, Basic Developer, and Basic Enterprise base pricing before add-ons.
- The final paragraph implied ranking improves merely as queries flow through the system. Updated it to specify that ranking improves when click and relevance feedback is submitted.

## Review Notes
Python code snippets were syntax-checked with `python3` and all parsed successfully. The examples still use placeholder ARNs, bucket names, table names, and index IDs, so they require real AWS resources and IAM permissions before deployment.
