# Validation Summary: How to Create AWS Bedrock Model Access with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS IAM
- Amazon Bedrock
- Amazon Bedrock Knowledge Bases
- Amazon Bedrock Guardrails
- AWS Lambda
- Amazon OpenSearch Serverless

## Sources Consulted
- Amazon Bedrock model access: https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html
- Amazon Bedrock service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonbedrock.html
- Amazon Bedrock InvokeModel API: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html
- Amazon Bedrock guardrail components: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-components.html
- Amazon Bedrock model lifecycle: https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html
- Amazon Titan text embeddings: https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply/
- Terraform AWS Provider `aws_bedrock_guardrail`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/bedrock_guardrail.html.markdown
- Terraform AWS Provider `aws_bedrock_guardrail_version`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/bedrock_guardrail_version.html.markdown
- Terraform AWS Provider `aws_bedrockagent_knowledge_base`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/bedrockagent_knowledge_base.html.markdown
- Terraform AWS Provider `aws_lambda_function`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown

## Issues Found
- The description, introduction, and summary implied Bedrock model access requires manual console approval. I corrected that because current AWS documentation says access in commercial AWS Regions is enabled by default when AWS Marketplace prerequisites are satisfied, while Anthropic models still require first-time-use details.
- The Lambda example only exported `GUARDRAIL_ID`. I added `GUARDRAIL_VERSION` because Bedrock runtime requests require both the guardrail identifier and the guardrail version when a guardrail is supplied.
- The IAM policy and Lambda examples referenced Anthropic Claude 3 Sonnet and Claude 3 Haiku model IDs that AWS now lists as legacy. I updated the examples to active Claude Sonnet 4.5 and Claude Haiku 4.5 model IDs.

## Review Notes
- The knowledge base example still uses `amazon.titan-embed-text-v1`, which remains supported, but AWS also documents `amazon.titan-embed-text-v2:0` as the newer Titan text embedding model.
- The post now exports the guardrail resource's `version` attribute, which is valid for invoking the draft guardrail. For production deployments, the AWS provider also supports `aws_bedrock_guardrail_version` if you want to pin a numbered guardrail version explicitly.
