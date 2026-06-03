# Validation Summary: How to Use Amazon Bedrock Agents for Task Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Bedrock Agents
- Amazon Bedrock Knowledge Bases
- Amazon Bedrock Guardrails
- AWS SDK for Python (boto3)
- AWS Lambda
- IAM
- OpenAPI 3.0

## Sources Consulted
- Amazon Bedrock API Reference: CreateAgent: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_CreateAgent.html
- Boto3 documentation: create_agent_action_group: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agent/client/create_agent_action_group.html
- Boto3 documentation: associate_agent_knowledge_base: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agent/client/associate_agent_knowledge_base.html
- Boto3 documentation: prepare_agent: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agent/client/prepare_agent.html
- Boto3 documentation: create_agent_alias: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agent/client/create_agent_alias.html
- Boto3 documentation: invoke_agent: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agent-runtime/client/invoke_agent.html
- Amazon Bedrock User Guide: Define OpenAPI schemas for your agent's action groups: https://docs.aws.amazon.com/bedrock/latest/userguide/agents-api-schema.html
- Amazon Bedrock User Guide: Configure Lambda functions for action groups: https://docs.aws.amazon.com/bedrock/latest/userguide/agents-lambda.html
- Amazon Bedrock User Guide: Invoke an agent from your application: https://docs.aws.amazon.com/bedrock/latest/userguide/agents-invoke-agent.html

## Issues Found
- The OpenAPI schema used `summary` but omitted the required Bedrock operation `description` fields. Added operation descriptions and parameter descriptions so the schema matches Bedrock action group requirements.
- The OpenAPI response objects only included human-readable descriptions. Added response `content` schemas because Bedrock expects response properties to help process API results during orchestration.
- The return operation told the agent to confirm actions in its instructions, but the OpenAPI schema did not require confirmation before invoking the mutating operation. Added `x-requireConfirmation` to the return endpoint.
- The Lambda example parsed `requestBody.content` as a raw JSON string. Bedrock sends OpenAPI request body values under `requestBody.content["application/json"].properties`, so the handler now builds the body from that properties list.
- The action group section did not mention the required Lambda resource-based policy that permits Amazon Bedrock to invoke the function. Added a sentence noting that requirement.

## Review Notes
The boto3 client names and parameters for creating agents, action groups, knowledge base associations, aliases, preparing agents, and invoking agents match the current AWS documentation. The invocation example is correct, including response streaming and optional trace enablement. The example still uses placeholder ARNs, account IDs, S3 bucket names, and knowledge base IDs that readers must replace with real resources.
