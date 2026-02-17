# How to Implement Grounding with Google Search in Gemini on Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, Grounding, Google Search

Description: Learn how to ground Gemini responses with real-time Google Search results on Vertex AI to reduce hallucinations and provide up-to-date information.

---

One of the biggest challenges with large language models is that they can confidently generate information that is outdated or simply wrong. Grounding with Google Search addresses this by letting Gemini access real-time search results when generating responses. Instead of relying solely on its training data, the model can pull in current information from the web.

I have been using grounding extensively in applications that need current data - news summarization, product research, and competitive analysis. The difference in accuracy is significant. Let me show you how to set it up.

## What Is Grounding?

Grounding connects Gemini to external data sources during inference. When you enable Google Search grounding, the model can decide to search the web for relevant information before generating its response. The search results are incorporated into the response, and you get citations showing where the information came from.

This is different from retrieval-augmented generation (RAG) with your own data. Grounding with Google Search pulls from the public web, while RAG pulls from your private data stores. You can use both together for comprehensive coverage.

## Enabling Google Search Grounding

Setting up grounding requires just a few lines of code. You configure a grounding tool and pass it to the model.

This code enables Google Search grounding on a Gemini model:

```python
import vertexai
from vertexai.generative_models import (
    GenerativeModel,
    Tool,
    grounding,
)

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

# Create a grounding tool with Google Search
google_search_tool = Tool.from_google_search_retrieval(
    grounding.GoogleSearchRetrieval()
)

# Create the model with grounding enabled
model = GenerativeModel(
    "gemini-2.0-flash",
    tools=[google_search_tool]
)

# Ask a question that requires current information
response = model.generate_content(
    "What are the latest updates to Google Cloud's pricing for Compute Engine?"
)

print(response.text)
```

## Accessing Grounding Metadata

When grounding is active, the response includes metadata about the search queries used and the sources cited. This is valuable for transparency and debugging.

Here is how to extract grounding metadata:

```python
# Generate a grounded response
response = model.generate_content(
    "What were the major announcements at the latest Google Cloud Next conference?"
)

# Access the grounding metadata
candidate = response.candidates[0]

# Check if grounding was used
if candidate.grounding_metadata:
    metadata = candidate.grounding_metadata

    # Print search queries that were executed
    if metadata.search_entry_point:
        print(f"Search rendered content available: yes")

    # Print grounding chunks (source citations)
    if metadata.grounding_chunks:
        print("\nSources used:")
        for chunk in metadata.grounding_chunks:
            if chunk.web:
                print(f"  - {chunk.web.title}: {chunk.web.uri}")

    # Print grounding supports (which parts of the response are grounded)
    if metadata.grounding_supports:
        print("\nGrounding supports:")
        for support in metadata.grounding_supports:
            print(f"  Text segment: {support.segment.text[:100]}...")
            for idx in support.grounding_chunk_indices:
                print(f"    Supported by chunk index: {idx}")

# Print the actual response
print(f"\nResponse:\n{response.text}")
```

## Dynamic Grounding with Thresholds

You do not always need grounding for every query. Some questions can be answered from the model's training data alone. Dynamic grounding lets you set a threshold - the model only searches when it determines the query needs external data.

This code configures dynamic grounding:

```python
# Configure dynamic grounding with a threshold
# Lower threshold = more likely to ground, higher = less likely
dynamic_search_tool = Tool.from_google_search_retrieval(
    grounding.GoogleSearchRetrieval(
        dynamic_retrieval_config=grounding.DynamicRetrievalConfig(
            dynamic_threshold=0.3  # Ground when confidence is below 0.3
        )
    )
)

model_dynamic = GenerativeModel(
    "gemini-2.0-flash",
    tools=[dynamic_search_tool]
)

# This factual question about current events will likely trigger grounding
response1 = model_dynamic.generate_content(
    "What is the current price of Bitcoin?"
)
print("Bitcoin query - grounded:",
      response1.candidates[0].grounding_metadata is not None)

# This general knowledge question may not trigger grounding
response2 = model_dynamic.generate_content(
    "What is the chemical formula for water?"
)
print("Water formula query - grounded:",
      response2.candidates[0].grounding_metadata is not None)
```

## Grounding in Multi-Turn Conversations

Grounding works in chat sessions too. The model can search at any point during the conversation when it needs current information.

```python
# Create a chat with grounding enabled
chat = model.start_chat()

# First turn - general setup
response = chat.send_message(
    "I am researching cloud database services for a new project."
)
print(response.text)

# Second turn - this might trigger a search for current pricing
response = chat.send_message(
    "What are the current pricing tiers for Cloud Spanner?"
)
print(response.text)

# Third turn - follow-up using both chat context and grounding
response = chat.send_message(
    "How does that compare to Amazon Aurora pricing?"
)
print(response.text)

# Check which turns used grounding
for i, content in enumerate(chat.history):
    print(f"Turn {i}: {content.role}")
```

## Building a Grounded Research Assistant

Here is a more complete example - a research assistant that uses grounding to answer questions with citations.

```python
class GroundedResearchAssistant:
    """A research assistant that grounds answers with web sources."""

    def __init__(self):
        search_tool = Tool.from_google_search_retrieval(
            grounding.GoogleSearchRetrieval()
        )
        self.model = GenerativeModel(
            "gemini-2.0-flash",
            tools=[search_tool],
            system_instruction=(
                "You are a research assistant. When answering questions, "
                "always provide specific facts and data points. "
                "Cite your sources when making claims about current events "
                "or recent developments."
            )
        )
        self.chat = self.model.start_chat()

    def research(self, query):
        """Research a topic and return the answer with sources."""
        response = self.chat.send_message(query)

        result = {
            "answer": response.text,
            "sources": []
        }

        # Extract source citations
        candidate = response.candidates[0]
        if candidate.grounding_metadata and candidate.grounding_metadata.grounding_chunks:
            for chunk in candidate.grounding_metadata.grounding_chunks:
                if chunk.web:
                    result["sources"].append({
                        "title": chunk.web.title,
                        "url": chunk.web.uri
                    })

        return result

    def format_response(self, result):
        """Format the research result with citations."""
        output = result["answer"]
        if result["sources"]:
            output += "\n\nSources:\n"
            for i, source in enumerate(result["sources"], 1):
                output += f"  [{i}] {source['title']}: {source['url']}\n"
        return output

# Use the research assistant
assistant = GroundedResearchAssistant()
result = assistant.research(
    "What are the latest advancements in quantum computing from Google?"
)
print(assistant.format_response(result))
```

## Combining Grounding with Function Calling

You can use grounding alongside function calling. The model can search the web for context and also call your custom functions. This is powerful for applications that need both public web data and access to internal systems.

```python
from vertexai.generative_models import FunctionDeclaration

# Define a custom function for internal data
get_internal_metrics = FunctionDeclaration(
    name="get_internal_metrics",
    description="Retrieve internal system metrics for a given service.",
    parameters={
        "type": "object",
        "properties": {
            "service_name": {
                "type": "string",
                "description": "Name of the internal service"
            },
            "metric_type": {
                "type": "string",
                "enum": ["latency", "error_rate", "throughput"]
            }
        },
        "required": ["service_name", "metric_type"]
    }
)

# Combine grounding and function calling
internal_tool = Tool(function_declarations=[get_internal_metrics])
search_tool = Tool.from_google_search_retrieval(
    grounding.GoogleSearchRetrieval()
)

# Model has access to both web search and internal functions
model_combined = GenerativeModel(
    "gemini-2.0-flash",
    tools=[search_tool, internal_tool]
)
```

## Handling Grounding Failures

Sometimes search results might not be relevant, or the grounding service might be temporarily unavailable. Build fallback handling into your application.

```python
def grounded_query_with_fallback(model, query, fallback_model=None):
    """Query with grounding, falling back to ungrounded if needed."""
    try:
        response = model.generate_content(query)

        # Check if grounding actually provided useful results
        candidate = response.candidates[0]
        has_grounding = (
            candidate.grounding_metadata
            and candidate.grounding_metadata.grounding_chunks
            and len(candidate.grounding_metadata.grounding_chunks) > 0
        )

        if has_grounding:
            return {"response": response.text, "grounded": True}
        else:
            # Grounding did not find relevant results
            return {"response": response.text, "grounded": False}

    except Exception as e:
        # Grounding service unavailable - fall back to ungrounded model
        if fallback_model:
            response = fallback_model.generate_content(query)
            return {
                "response": response.text,
                "grounded": False,
                "fallback": True
            }
        raise
```

## Wrapping Up

Grounding with Google Search is one of the most practical features in the Gemini toolkit. It reduces hallucinations, provides current information, and gives users verifiable sources for the model's claims. Start by enabling it for queries that need current data, use dynamic thresholds to control when grounding kicks in, and always surface the source citations to your users. Monitor grounding usage and response quality over time - tools like OneUptime can help you track whether grounded responses are meeting your accuracy requirements.
