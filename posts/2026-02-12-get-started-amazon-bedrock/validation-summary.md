# Validation Summary: How to Get Started with Amazon Bedrock

## Status
validated

## Post Type
Tutorial / beginner guide

## Technologies Covered
- Amazon Bedrock
- Amazon Bedrock Runtime
- Amazon Bedrock Converse API and ConverseStream API
- Amazon Bedrock Guardrails
- Amazon Titan Text Embeddings V2
- Anthropic Claude on Amazon Bedrock
- Meta Llama and Amazon Titan/Nova models on Amazon Bedrock
- Python
- Boto3
- NumPy

## Sources Consulted
- Amazon Bedrock User Guide: Request access to models - https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html
- Amazon Bedrock User Guide: Model lifecycle - https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html
- Amazon Bedrock User Guide: Inference using Converse API - https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html
- Boto3 documentation: Bedrock Runtime converse - https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-runtime/client/converse.html
- Boto3 documentation: Bedrock Runtime converse_stream - https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-runtime/client/converse_stream.html
- Boto3 documentation: Bedrock list_foundation_models - https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock/client/list_foundation_models.html
- Botocore documentation: Bedrock create_guardrail - https://docs.aws.amazon.com/botocore/latest/reference/services/bedrock/client/create_guardrail.html
- Amazon Bedrock User Guide: Invoke Amazon Titan Text Embeddings V2 - https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-runtime_example_bedrock-runtime_InvokeModelWithResponseStream_TitanTextEmbeddings_section.html
- Amazon Bedrock model card: Claude Sonnet 4.5 - https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-5.html

## Issues Found
- The setup section said users must request access to each model through the Bedrock console. This is outdated for commercial AWS Regions: model access is enabled by default when the account has the required AWS Marketplace permissions, with an additional first-time use case form for Anthropic models. Updated the setup text to match current AWS documentation.
- The "current model access" code used `list_foundation_models()` and printed `modelLifecycle.status`, which reports whether a model is active or legacy, not whether the account is authorized to use it. Replaced it with `get_foundation_model_availability()` for a third-party model agreement/authorization check.
- The primary examples used `anthropic.claude-3-sonnet-20240229-v1:0`. AWS lists Claude 3 Sonnet as Legacy as of January 30, 2026, with EOL on July 30, 2026. Replaced it with the active Claude Sonnet 4.5 model ID used in AWS Bedrock documentation.
- The feature list implied all Bedrock usage is token-priced and all models can be fine-tuned. Adjusted the wording to say token pricing applies to text models and fine-tuning applies to supported models.
- The cost tracker comment implied a fixed Claude Sonnet price. Updated the comment to state it is an example rate and that current Bedrock pricing should be verified.

## Review Notes
The Python snippets were checked for syntax after edits. The examples still assume valid AWS credentials, required IAM permissions, model availability in the selected Region, and any third-party model prerequisites such as Marketplace permissions and Anthropic first-time use case details.
