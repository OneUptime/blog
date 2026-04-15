# Validation Summary: How to Use Dapr Agents with AWS Bedrock

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Agents (dapr-agents Python library v1.0.1)
- Dapr conversation API (`conversation.aws.bedrock` component)
- AWS Bedrock (foundation model hosting)
- Anthropic Claude (via Bedrock)
- Meta Llama (via Bedrock)
- AWS IAM (permissions for Bedrock)
- AWS EKS with IRSA (IAM Roles for Service Accounts)
- Dapr CLI

## Sources Consulted
- dapr-agents GitHub repository source code: https://github.com/dapr/dapr-agents (v1.0.1)
  - `dapr_agents/llm/__init__.py` — verified exported LLM client classes
  - `dapr_agents/agents/durable.py` — verified `DurableAgent` constructor signature
  - `dapr_agents/workflow/runners/agent.py` — verified `AgentRunner` API
  - `examples/01-llm-call-dapr/resources/awsbedrock.yaml` — reference Bedrock component YAML
- Dapr components-contrib Go source (`conversation/aws/bedrock/bedrock.go`) — verified component metadata fields
- AWS Bedrock documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/
  - Model lifecycle page — verified model IDs
  - Supported foundation models — verified `meta.llama3-70b-instruct-v1:0`
  - Cross-region inference profiles — verified `us.` prefix for US geographic profiles
- AWS IAM Service Authorization Reference — verified `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` actions
- AWS Bedrock API Reference — verified foundation model ARN format (`arn:aws:bedrock:<region>::foundation-model/<model-id>`)
- AWS CLI Reference for `aws bedrock list-foundation-models`
- AWS EKS documentation — verified IRSA annotation `eks.amazonaws.com/role-arn`

## Issues Found

### Issue 1: `AWSBedrockChat` class does not exist (CRITICAL)
**What was wrong:** The post used `from dapr_agents.llm import AWSBedrockChat` throughout. This class does not exist in the dapr-agents library. The library's `dapr_agents/llm/__init__.py` exports: `OpenAIChatClient`, `OpenAIAudioClient`, `OpenAIEmbeddingClient`, `HFHubChatClient`, `NVIDIAChatClient`, `NVIDIAEmbeddingClient`, `ElevenLabsSpeechClient`, `DaprChatClient`.

**What was changed:** Replaced all `AWSBedrockChat` usage with `DaprChatClient(component_name="...")` and added the required Dapr component YAML configuration (`conversation.aws.bedrock` type) that defines the model, region, and credentials. AWS Bedrock is accessed indirectly through the Dapr sidecar, not via a direct Python class.

**Why:** The Dapr sidecar handles all AWS SDK communication with Bedrock. The Python library only provides `DaprChatClient` which communicates with the local Dapr sidecar via gRPC. Bedrock configuration (model ID, region, credentials) goes in a Dapr component YAML file, not in Python constructor arguments.

### Issue 2: `Agent` class and subclassing pattern do not exist (CRITICAL)
**What was wrong:** The post used `from dapr_agents import Agent, tool` and a class-based subclassing pattern with class attributes (`name`, `instructions`) and `@tool`-decorated methods. The `Agent` class does not exist in dapr-agents.

**What was changed:** Replaced with the correct API: `from dapr_agents import DurableAgent, AgentRunner, tool`. Tools are standalone functions decorated with `@tool` and passed via the `tools=[]` parameter. Agent configuration (`name`, `role`, `instructions`) is passed as constructor keyword arguments to `DurableAgent`.

**Why:** The dapr-agents library uses `DurableAgent` (not `Agent`), does not support subclassing for agent definition, and tools must be standalone functions — not class methods.

### Issue 3: `.run()` method on agent does not exist (CRITICAL)
**What was wrong:** The post called `agent.run("Review this privacy policy...")`. Neither `DurableAgent` nor its parent `AgentBase` has a `.run()` method.

**What was changed:** Replaced with the correct execution pattern using `AgentRunner`: `runner = AgentRunner()` followed by `await runner.run(agent, payload="...")`.

**Why:** Execution in dapr-agents is handled by `AgentRunner`, which manages the Dapr workflow runtime lifecycle.

### Issue 4: `boto3` listed as a dependency (MINOR)
**What was wrong:** The installation command was `pip install dapr-agents boto3`. The dapr-agents library does not depend on boto3 — AWS SDK communication is handled entirely by the Dapr sidecar (a Go binary).

**What was changed:** Removed `boto3` from the install command and added a note about needing the Dapr CLI and runtime.

**Why:** Adding boto3 is misleading — it suggests the Python code communicates directly with AWS, when in fact the Dapr sidecar handles all AWS API calls.

### Issue 5: Unused `import os` and `import boto3` (MINOR)
**What was wrong:** The code examples imported `os` and `boto3` but never used them.

**What was changed:** Removed unused imports as part of the code rewrite.

## Review Notes
- The Claude model ID `anthropic.claude-3-5-sonnet-20241022-v2:0` is valid but has entered legacy/lifecycle status on AWS Bedrock. Newer Claude models (Claude 4.x family) are now available. A future update may want to use a current model ID.
- All AWS-specific content (IAM policies, ARN formats, IRSA annotations, CLI commands, cross-region inference profiles) was verified as correct against official AWS documentation.
- The dapr-agents library requires Dapr runtime >= 1.16.0 for the conversation API.
- The `DaprChatClient` can also auto-discover the Bedrock component if only one `conversation.*` component is registered, or via the `DAPR_LLM_COMPONENT_DEFAULT` environment variable, but explicit `component_name` is clearer for a tutorial.
