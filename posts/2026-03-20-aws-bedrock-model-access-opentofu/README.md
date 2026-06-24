# How to Create AWS Bedrock Model Access with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Bedrock, Generative AI, LLM, Infrastructure as Code

Description: Learn how to configure AWS Bedrock model access, knowledge bases, and guardrails for generative AI applications using OpenTofu.

## Introduction

AWS Bedrock is a fully managed service for accessing foundation models from Amazon, Anthropic, Meta, and others. OpenTofu manages Bedrock knowledge bases, guardrails, and IAM policies for your AI applications, while third-party model subscriptions and Anthropic first-time-use requirements are handled through Amazon Bedrock and AWS Marketplace.

## IAM Policy for Bedrock Access

```hcl
resource "aws_iam_policy" "bedrock_access" {
  name        = "${var.app_name}-bedrock-access"
  description = "Policy for accessing Bedrock foundation models"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
        Resource = [
          "arn:aws:bedrock:${var.region}::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
          "arn:aws:bedrock:${var.region}::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
          "arn:aws:bedrock:${var.region}::foundation-model/amazon.titan-embed-text-v1"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:ListFoundationModels", "bedrock:GetFoundationModel"]
        Resource = "*"
      }
    ]
  })
}
```

## Knowledge Base with OpenSearch

```hcl
resource "aws_bedrockagent_knowledge_base" "docs" {
  name     = "${var.app_name}-knowledge-base"
  role_arn = aws_iam_role.bedrock_kb.arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:aws:bedrock:${var.region}::foundation-model/amazon.titan-embed-text-v1"
    }
  }

  storage_configuration {
    type = "OPENSEARCH_SERVERLESS"
    opensearch_serverless_configuration {
      collection_arn    = aws_opensearchserverless_collection.kb.arn
      vector_index_name = "bedrock-knowledge-base-index"

      field_mapping {
        vector_field    = "bedrock-knowledge-base-default-vector"
        text_field      = "AMAZON_BEDROCK_TEXT_CHUNK"
        metadata_field  = "AMAZON_BEDROCK_METADATA"
      }
    }
  }
}
```

## Bedrock Guardrail

```hcl
resource "aws_bedrock_guardrail" "content_filter" {
  name                      = "${var.app_name}-guardrail"
  description               = "Content filtering for AI responses"
  blocked_input_messaging   = "I cannot process this request due to content policy."
  blocked_outputs_messaging = "I cannot provide this information due to content policy."

  content_policy_config {
    filters_config {
      type            = "SEXUAL"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "VIOLENCE"
      input_strength  = "MEDIUM"
      output_strength = "HIGH"
    }
    filters_config {
      type            = "HATE"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }
  }

  sensitive_information_policy_config {
    pii_entities_config {
      type   = "EMAIL"
      action = "ANONYMIZE"
    }
    pii_entities_config {
      type   = "PHONE"
      action = "ANONYMIZE"
    }
  }
}
```

## Lambda Application Using Bedrock

```hcl
resource "aws_lambda_function" "ai_assistant" {
  function_name = "${var.app_name}-ai-assistant"
  runtime       = "python3.12"
  handler       = "main.handler"
  role          = aws_iam_role.lambda_bedrock.arn
  filename      = "ai_assistant.zip"

  environment {
    variables = {
      BEDROCK_REGION   = var.region
      GUARDRAIL_ID     = aws_bedrock_guardrail.content_filter.guardrail_id
      GUARDRAIL_VERSION = aws_bedrock_guardrail.content_filter.version
      MODEL_ID         = "anthropic.claude-sonnet-4-5-20250929-v1:0"
    }
  }
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

AWS Bedrock provides access to powerful foundation models for generative AI. OpenTofu manages the IAM policies, knowledge bases, guardrails, and application infrastructure that consume Bedrock, while model subscriptions and Anthropic first-time-use requirements are handled outside OpenTofu - enabling reproducible AI application deployments around Bedrock.
