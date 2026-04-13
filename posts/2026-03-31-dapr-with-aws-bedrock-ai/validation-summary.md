# Validation Summary: How to Use Dapr with AWS Bedrock for AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Conversation building block)
- AWS Bedrock (foundation model service)
- AWS CLI (Bedrock commands)
- Python (requests, Flask)
- AWS IAM (Bedrock permissions)
- Anthropic Claude 3 Sonnet (via Bedrock)
- Amazon Titan Text Express (via Bedrock)

## Sources Consulted
- Dapr components-contrib GitHub repository — `conversation/aws/bedrock/` directory (https://github.com/dapr/components-contrib/tree/master/conversation/aws/bedrock)
- Dapr Conversation API HTTP endpoint registration — `pkg/api/http/conversation.go` (https://github.com/dapr/dapr/blob/master/pkg/api/http/conversation.go)
- Dapr supported bindings reference (https://docs.dapr.io/reference/components-reference/supported-bindings/) — confirmed no `bindings.aws.bedrock` exists
- Dapr AWS Bedrock conversation component docs (https://docs.dapr.io/reference/components-reference/supported-conversation/aws-bedrock/)
- AWS CLI `list-foundation-models` reference (https://docs.aws.amazon.com/cli/latest/reference/bedrock/list-foundation-models.html)
- AWS Bedrock InvokeModel API reference (https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html)
- AWS Bedrock foundation model ARN format (https://docs.aws.amazon.com/bedrock/latest/APIReference/API_FoundationModelSummary.html)
- AWS Bedrock model IDs documentation (https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html)

## Issues Found

1. **Non-existent component type `bindings.aws.bedrock`**: The original post used `bindings.aws.bedrock` as the Dapr component type. This component does not exist in Dapr. The correct component is `conversation.aws.bedrock`, which is part of Dapr's Conversation building block (introduced in Dapr v1.14). Changed all component YAML configurations to use `type: conversation.aws.bedrock`.

2. **Wrong API endpoint and request format**: The original post used the Dapr bindings API endpoint (`/v1.0/bindings/bedrock-binding`) with a binding-style request body (`operation`, `data` fields). The correct endpoint is `/v1.0-alpha1/conversation/{name}/converse` with a conversation-style request body (`inputs` array with `content` and `role` fields). Updated all Python code to use the correct endpoint and request/response format.

3. **Incorrect response parsing**: The original code parsed the response as if it came from the Anthropic API directly (`result.get("content", [{}])[0].get("text", "")`). The Dapr Conversation API returns responses in its own format (`outputs[0].result`). Updated response parsing accordingly.

4. **Fabricated embeddings section**: The original post included a section on using Amazon Titan for embeddings via Dapr. The Dapr Conversation component does not support embeddings — it only supports text generation/chat via the `Converse` operation. Replaced the embeddings section with a text generation example using Amazon Titan Text Express (`amazon.titan-text-express-v1`), demonstrating how to configure a second conversation component with a different model.

5. **Updated IAM policy resource ARN**: Changed the Titan model ARN from `amazon.titan-embed-text-v1` to `amazon.titan-text-express-v1` to match the corrected section.

6. **Removed unused import**: Removed `import json` from the first Python code block since `json.dumps` is no longer needed with the Conversation API request format.

7. **Updated tags and description**: Changed "Binding" tag to "Conversation" and updated the description to reference the conversation component instead of output bindings.

## Review Notes
- The Dapr Conversation API is still in alpha (`v1.0-alpha1`). The API path and request/response format may change in future Dapr releases. An `alpha2` version with richer message types and tool calling support also exists.
- The `--by-output-modality TEXT` flag on the AWS CLI command is correct and valid.
- All AWS model IDs (`anthropic.claude-3-sonnet-20240229-v1:0`, `amazon.titan-text-express-v1`) and ARN formats are valid.
- The IAM actions (`bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`) are correct. The double colon `::` in the foundation model ARN (omitting account ID) is intentional and correct for AWS-managed foundation models.
