# Validation Summary: How to Use Amazon Bedrock Foundation Models (Claude, Titan, Llama)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Bedrock
- Bedrock Runtime Converse API
- Bedrock Runtime InvokeModel API
- Anthropic Claude models on Bedrock
- Amazon Titan Text and Embeddings models
- Meta Llama models on Bedrock
- Cohere Command R+ and Embed models on Bedrock
- AWS CloudWatch metrics
- Python and boto3

## Sources Consulted
- Amazon Bedrock Converse API user guide: https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html
- Amazon Bedrock model lifecycle documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html
- Amazon Bedrock Anthropic model cards: https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards-anthropic.html
- Claude Sonnet 4.6 model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-6.html
- Claude Haiku 4.5 model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html
- Claude Opus 4.7 model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-7.html
- Meta Llama 3 70B Instruct model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-meta-llama-3-70b-instruct.html
- Amazon Titan Text model parameters: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-text.html
- Amazon Titan Text Embeddings documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html
- Amazon Titan Text Embeddings request parameters: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-embed-text.html
- Amazon Titan Multimodal Embeddings request parameters: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-embed-mm.html
- Cohere Command R and Command R+ model parameters: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-cohere-command-r-plus.html
- Cohere Embed v3 model parameters: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed-v3.html
- Amazon Bedrock CloudWatch runtime metrics: https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring-runtime-metrics.html
- Boto3 CloudWatch get_metric_statistics reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch/client/get_metric_statistics.html

## Issues Found
- Replaced legacy/end-of-life Claude 3 model examples with current Claude model IDs. The main Sonnet example, Haiku example, Opus example, benchmark list, model router, and CloudWatch metric dimension now use active Claude Sonnet 4.6, Claude Haiku 4.5, and Claude Opus 4.7 IDs where appropriate.
- Corrected the Titan multimodal embedding snippet. The original code sent only `inputText` to `amazon.titan-embed-image-v1` but labeled the result as an image embedding; the wording and variable names now describe it as a text-only multimodal embedding request.
- Clarified the pricing sample. The original text could be read as current pricing; it now says to check AWS pricing for the current Region and service tier and treats the dictionary as calculator input.
- Fixed the CloudWatch example to pass timezone-aware `datetime` values for `StartTime` and `EndTime` instead of ISO timestamp strings.

## Review Notes
- Python snippets were parsed with `ast.parse` after edits and all code blocks are syntactically valid.
- Some model availability and pricing details vary by AWS Region, account access, inference profile, and service tier, so production code should still confirm model access in the target AWS account and Region.
