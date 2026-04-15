# How to Configure Dapr Conversation with AWS Bedrock

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, AWS Bedrock, LLM, AI, Cloud

Description: Learn how to configure the Dapr Conversation API with AWS Bedrock, accessing Claude, Titan, and other foundation models from microservices via the Dapr sidecar.

---

AWS Bedrock provides managed access to multiple foundation models including Anthropic Claude, Amazon Titan, and Meta Llama. The Dapr Conversation API supports Bedrock as a provider, letting you access these models through a unified interface without AWS SDK dependencies in your application code.

## Prerequisites

- AWS account with Bedrock access enabled
- Model access granted in the AWS Bedrock console for your target region
- AWS credentials configured (IAM role, access keys, or instance profile)

## Creating the AWS Bedrock Component

```yaml
# components/bedrock-conversation.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bedrock-conversation
spec:
  type: conversation.aws.bedrock
  version: v1
  metadata:
    - name: model
      value: "anthropic.claude-3-5-sonnet-20241022-v2:0"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-bedrock-secret
        key: access-key
    - name: secretKey
      secretKeyRef:
        name: aws-bedrock-secret
        key: secret-key
    - name: cacheTTL
      value: "10m"
```

Store AWS credentials:

```bash
kubectl create secret generic aws-bedrock-secret \
  --from-literal=access-key=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Using IAM Roles (Recommended for Production)

On EKS, use IRSA (IAM Roles for Service Accounts) instead of static credentials:

```yaml
# components/bedrock-conversation.yaml (IAM role approach)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bedrock-conversation
spec:
  type: conversation.aws.bedrock
  version: v1
  metadata:
    - name: model
      value: "anthropic.claude-3-5-sonnet-20241022-v2:0"
    - name: region
      value: "us-east-1"
    # No access key or secret key - uses instance role
```

Attach a Bedrock policy to the service account role:

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
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/*"
    }
  ]
}
```

## Calling Bedrock Models via HTTP API

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/bedrock-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "content": "Explain the difference between SQS and SNS in AWS",
        "role": "user"
      }
    ],
    "temperature": 0.5
  }'
```

## Using Amazon Titan Models

Switch to Amazon Titan for text generation:

```yaml
    - name: model
      value: "amazon.titan-text-express-v1"
```

Or Meta Llama:

```yaml
    - name: model
      value: "meta.llama3-70b-instruct-v1:0"
```

## Application Code Example

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  const { text } = req.body;

  try {
    const response = await fetch(
      'http://localhost:3500/v1.0-alpha1/conversation/bedrock-conversation/converse',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: [{ content: `Analyze sentiment: ${text}`, role: 'user' }],
          temperature: 0.2
        })
      }
    );

    const data = await response.json();
    res.json({ analysis: data.outputs[0].result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(6001);
```

## Available Bedrock Models

Common model IDs for use in the `model` metadata field:

```text
anthropic.claude-3-5-sonnet-20241022-v2:0
anthropic.claude-3-haiku-20240307-v1:0
amazon.titan-text-express-v1
meta.llama3-70b-instruct-v1:0
mistral.mistral-7b-instruct-v0:2
```

## Summary

Dapr Conversation with AWS Bedrock provides access to multiple foundation models through a single unified API. Using IAM roles instead of static credentials in production, and taking advantage of the Dapr component abstraction, you can switch between Claude, Titan, and other Bedrock models without any application code changes.
