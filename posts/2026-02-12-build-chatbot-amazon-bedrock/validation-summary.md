# Validation Summary: How to Build a Chatbot with Amazon Bedrock

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Bedrock
- Anthropic Claude on Amazon Bedrock
- AWS SDK for Python (Boto3)
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon Bedrock Knowledge Bases
- JavaScript Fetch API

## Sources Consulted
- Amazon Bedrock Anthropic Claude Messages API request and response documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages-request-response.html
- Amazon Bedrock InvokeModel Anthropic Claude examples: https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-runtime_example_bedrock-runtime_InvokeModel_AnthropicClaude_section.html
- Amazon Bedrock InvokeModelWithResponseStream Anthropic Claude examples: https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-runtime_example_bedrock-runtime_InvokeModelWithResponseStream_AnthropicClaude_section.html
- Amazon Bedrock model lifecycle documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html
- Amazon Bedrock Claude Sonnet 4.5 model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-5.html
- Boto3 Bedrock Agent Runtime retrieve API reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-agent-runtime/client/retrieve.html
- Boto3 DynamoDB update_time_to_live API reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/update_time_to_live.html
- Amazon DynamoDB TTL guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-how-to.html
- Amazon API Gateway Lambda proxy integration response format: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html

## Issues Found
- The post used `anthropic.claude-3-sonnet-20240229-v1:0`, which Amazon Bedrock now lists as a Legacy model. Updated the examples to use the active Claude Sonnet 4.5 model ID `anthropic.claude-sonnet-4-5-20250929-v1:0`.
- The DynamoDB examples wrote a `ttl` attribute but did not enable TTL on the table. Added `update_time_to_live` after waiting for table creation, and adjusted the comment to say items are eligible for expiration after 24 hours.
- The Lambda function used `body.get('session_id', str(uuid.uuid4()))`, which does not generate a new ID when the frontend sends `session_id: null`. Changed it to `body.get('session_id') or str(uuid.uuid4())`.
- The knowledge base chat function returned the assistant response without saving it to conversation history. Added the assistant message append and `save_conversation` call.
- The frontend usage example used top-level `await`, which is not valid in a classic browser script. Wrapped the usage example in an async function.

## Review Notes
- The Python snippets were checked with `python3 -m py_compile`, and the JavaScript snippet was checked with `node --check`.
- The Lambda example is still intentionally minimal. A production API should also handle OPTIONS preflight and include consistent CORS headers on error responses.
