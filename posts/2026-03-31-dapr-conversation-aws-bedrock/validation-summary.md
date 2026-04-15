# Validation Summary: How to Configure Dapr Conversation with AWS Bedrock

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha1)
- AWS Bedrock (foundation model access)
- Anthropic Claude, Amazon Titan, Meta Llama, Mistral models
- Kubernetes (secrets, EKS, IRSA)
- AWS IAM policies
- Node.js / Express

## Sources Consulted
- Dapr components-contrib source code (`conversation/aws/bedrock/bedrock.go`, `metadata.yaml`) on GitHub
- Dapr runtime source code (`cmd/daprd/components/conversation_aws_bedrock.go`) for component registration
- Dapr HTTP API handler (`pkg/api/http/conversation.go`) for endpoint routing
- Dapr proto definitions (`ConversationInput`, `ConversationRequest`, `ConversationResult`) for request/response format
- Dapr integration tests (`tests/integration/suite/daprd/conversation/alpha1/http/basic.go`) for confirmed request/response shapes
- Dapr official documentation: https://docs.dapr.io/reference/components-reference/supported-conversation/
- AWS Bedrock documentation for model IDs and IAM actions
- AWS Service Authorization Reference for `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream`

## Issues Found

1. **`message` field should be `content` in conversation inputs (curl example and JavaScript code).**
   The Dapr Conversation alpha1 proto defines `ConversationInput` with a `content` field, not `message`. The blog used `"message"` in both the curl command and the Express.js code example. Changed `message` to `content` in both locations.

2. **`temperature` should be a top-level request field, not nested inside `parameters`.**
   The Dapr proto defines `temperature` as an `optional double` at the root of `ConversationRequest`, not inside the `parameters` map. Moved `temperature` to the top level of the request body in both the curl and JavaScript examples.

3. **`max_tokens` does not exist in the Dapr Conversation alpha1 API.**
   There is no `max_tokens` or `maxTokens` field in the `ConversationRequest` proto. The blog incorrectly included it inside a `parameters` object. Removed `max_tokens` from both examples.

## Review Notes
- The `cacheTTL` metadata field used in the component YAML works due to an alias (`mapstructurealiases:"cacheTTL"`), but the canonical/primary field name is `responseCacheTTL`. This is not incorrect but worth noting for precision.
- The alpha1 conversation API (`/v1.0-alpha1/`) is marked as deprecated in the Dapr proto definitions. An alpha2 API exists with a different request/response format. A future revision of this post may want to cover the alpha2 API.
- The model ID `anthropic.claude-3-5-sonnet-20241022-v2:0` is valid but may require use of a cross-region inference profile (e.g., `us.anthropic.claude-3-5-sonnet-20241022-v2:0`) for on-demand invocation depending on AWS region configuration.
- The component type `conversation.aws.bedrock`, metadata field names (`model`, `region`, `accessKey`, `secretKey`), API endpoint path, IAM actions, and ARN format are all correct.
