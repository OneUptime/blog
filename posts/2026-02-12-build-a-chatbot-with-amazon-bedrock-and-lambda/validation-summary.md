# Validation Summary: How to Build a Chatbot with Amazon Bedrock and Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Bedrock
- Anthropic Claude on Amazon Bedrock
- Amazon Bedrock Guardrails
- AWS Lambda
- Amazon API Gateway WebSocket APIs
- API Gateway Management API
- Amazon DynamoDB
- AWS CloudFormation
- Python
- Boto3

## Sources Consulted
- Amazon Bedrock User Guide: Model lifecycle: https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html
- Amazon Bedrock User Guide: Claude Sonnet 4.5 model card and model ID: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-5.html
- Amazon Bedrock User Guide: Anthropic Claude Messages API: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html
- Amazon Bedrock User Guide: Anthropic Claude Messages API request and response: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages-request-response.html
- Amazon Bedrock User Guide: InvokeModelWithResponseStream examples for Anthropic Claude: https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-runtime_example_bedrock-runtime_InvokeModelWithResponseStream_AnthropicClaude_section.html
- Boto3 documentation: Bedrock Runtime apply_guardrail: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-runtime/client/apply_guardrail.html
- Boto3 documentation: Bedrock create_guardrail: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock/client/create_guardrail.html
- Amazon Bedrock API Reference: GuardrailTopicConfig: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_GuardrailTopicConfig.html
- AWS CloudFormation: AWS::DynamoDB::Table: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html
- AWS CloudFormation: DynamoDB GlobalSecondaryIndex: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-dynamodb-table-globalsecondaryindex.html
- Amazon DynamoDB Developer Guide: Global secondary indexes and projections: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- Boto3 documentation: API Gateway Management API: https://docs.aws.amazon.com/boto3/latest/reference/services/apigatewaymanagementapi.html
- Boto3 documentation: post_to_connection: https://docs.aws.amazon.com/boto3/latest/reference/services/apigatewaymanagementapi/client/post_to_connection.html

## Issues Found
- The examples used `anthropic.claude-3-sonnet-20240229-v1:0` as the default model ID. Amazon Bedrock now lists Claude 3 Sonnet as a Legacy model with an EOL date of July 30, 2026, so the post should not use it as the default for new tutorial code. Replaced it with the active Claude Sonnet 4.5 model ID `anthropic.claude-sonnet-4-5-20250929-v1:0`.
- The DynamoDB `UserIndex` was queried with `ScanIndexForward=False` and described as "Most recent first", but the GSI only had `userId` as its key. DynamoDB can only apply sort ordering to a sort key, so added `updatedAt` as a string range key in the GSI and added it to `AttributeDefinitions`.
- The Python handler used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware `datetime.now(timezone.utc).isoformat()` calls.
- The text said each message includes the full conversation history, but the code trims the request to the last 20 messages. Updated the explanation to say the request includes recent conversation history.
- The streaming section said responses stream "token by token". Bedrock streaming events expose response chunks/content deltas, not a guaranteed one-token granularity, so updated the wording to "chunk by chunk".

## Review Notes
The streaming snippet intentionally references helper functions from the previous handler (`load_conversation`, message formatting, and saving messages) rather than repeating all code. Production code should also add pagination for conversation listing, handle stale WebSocket connections such as `GoneException`, validate caller ownership when loading conversations, and wire guardrail checks directly into the main handler path.
