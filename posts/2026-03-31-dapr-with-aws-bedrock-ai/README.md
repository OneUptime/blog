# How to Use Dapr with AWS Bedrock for AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, Bedrock, AI, Binding, Language Model

Description: Use Dapr output bindings to invoke AWS Bedrock foundation models for text generation and summarization from microservices without embedding Bedrock SDK calls.

---

AWS Bedrock provides access to foundation models from Anthropic, Meta, Amazon, and others via a unified API. Dapr's Bedrock conversation component lets microservices invoke AI models through the Conversation building block, decoupling AI logic from model-specific SDKs.

## Enable Bedrock Model Access

```bash
# List available foundation models
aws bedrock list-foundation-models \
  --region us-east-1 \
  --by-output-modality TEXT

# Request access to models in the AWS Console:
# Bedrock > Model access > Request model access
# Enable: Claude, Titan, Llama as needed
```

## Configure the Dapr Bedrock Conversation Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bedrock
  namespace: default
spec:
  type: conversation.aws.bedrock
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: model
    value: anthropic.claude-3-sonnet-20240229-v1:0
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
```

## Invoke a Foundation Model

```python
import requests

def invoke_model(prompt: str) -> str:
    resp = requests.post(
        "http://localhost:3500/v1.0-alpha1/conversation/bedrock/converse",
        json={
            "inputs": [
                {
                    "content": prompt,
                    "role": "user"
                }
            ]
        }
    )
    resp.raise_for_status()
    result = resp.json()
    return result.get("outputs", [{}])[0].get("result", "")

# Generate a product description
description = invoke_model(
    "Write a 2-sentence product description for a wireless ergonomic keyboard."
)
print(description)
```

## Summarize Customer Feedback

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/summarize-feedback', methods=['POST'])
def summarize_feedback():
    body = request.json
    reviews = body.get('reviews', [])
    combined = "\n".join([f"- {r}" for r in reviews])

    prompt = f"""Summarize the following customer reviews in 3 bullet points:

{combined}

Provide only the bullet points, no introduction."""

    summary = invoke_model(prompt)
    return jsonify({"summary": summary})
```

## Use Amazon Titan for Text Generation

You can configure a second conversation component that uses Amazon Titan instead of Claude.

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bedrock-titan
spec:
  type: conversation.aws.bedrock
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: model
    value: amazon.titan-text-express-v1
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
```

```python
def invoke_titan(prompt: str) -> str:
    resp = requests.post(
        "http://localhost:3500/v1.0-alpha1/conversation/bedrock-titan/converse",
        json={
            "inputs": [
                {
                    "content": prompt,
                    "role": "user"
                }
            ]
        }
    )
    resp.raise_for_status()
    return resp.json().get("outputs", [{}])[0].get("result", "")

result = invoke_titan("Explain microservices in one sentence.")
print(result)
```

## IAM Policy for Bedrock

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
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-text-express-v1"
      ]
    }
  ]
}
```

## Summary

Dapr's Bedrock conversation component provides a lightweight integration with AWS foundation models, allowing services to invoke Claude, Titan, and other models through the Conversation API. This decouples AI capabilities from model-specific client code, making it straightforward to switch models or add AI features to existing services with minimal changes.
