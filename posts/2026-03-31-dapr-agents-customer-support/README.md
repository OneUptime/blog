# How to Use Dapr Agents for Customer Support Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Customer Support, Automation, LLM

Description: Learn how to build an AI-powered customer support agent with Dapr Agents that handles tickets, routes escalations, and maintains conversation history.

---

## Architecture Overview

A Dapr-based customer support agent system consists of:

- **Triage Agent** - classifies incoming support requests
- **Resolution Agent** - attempts to resolve common issues automatically
- **Escalation Agent** - routes complex issues to human agents
- **Shared state store** - maintains ticket and conversation history

All agents communicate via Dapr pub/sub and share state through a common Dapr state store.

## Building the Triage Agent

```python
from dapr_agents import Agent, tool
from dapr.clients import DaprClient
import json

class TriageAgent(Agent):
    name = "triage-agent"
    instructions = """You are a customer support triage specialist.
    Classify incoming tickets by:
    - Priority: urgent, high, normal, low
    - Category: billing, technical, account, general
    - Complexity: simple (can auto-resolve), complex (needs human)
    Return structured JSON with these fields."""

    def __init__(self):
        super().__init__()
        self.dapr_client = DaprClient()

    @tool
    def classify_ticket(self, ticket_text: str, customer_tier: str) -> str:
        """Classifies a support ticket by priority and category.

        Args:
            ticket_text: The content of the support ticket.
            customer_tier: Customer tier (enterprise, pro, free).
        """
        priority_boost = "enterprise" in customer_tier.lower()
        keywords = ticket_text.lower()
        category = "technical" if any(k in keywords for k in ["error", "crash", "bug"]) else "general"
        priority = "urgent" if priority_boost and "down" in keywords else "normal"
        return json.dumps({"category": category, "priority": priority})

    @tool
    def route_ticket(self, ticket_id: str, classification: str) -> str:
        """Routes a classified ticket to the appropriate agent topic.

        Args:
            ticket_id: The ticket identifier.
            classification: JSON string with category, priority, complexity.
        """
        data = json.loads(classification)
        topic = "complex-tickets" if data.get("complexity") == "complex" else "simple-tickets"

        self.dapr_client.publish_event(
            pubsub_name="support-pubsub",
            topic_name=topic,
            data=json.dumps({"ticket_id": ticket_id, "classification": data})
        )
        return f"Ticket {ticket_id} routed to {topic}"
```

## Building the Resolution Agent

```python
class ResolutionAgent(Agent):
    name = "resolution-agent"
    instructions = """You are a customer support specialist. Resolve common
    technical issues using the knowledge base. Provide step-by-step
    instructions. If you cannot resolve the issue, escalate."""

    @tool
    def search_knowledge_base(self, query: str) -> str:
        """Searches the support knowledge base for relevant articles.

        Args:
            query: The search query based on the customer's issue.
        """
        kb = {
            "password reset": "Visit /account/reset-password and enter your email address.",
            "billing charge": "Charges appear within 24-48 hours. Check /billing for history.",
            "api rate limit": "Free tier: 100 req/min. Upgrade at /upgrade for higher limits."
        }
        for key, solution in kb.items():
            if key in query.lower():
                return solution
        return "No matching article found. Escalation may be required."

    @tool
    def send_response(self, ticket_id: str, response: str, resolved: bool) -> str:
        """Sends a response to the customer and updates ticket status.

        Args:
            ticket_id: The ticket to respond to.
            response: The response message to send.
            resolved: Whether the issue has been resolved.
        """
        from dapr.clients import DaprClient
        client = DaprClient()
        client.save_state("statestore", f"ticket-{ticket_id}", json.dumps({
            "status": "resolved" if resolved else "pending-escalation",
            "response": response
        }))
        return f"Response sent for ticket {ticket_id}. Resolved: {resolved}"

    @tool
    def escalate_ticket(self, ticket_id: str, reason: str) -> str:
        """Escalates a ticket to a human support agent.

        Args:
            ticket_id: The ticket to escalate.
            reason: Why escalation is needed.
        """
        from dapr.clients import DaprClient
        client = DaprClient()
        client.publish_event(
            pubsub_name="support-pubsub",
            topic_name="escalated-tickets",
            data=json.dumps({"ticket_id": ticket_id, "reason": reason})
        )
        return f"Ticket {ticket_id} escalated: {reason}"
```

## Pub/Sub Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: support-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis.default:6379"
```

## Running the Support System

```bash
dapr run --app-id triage-agent --app-port 8080 \
  --resources-path ./components -- python triage_agent.py &

dapr run --app-id resolution-agent --app-port 8081 \
  --resources-path ./components -- python resolution_agent.py &
```

## Handling Incoming Tickets via HTTP

```python
from fastapi import FastAPI

app = FastAPI()

@app.post("/tickets")
async def submit_ticket(ticket: dict):
    agent = TriageAgent()
    result = await agent.run(
        f"Classify and route this ticket: {ticket['description']}. "
        f"Customer tier: {ticket.get('tier', 'free')}"
    )
    return {"status": "submitted", "result": result}
```

## Summary

A Dapr-based customer support system uses specialized agents connected by pub/sub messaging. The triage agent classifies and routes tickets, the resolution agent handles common issues using a knowledge base, and the escalation agent forwards complex cases to humans. Dapr's state store maintains ticket history across agent handoffs, ensuring no context is lost during escalation.
