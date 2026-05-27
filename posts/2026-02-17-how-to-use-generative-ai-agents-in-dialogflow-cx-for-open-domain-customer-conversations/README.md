# Use Generative AI Agents in Dialogflow CX for Open-Domain Customer Conversations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dialogflow CX, Generative AI, LLM, Conversational AI, Customer Support, Google Cloud

Description: Use generative AI agents in Dialogflow CX to handle open-domain customer conversations that go beyond predefined intents and scripted responses.

---

Traditional chatbots break down the moment a customer asks something outside the predefined intent list. You spend months building out intents and training phrases, and then a customer asks a question you never anticipated and gets a frustrating "I don't understand" response. Generative AI agents in Dialogflow CX solve this by using large language models to understand and respond to a much wider range of customer queries, while still giving you control over the conversation flow for critical paths.

In this post, I will show you how to set up generative AI features in Dialogflow CX, configure the LLM for your use case, ground responses in your own data, and maintain guardrails so the agent stays on topic.

## How Generative AI Agents Work in Dialogflow CX

Dialogflow CX generative AI features sit alongside the traditional flow-based architecture. You get the best of both worlds:

- **Deterministic flows** handle well-defined use cases (order lookup, account changes, returns) where you need predictable behavior
- **Generative fallback and data store tools** handle long-tail conversational turns, with data store tools grounding answers in your company's knowledge base

```mermaid
graph TD
    A[User Input] --> B{Intent Matched?}
    B -->|Yes - High Confidence| C[Deterministic Flow<br/>Predefined Response]
    B -->|No - Low Confidence| D[Generative Fallback<br/>or Data Store Tool]
    D --> E[Data Store<br/>Grounding when configured]
    D --> F[LLM Response<br/>Generation]
    E --> F
    F --> G[Safety Filters]
    G --> H[Response to User]
    C --> H
```

## Prerequisites

- A Dialogflow CX agent with existing flows
- Dialogflow API and Discovery Engine API enabled
- Knowledge base documents (FAQs, product docs, help articles)
- Access to the agent's Generative AI settings

## Step 1: Enable Generative AI Features

Configure the generative fallback settings on your Dialogflow CX agent. This controls the prompt used when a no-match handler has generative fallback enabled.

```python
from google.cloud import dialogflowcx_v3
from google.protobuf import field_mask_pb2

def enable_generative_features(agent_name):
    """Configures generative fallback settings on a Dialogflow CX agent."""
    client = dialogflowcx_v3.AgentsClient()

    generative_settings_name = f"{agent_name}/generativeSettings"
    settings = client.get_generative_settings(
        name=generative_settings_name,
        language_code="en",
    )

    settings.fallback_settings = dialogflowcx_v3.GenerativeSettings.FallbackSettings(
        selected_prompt="Support fallback",
        prompt_templates=[
            dialogflowcx_v3.GenerativeSettings.FallbackSettings.PromptTemplate(
                display_name="Support fallback",
                prompt_text=(
                    "You are a concise support assistant. Use the conversation "
                    "context and the last user message to answer helpfully. "
                    "If the user asks for account-specific actions, ask them "
                    "to continue in the appropriate support flow.\n\n"
                    "Conversation: $conversation\n"
                    "User: $last-user-utterance\n"
                    "Relevant routes: $route-descriptions"
                ),
            )
        ],
    )

    client.update_generative_settings(
        generative_settings=settings,
        update_mask=field_mask_pb2.FieldMask(paths=["fallback_settings"]),
    )
    print("Generative fallback settings configured")

enable_generative_features(
    "projects/my-project/locations/us-central1/agents/AGENT_ID"
)
```

## Step 2: Create a Data Store for Knowledge Grounding

The generative agent needs a knowledge base to ground its responses. This prevents hallucination and ensures answers are based on your actual documentation.

First, create a Vertex AI Search data store and populate it with your documents:

```python
from google.cloud import discoveryengine_v1
from google.api_core.client_options import ClientOptions

def create_data_store(project_id, location, data_store_id):
    """Creates a data store for knowledge grounding."""
    client_options = (
        ClientOptions(api_endpoint=f"{location}-discoveryengine.googleapis.com")
        if location != "global"
        else None
    )
    client = discoveryengine_v1.DataStoreServiceClient(
        client_options=client_options
    )

    parent = client.collection_path(
        project=project_id,
        location=location,
        collection="default_collection",
    )

    data_store = discoveryengine_v1.DataStore(
        display_name="Customer Support Knowledge Base",
        industry_vertical=discoveryengine_v1.IndustryVertical.GENERIC,
        solution_types=[discoveryengine_v1.SolutionType.SOLUTION_TYPE_CHAT],
        content_config=discoveryengine_v1.DataStore.ContentConfig.CONTENT_REQUIRED,
    )

    operation = client.create_data_store(
        parent=parent,
        data_store=data_store,
        data_store_id=data_store_id,
    )
    result = operation.result(timeout=300)
    print(f"Data store created: {result.name}")
    return result

create_data_store("my-project", "global", "support-knowledge-base")
```

Now import your knowledge base documents:

```python
from google.cloud import discoveryengine_v1

def import_documents(project_id, data_store_id, gcs_uri):
    """Imports documents from Cloud Storage into the data store."""
    client = discoveryengine_v1.DocumentServiceClient()

    parent = (
        f"projects/{project_id}/locations/global"
        f"/collections/default_collection"
        f"/dataStores/{data_store_id}/branches/default_branch"
    )

    request = discoveryengine_v1.ImportDocumentsRequest(
        parent=parent,
        gcs_source=discoveryengine_v1.GcsSource(
            input_uris=[gcs_uri],
            data_schema="content",
        ),
        reconciliation_mode=discoveryengine_v1.ImportDocumentsRequest.ReconciliationMode.INCREMENTAL,
    )

    operation = client.import_documents(request=request)
    result = operation.result(timeout=600)
    print(f"Documents imported: {result}")
    return result

# Import FAQ documents, product documentation, help articles

import_documents("my-project", "support-knowledge-base", "gs://my-docs-bucket/support-docs/*")
```

After the documents are indexed, connect the data store to your Dialogflow CX agent by creating a data store tool in the Conversational Agents console, or by adding data store connections through the API. The data store is what grounds knowledge responses; generative fallback by itself only uses the configured fallback prompt and conversation context.

## Step 3: Configure the Generative Fallback

Set up the generative fallback handler so that when no intent matches with high confidence, Dialogflow CX can generate a response from the fallback prompt and conversation context. Use a data store tool or data store handler when the response must be grounded in your knowledge base.

```python
from google.cloud import dialogflowcx_v3

def configure_generative_fallback(agent_name):
    """Configures generative fallback for unmatched queries."""
    flows_client = dialogflowcx_v3.FlowsClient()
    default_flow_name = f"{agent_name}/flows/00000000-0000-0000-0000-000000000000"
    default_flow = flows_client.get_flow(name=default_flow_name)

    # Add a no-match event handler with generative fallback
    generative_handler = dialogflowcx_v3.EventHandler(
        event="sys.no-match-default",
        trigger_fulfillment=dialogflowcx_v3.Fulfillment(
            messages=[
                dialogflowcx_v3.ResponseMessage(
                    text=dialogflowcx_v3.ResponseMessage.Text(
                        text=["Let me look that up for you."]
                    )
                )
            ],
            # Enable generative fallback
            enable_generative_fallback=True,
        ),
    )

    default_flow.event_handlers.append(generative_handler)

    flows_client.update_flow(
        flow=default_flow,
        update_mask={"paths": ["event_handlers"]},
    )
    print("Generative fallback configured")
```

## Step 4: Set Up Conversation Persona and Instructions

Control how the LLM behaves by setting knowledge connector settings and fallback prompts. This is crucial for keeping the agent on-brand and on-topic.

```python
from google.cloud import dialogflowcx_v3
from google.protobuf import field_mask_pb2

def configure_agent_persona(agent_name):
    """Sets up the generative agent's persona and behavioral instructions."""
    client = dialogflowcx_v3.AgentsClient()

    generative_settings_name = f"{agent_name}/generativeSettings"
    settings = client.get_generative_settings(
        name=generative_settings_name,
        language_code="en",
    )

    settings.knowledge_connector_settings = (
        dialogflowcx_v3.GenerativeSettings.KnowledgeConnectorSettings(
            business="Acme Inc.",
            agent="Acme Support Assistant",
            agent_identity="virtual customer support assistant",
            business_description="a company that provides Acme products and services",
            agent_scope="Acme customer support documentation",
        )
    )

    client.update_generative_settings(
        generative_settings=settings,
        update_mask=field_mask_pb2.FieldMask(
            paths=["knowledge_connector_settings"]
        ),
    )
    print("Agent persona configured")
```

In the Dialogflow CX console, navigate to Agent Settings > Generative AI and configure the generative fallback prompt and knowledge connector settings:

```text
Agent Name: Acme Support Assistant

Persona Instructions:
- You are a helpful customer support agent for Acme Inc.
- Always be polite and professional.
- If you don't know the answer, say so honestly and offer to connect the user with a human agent.
- Never make up product information or pricing. Only share information from the knowledge base.
- Do not discuss competitors or make comparisons.
- Keep responses concise - no more than 3 sentences for simple questions.
- For account-specific queries (order status, billing), always direct users to the appropriate flow.
```

## Step 5: Implement Guardrails and Safety Filters

Generative responses need guardrails to prevent off-topic responses, hallucinations, and inappropriate content.

```python
from google.cloud import dialogflowcx_v3
from google.protobuf import field_mask_pb2

def configure_safety_settings(agent_name):
    """Configures safety and content filtering for generative responses."""
    client = dialogflowcx_v3.AgentsClient()

    generative_settings_name = f"{agent_name}/generativeSettings"
    settings = client.get_generative_settings(
        name=generative_settings_name,
        language_code="en",
    )

    settings.generative_safety_settings = dialogflowcx_v3.SafetySettings(
        default_banned_phrase_match_strategy=(
            dialogflowcx_v3.SafetySettings.PhraseMatchStrategy.WORD_MATCH
        ),
        banned_phrases=[
            dialogflowcx_v3.SafetySettings.Phrase(
                text="guaranteed pricing",
                language_code="en",
            ),
            dialogflowcx_v3.SafetySettings.Phrase(
                text="legal advice",
                language_code="en",
            ),
            dialogflowcx_v3.SafetySettings.Phrase(
                text="medical advice",
                language_code="en",
            ),
        ],
        prompt_security_settings=(
            dialogflowcx_v3.SafetySettings.PromptSecuritySettings(
                enable_prompt_security=True,
            )
        ),
    )

    client.update_generative_settings(
        generative_settings=settings,
        update_mask=field_mask_pb2.FieldMask(
            paths=["generative_safety_settings"]
        ),
    )
    print("Generative safety settings configured")

configure_safety_settings(
    "projects/my-project/locations/us-central1/agents/AGENT_ID"
)
```

## Step 6: Blend Deterministic and Generative Responses

The real power comes from combining structured flows with generative capabilities. Use deterministic flows for transactional operations, data store tools for grounded informational queries, and generative fallback for no-match recovery.

Here is a pattern for routing between the two:

```python
from google.cloud import dialogflowcx_v3

def create_hybrid_routing(agent_name, default_flow_name):
    """Sets up routing that combines deterministic flows with generative fallback."""
    client = dialogflowcx_v3.PagesClient()

    # Create a triage page that routes based on query type
    triage_page = dialogflowcx_v3.Page(
        display_name="Query Triage",
        entry_fulfillment=dialogflowcx_v3.Fulfillment(
            messages=[
                dialogflowcx_v3.ResponseMessage(
                    text=dialogflowcx_v3.ResponseMessage.Text(
                        text=["How can I help you today?"]
                    )
                )
            ]
        ),
        transition_routes=[
            # High-confidence transactional intents go to deterministic flows
            dialogflowcx_v3.TransitionRoute(
                intent=f"{agent_name}/intents/CHECK_ORDER_STATUS_INTENT_ID",
                target_flow=f"{agent_name}/flows/ORDER_STATUS_FLOW_ID",
            ),
            dialogflowcx_v3.TransitionRoute(
                intent=f"{agent_name}/intents/RETURN_ITEM_INTENT_ID",
                target_flow=f"{agent_name}/flows/RETURNS_FLOW_ID",
            ),
            dialogflowcx_v3.TransitionRoute(
                intent=f"{agent_name}/intents/BILLING_QUESTION_INTENT_ID",
                target_flow=f"{agent_name}/flows/BILLING_FLOW_ID",
            ),
        ],
        # For everything else, the generative fallback kicks in.
        # For grounded knowledge answers, attach a data store tool response
        # to the relevant route or page fulfillment in the console or API.
        event_handlers=[
            dialogflowcx_v3.EventHandler(
                event="sys.no-match-default",
                trigger_fulfillment=dialogflowcx_v3.Fulfillment(
                    enable_generative_fallback=True,
                ),
            ),
        ],
    )

    response = client.create_page(
        parent=default_flow_name,
        page=triage_page,
    )
    print(f"Hybrid triage page created: {response.name}")
    return response
```

## Step 7: Monitor and Improve

Track how the generative agent performs and continuously improve its knowledge base.

```python
from google.cloud import dialogflowcx_v3

def get_conversation_analytics(agent_name):
    """Retrieves conversation analytics to identify improvement areas."""
    # Use conversation history, BigQuery export, or the V3beta1
    # ConversationHistory API to analyze conversations.
    # Then analyze it for:
    # 1. Queries that triggered generative fallback - add intents for common ones
    # 2. Low-confidence generative responses - add to knowledge base
    # 3. Conversations that ended in agent transfer - automate these if possible

    print("Key metrics to track:")
    print("- Generative fallback rate (target: < 30% of conversations)")
    print("- Customer satisfaction after generative responses")
    print("- Containment rate (conversations resolved without human agent)")
    print("- Response relevance scores")
    print("")
    print("Use:")
    print(f"Dialogflow CX Console > {agent_name} > Manage > Conversation History")
    print("or enable interaction logging export to BigQuery for larger analysis")
```

## Summary

Generative AI agents in Dialogflow CX give you a safety net for the long tail of customer queries that you cannot anticipate with predefined intents. The key is using data store tools to ground knowledge answers in your own data, and setting up clear guardrails through persona instructions, banned phrases, and safety filters. Use deterministic flows for transactional operations where you need predictable behavior, data store tools for informational queries, and generative fallback for no-match recovery. Monitor the generative responses closely at first, and gradually expand the knowledge base based on what customers are actually asking about.
