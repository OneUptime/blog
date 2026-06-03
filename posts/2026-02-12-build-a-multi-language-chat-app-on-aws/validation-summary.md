# Validation Summary: How to Build a Multi-Language Chat App on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS API Gateway WebSocket APIs
- AWS Lambda
- Amazon DynamoDB
- Amazon Translate
- Amazon Comprehend
- API Gateway Management API
- AWS CloudFormation/SAM
- Python with Boto3
- JavaScript WebSocket client API

## Sources Consulted
- AWS API Gateway WebSocket routes documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-develop-routes.html
- AWS CloudFormation `AWS::ApiGatewayV2::Api` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-api.html
- AWS API Gateway WebSocket quotas: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-execution-service-websocket-limits-table.html
- Boto3 Amazon Translate `translate_text` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/translate/client/translate_text.html
- Amazon Translate pricing: https://aws.amazon.com/translate/pricing/
- Boto3 DynamoDB `Table.scan` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/scan.html
- Boto3 API Gateway Management API `post_to_connection` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/apigatewaymanagementapi/client/post_to_connection.html
- Boto3 Amazon Comprehend `detect_dominant_language` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/comprehend/client/detect_dominant_language.html

## Issues Found
- The send-message Lambda claimed to store messages in DynamoDB but never called `messages_table.put_item`. Added a message-history write using the existing `roomId` and numeric `timestamp` table schema.
- The DynamoDB scan example claimed to retrieve all room connections but only read the first scan page. Added `LastEvaluatedKey` pagination so the example handles tables over DynamoDB's single-scan response page limit.
- The caching snippet used `time.time()` without importing `time`. Added the missing import.
- The Comprehend example used `boto3.client('comprehend')` without importing `boto3` and did not mention the 20-character minimum input size. Added the import, a short-message fallback, and clarified the limitation in the surrounding text.
- The Amazon Translate cost estimate was incorrect. At $15 per million characters, one million 100-character messages is 100 million translated characters, or about $1,500 for one target-language translation per message. Updated the calculation and noted that actual cost scales with target languages and cache hit rate.
- The scaling section described Amazon Translate's `TranslateText` limit as 10,000 characters. The documented limit is 10,000 bytes, which can be fewer than 10,000 characters depending on encoding. Updated the wording.

## Review Notes
- The WebSocket API snippet defines the API resource and route selection expression, but not the route and integration resources for `$connect`, `$disconnect`, and `sendMessage`. This is acceptable as a short excerpt, but a complete deployable template would need those resources.
- The article correctly notes that scanning the connections table becomes expensive at scale and recommends a GSI on `roomId`; the sample remains simple but now paginates correctly.
