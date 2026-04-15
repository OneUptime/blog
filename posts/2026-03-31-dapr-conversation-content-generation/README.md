# How to Use Dapr Conversation API for Content Generation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Content Generation, LLM, AI, Microservice

Description: Learn how to use the Dapr Conversation API for content generation, creating marketing copy, product descriptions, and structured content with LLMs in microservices.

---

Content generation - product descriptions, marketing copy, email templates, and social media posts - is a high-value LLM use case. The Dapr Conversation API provides the infrastructure for building reliable content generation pipelines in microservice architectures.

## Content Generation Service

A robust content generation service handles multiple content types with configurable templates:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

const DAPR_URL = 'http://localhost:3500';

const TEMPLATES = {
  productDescription: (data) =>
    `Write a compelling product description for "${data.name}".
     Key features: ${data.features.join(', ')}.
     Target audience: ${data.audience}.
     Tone: ${data.tone || 'professional'}.
     Length: ${data.length || '2-3 sentences'}.`,

  emailSubjectLines: (data) =>
    `Generate 5 compelling email subject lines for:
     Campaign: ${data.campaign}
     Audience: ${data.audience}
     Goal: ${data.goal}
     Format: Return as a numbered list.`,

  blogOutline: (data) =>
    `Create a detailed blog post outline about "${data.topic}".
     Target audience: ${data.audience}
     Desired word count: ${data.wordCount || 1000}
     Include: introduction, 4-6 main sections, and conclusion.`,

  socialMediaPost: (data) =>
    `Write a ${data.platform} post about: ${data.topic}
     Brand voice: ${data.brandVoice || 'friendly and informative'}
     Include relevant hashtags for ${data.platform}.
     Character limit: ${data.charLimit || 280}.`
};

app.post('/api/generate', async (req, res) => {
  const { contentType, data, provider } = req.body;

  const template = TEMPLATES[contentType];
  if (!template) {
    return res.status(400).json({ error: `Unknown content type: ${contentType}` });
  }

  const prompt = template(data);
  const component = provider || 'openai-conversation';

  try {
    const response = await fetch(
      `${DAPR_URL}/v1.0-alpha1/conversation/${component}/converse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: [{ content: prompt, role: 'user' }],
          parameters: { temperature: 0.7, max_tokens: 600 }
        })
      }
    );

    const result = await response.json();
    const content = result.outputs[0].result;

    res.json({ contentType, content, prompt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(6001);
```

## Generating Product Descriptions in Bulk

```bash
# Generate product description
curl -X POST http://localhost:6001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "productDescription",
    "data": {
      "name": "UltraCharge Pro 20000mAh Power Bank",
      "features": ["65W fast charging", "3 USB ports", "LED display", "airline safe"],
      "audience": "frequent travelers and remote workers",
      "tone": "energetic",
      "length": "3 sentences"
    }
  }'
```

## Batch Content Generation with Dapr Jobs

Schedule bulk content generation as a Dapr Job:

```python
import requests

def generate_batch_descriptions(products: list) -> list:
    results = []
    for product in products:
        response = requests.post(
            "http://localhost:6001/api/generate",
            json={
                "contentType": "productDescription",
                "data": product,
                "provider": "openai-conversation"
            }
        )

        if response.ok:
            results.append({
                "productId": product["id"],
                "description": response.json()["content"],
                "status": "success"
            })
        else:
            results.append({
                "productId": product["id"],
                "status": "failed",
                "error": response.text
            })

    return results

# Job handler
from flask import Flask, request
app = Flask(__name__)

@app.route('/job/generate-product-descriptions', methods=['POST'])
def handle_batch_generation_job():
    products = fetch_products_needing_descriptions()
    results = generate_batch_descriptions(products)

    success_count = sum(1 for r in results if r['status'] == 'success')
    print(f"Generated {success_count}/{len(products)} product descriptions")

    return {"generated": success_count}, 200
```

## A/B Testing Content Variants

Generate multiple variants using different providers or temperature settings:

```python
def generate_variants(prompt: str, count: int = 3) -> list:
    variants = []
    temperatures = [0.5, 0.7, 0.9]

    for i in range(count):
        response = requests.post(
            f"http://localhost:3500/v1.0-alpha1/conversation/openai-conversation/converse",
            json={
                "inputs": [{"content": prompt, "role": "user"}],
                "parameters": {
                    "temperature": temperatures[i % len(temperatures)],
                    "max_tokens": 200
                }
            }
        )
        variants.append(response.json()['outputs'][0]['result'])

    return variants
```

## Summary

The Dapr Conversation API provides a flexible foundation for content generation services. Using template-driven prompts, configurable providers, and batch processing via Dapr Jobs, you can build scalable content pipelines that switch between LLM providers without touching application code.
