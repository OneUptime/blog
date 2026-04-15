# How to Use Dapr Agents with Hugging Face Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Hugging Face, LLM, Open Source

Description: Learn how to use Dapr Agents with Hugging Face models via the Inference API or locally hosted models for open-source AI agent development.

---

## Why Hugging Face with Dapr Agents?

Hugging Face provides access to thousands of open-source models - from Llama and Falcon to Mistral and Phi. Using Hugging Face with Dapr Agents gives you model flexibility, cost control, and the ability to fine-tune models for your domain. This is ideal for teams that need custom models or cannot send data to external providers.

## Installation

```bash
pip install dapr-agents huggingface_hub transformers
```

## Using the Hugging Face Inference API

The Hugging Face Inference API provides hosted model inference without local GPU requirements:

```python
from dapr_agents.llm import HFHubChatClient

llm = HFHubChatClient(
    model="meta-llama/Llama-3.1-8B-Instruct",
    api_key="hf_your-token",  # or HF_TOKEN env var
)
```

## Building an Agent with a Hugging Face Model

```python
import asyncio
import os
from dapr_agents import AgentRunner, DurableAgent, tool
from dapr_agents.llm import HFHubChatClient

@tool
def classify_sentiment(text: str) -> str:
    """Classifies the sentiment of a piece of text.

    Args:
        text: The text to analyze for sentiment.
    """
    from transformers import pipeline
    classifier = pipeline(
        "text-classification",
        model="distilbert-base-uncased-finetuned-sst-2-english"
    )
    result = classifier(text[:512])[0]
    return f"Sentiment: {result['label']} (confidence: {result['score']:.2f})"

@tool
def extract_keywords(text: str) -> str:
    """Extracts key topics and themes from text."""
    words = text.lower().split()
    # Simple keyword extraction - replace with KeyBERT for production
    common_words = {"the", "a", "is", "in", "of", "and", "to", "for"}
    keywords = [w for w in set(words) if w not in common_words and len(w) > 4]
    return f"Key topics: {', '.join(keywords[:10])}"


llm = HFHubChatClient(
    model="meta-llama/Llama-3.1-8B-Instruct",
    api_key=os.environ["HF_TOKEN"]
)

agent = DurableAgent(
    name="sentiment-agent",
    role="Sentiment Analyst",
    goal="Analyze customer feedback for sentiment and key themes",
    instructions=[
        "You are a sentiment analysis expert.",
        "Analyze customer feedback, reviews, and support tickets for sentiment and key themes.",
        "Categorize as positive, negative, neutral, or mixed."
    ],
    llm=llm,
    tools=[classify_sentiment, extract_keywords]
)

async def main():
    runner = AgentRunner()
    result = await runner.run(
        agent,
        payload={
            "message": "Analyze these customer reviews and identify the main complaints: "
            "'The product broke after one week', 'Terrible customer service', 'Love the design'"
        }
    )
    print(result)

asyncio.run(main())
```

## Using Local Hugging Face Models

For air-gapped environments or lower latency, serve models locally using Hugging Face's Text Generation Inference (TGI) server, then connect with `OpenAIChatClient`:

```bash
# Run TGI locally with Docker
docker run --gpus all -p 8080:80 \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id microsoft/Phi-3-mini-4k-instruct
```

```python
from dapr_agents.llm import OpenAIChatClient

llm = OpenAIChatClient(
    model="microsoft/Phi-3-mini-4k-instruct",
    base_url="http://localhost:8080/v1",
    api_key="not-needed"
)
```

Pre-download the model for offline use:

```bash
huggingface-cli download microsoft/Phi-3-mini-4k-instruct \
  --local-dir ./models/phi-3-mini
```

## Using OpenAI-Compatible Endpoints

Hugging Face's Inference Endpoints expose an OpenAI-compatible API:

```python
from dapr_agents.llm import OpenAIChatClient

llm = OpenAIChatClient(
    model="tgi",
    base_url="https://your-endpoint.huggingface.cloud/v1",
    api_key="hf_your-token"
)
```

## Running with Dapr

```bash
export HF_TOKEN="hf_your-token"

dapr run --app-id sentiment-agent \
  --app-port 8080 \
  --components-path ./components \
  -- python agent.py
```

## Caching Model Downloads

For containerized deployments, cache models in a volume:

```yaml
volumes:
  - name: hf-cache
    persistentVolumeClaim:
      claimName: hf-model-cache
containers:
  - name: agent
    env:
      - name: HF_HOME
        value: /cache/huggingface
    volumeMounts:
      - name: hf-cache
        mountPath: /cache
```

## Summary

Dapr Agents supports Hugging Face models via the Inference API for hosted inference or local serving for on-premise deployments. Use the `HFHubChatClient` for the Inference API and `OpenAIChatClient` with a local TGI server for local models. Hugging Face's OpenAI-compatible Inference Endpoints also work with the standard `OpenAIChatClient`.
