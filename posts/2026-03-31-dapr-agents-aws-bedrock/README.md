# How to Use Dapr Agents with AWS Bedrock

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, AWS, Bedrock, LLM

Description: Learn how to configure Dapr Agents with AWS Bedrock to run AI agents using Claude, Llama, and other models managed through AWS's secure infrastructure.

---

## Why Use AWS Bedrock with Dapr Agents?

AWS Bedrock provides managed access to foundation models including Claude, Llama, Titan, and Cohere, with AWS IAM-based authentication and no external API keys. When running Dapr Agents on AWS (EKS, ECS, EC2), Bedrock provides enterprise-grade security, compliance, and model governance without leaving the AWS ecosystem.

## Prerequisites

Ensure your AWS environment is configured:

```bash
# Configure AWS credentials
aws configure

# Or use instance profile / IRSA on EKS
# Verify Bedrock model access
aws bedrock list-foundation-models --region us-east-1 | jq '.modelSummaries[].modelId'
```

Enable model access in the AWS console for the models you want to use.

## Installation

```bash
pip install dapr-agents
```

You also need the [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/) and runtime installed, as the Dapr sidecar handles AWS SDK communication with Bedrock.

## Configuring the AWS Bedrock LLM Client

Dapr Agents connects to AWS Bedrock through Dapr's conversation API component. First, create a component YAML file (e.g., `components/bedrock.yaml`):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bedrock-claude
spec:
  type: conversation.aws.bedrock
  version: v1
  metadata:
    - name: model
      value: "anthropic.claude-3-5-sonnet-20241022-v2:0"
    - name: region
      value: "us-east-1"
```

When running on AWS with an instance profile or IRSA, the Dapr sidecar uses the default credential chain automatically. For local development, you can add explicit credentials:

```yaml
    - name: accessKey
      value: "${{AWS_ACCESS_KEY_ID}}"
    - name: secretKey
      value: "${{AWS_SECRET_ACCESS_KEY}}"
```

Then reference the component in Python using `DaprChatClient`:

```python
from dapr_agents.llm import DaprChatClient

# References the component by its metadata.name
llm = DaprChatClient(component_name="bedrock-claude")
```

## Building an Agent with Bedrock Claude

```python
import asyncio
from dapr_agents import DurableAgent, AgentRunner, tool
from dapr_agents.llm import DaprChatClient


@tool
def check_gdpr_compliance(document: str) -> str:
    """Checks document content for GDPR compliance issues.

    Args:
        document: The text content to evaluate.
    """
    issues = []
    if "personal data" in document.lower() and "consent" not in document.lower():
        issues.append("Missing consent mechanism for personal data processing")
    if "retention" not in document.lower():
        issues.append("No data retention policy specified")
    return f"GDPR check: {len(issues)} issues found - {'; '.join(issues) or 'None'}"


@tool
def generate_audit_report(findings: str, risk_level: str) -> str:
    """Generates a structured audit report from findings.

    Args:
        findings: Summary of compliance findings.
        risk_level: Risk level (low, medium, high, critical).
    """
    return f"Audit Report [{risk_level.upper()} RISK]:\n{findings}"


async def main():
    llm = DaprChatClient(component_name="bedrock-claude")

    agent = DurableAgent(
        name="compliance-agent",
        role="Compliance Analyst",
        instructions=[
            "You are a compliance analyst. Evaluate documents, policies, and processes against regulatory requirements.",
            "Provide clear findings with risk levels."
        ],
        tools=[check_gdpr_compliance, generate_audit_report],
        llm=llm,
    )

    runner = AgentRunner()
    result = await runner.run(agent, payload="Review this privacy policy for GDPR compliance issues.")
    print(result)
    runner.shutdown(agent)


asyncio.run(main())
```

Run the agent with the Dapr sidecar:

```bash
dapr run --app-id compliance-agent \
  --resources-path ./components \
  -- python agent.py
```

## Using Llama on Bedrock

Dapr Agents also supports Meta's Llama models via Bedrock. Create a separate component (e.g., `components/bedrock-llama.yaml`):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bedrock-llama
spec:
  type: conversation.aws.bedrock
  version: v1
  metadata:
    - name: model
      value: "meta.llama3-70b-instruct-v1:0"
    - name: region
      value: "us-west-2"
```

```python
from dapr_agents.llm import DaprChatClient

llm = DaprChatClient(component_name="bedrock-llama")
```

## IAM Permissions for Bedrock

The IAM role for your agent needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
      ]
    }
  ]
}
```

## Deploying on EKS with IRSA

For EKS deployments, use IAM Roles for Service Accounts (IRSA) to avoid storing credentials:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: compliance-agent
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/ComplianceAgentRole
```

```bash
dapr run --app-id compliance-agent \
  --app-port 8080 \
  --components-path ./components \
  -- python agent.py
```

## Cross-Region Inference

For high availability, enable cross-region inference on Bedrock by using the cross-region inference profile ID in your component YAML:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bedrock-claude-cross-region
spec:
  type: conversation.aws.bedrock
  version: v1
  metadata:
    - name: model
      value: "us.anthropic.claude-3-5-sonnet-20241022-v2:0"  # cross-region profile
    - name: region
      value: "us-east-1"
```

## Summary

Dapr Agents integrates with AWS Bedrock through the Dapr conversation API using `DaprChatClient` and `conversation.aws.bedrock` component configuration, supporting Claude, Llama, and other foundation models. Use IAM instance profiles or IRSA for credential-free authentication on AWS. Apply IAM policies scoped to specific model ARNs, and enable cross-region inference profiles for high availability.
