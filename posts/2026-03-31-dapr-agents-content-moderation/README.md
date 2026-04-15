# How to Use Dapr Agents for Content Moderation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Content Moderation, Safety, AI

Description: Build a scalable AI content moderation system with Dapr Agents that classifies, filters, and routes user-generated content using multi-model verification.

---

## Content Moderation Architecture

A production content moderation system needs:

- **Fast pre-screening** - rule-based or small model for obvious violations
- **AI classification** - LLM for nuanced content assessment
- **Human review queue** - for edge cases and appeals
- **Audit trail** - immutable record of moderation decisions

Dapr Agents provide the orchestration layer with durable state and pub/sub for routing.

## Building the Pre-Screening Agent

```python
import re
from dapr_agents import Agent, tool
from dapr.clients import DaprClient
import json

class PreScreeningAgent(Agent):
    name = "prescreening-agent"
    instructions = """You perform rapid content pre-screening.
    Apply deterministic rules first, then flag ambiguous content
    for deeper AI analysis. Always err on the side of caution."""

    BLOCKLIST = ["spam-keyword-1", "blocked-phrase-2"]

    @tool
    def apply_blocklist(self, content: str) -> str:
        """Checks content against the known violation blocklist.

        Args:
            content: The user-generated content to check.
        """
        content_lower = content.lower()
        violations = [term for term in self.BLOCKLIST if term in content_lower]
        if violations:
            return json.dumps({"action": "block", "reason": f"Blocklist matches: {violations}"})
        return json.dumps({"action": "pass", "reason": "No blocklist matches"})

    @tool
    def check_spam_patterns(self, content: str) -> str:
        """Detects common spam patterns in content.

        Args:
            content: Content to check for spam patterns.
        """
        patterns = [
            r"(https?://\S+\s*){5,}",  # Excessive URLs
            r"(.)\1{10,}",              # Repeated characters
            r"\b(buy|win|free|click)\b.*\b(now|today|limited)\b"  # Spam phrases
        ]
        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return json.dumps({"action": "block", "reason": "Spam pattern detected"})
        return json.dumps({"action": "pass", "reason": "No spam patterns"})
```

## Building the AI Classification Agent

```python
from dapr_agents import Agent, tool
from dapr_agents.llm import OpenAIChatClient

class ContentClassificationAgent(Agent):
    name = "classification-agent"
    instructions = """You are a content safety classifier. Evaluate content
    for: hate speech, harassment, violence, adult content, misinformation.
    Rate each dimension 0-10 and provide a final verdict: approve, flag, or remove.
    Be precise and consistent. When in doubt, flag for human review."""

    @tool
    def classify_content(self, content: str, context: str = "") -> str:
        """Performs detailed AI classification of content safety.

        Args:
            content: The content to classify.
            context: Optional context about the content source or user.
        """
        # The agent's LLM will perform the actual classification
        # This tool provides structure for the classification output
        return f"Content ready for classification (length: {len(content)} chars)"

    @tool
    def save_decision(self, content_id: str, verdict: str, scores: str) -> str:
        """Saves a moderation decision to the audit log.

        Args:
            content_id: Unique identifier for the content item.
            verdict: Final verdict (approve, flag, remove).
            scores: JSON string with category scores.
        """
        from dapr.clients import DaprClient
        import json
        from datetime import datetime, timezone

        decision = {
            "content_id": content_id,
            "verdict": verdict,
            "scores": json.loads(scores),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model": "gpt-4o-moderation"
        }
        DaprClient().save_state("statestore", f"mod-{content_id}", json.dumps(decision))
        return f"Decision saved for {content_id}: {verdict}"

    @tool
    def route_for_human_review(self, content_id: str, reason: str) -> str:
        """Routes flagged content to the human review queue.

        Args:
            content_id: The content identifier to escalate.
            reason: Why human review is needed.
        """
        from dapr.clients import DaprClient
        import json
        DaprClient().publish_event(
            pubsub_name="mod-pubsub",
            topic_name="human-review-queue",
            data=json.dumps({"content_id": content_id, "reason": reason})
        )
        return f"Content {content_id} queued for human review: {reason}"
```

## Moderation Pipeline Endpoint

```python
from fastapi import FastAPI, BackgroundTasks
from dapr_agents.llm import OpenAIChatClient

app = FastAPI()

@app.post("/moderate")
async def moderate_content(
    payload: dict,
    background_tasks: BackgroundTasks
):
    content_id = payload["id"]
    content = payload["content"]

    # Run pre-screening synchronously (fast)
    prescreening_agent = PreScreeningAgent(llm=OpenAIChatClient(model="gpt-4o-mini"))
    screen_result = await prescreening_agent.run(
        f"Screen this content (ID: {content_id}): {content[:500]}"
    )

    if "block" in screen_result.lower():
        return {"content_id": content_id, "verdict": "removed", "stage": "prescreening"}

    # Run deep classification asynchronously
    background_tasks.add_task(deep_classify, content_id, content)
    return {"content_id": content_id, "verdict": "pending", "stage": "ai-review"}

async def deep_classify(content_id: str, content: str):
    agent = ContentClassificationAgent(llm=OpenAIChatClient(model="gpt-4o"))
    await agent.run(f"Classify content ID {content_id}: {content}")
```

## Running the Moderation System

```bash
dapr run --app-id prescreening-agent --app-port 8080 \
  --components-path ./components -- uvicorn prescreening:app --port 8080

dapr run --app-id classification-agent --app-port 8081 \
  --components-path ./components -- uvicorn classification:app --port 8081
```

## Summary

A Dapr-based content moderation system combines fast rule-based pre-screening with deep AI classification and human review routing. Pre-screening agents handle obvious violations synchronously, AI classification agents process ambiguous content asynchronously, and all decisions are saved to an immutable audit log in the Dapr state store. Dapr pub/sub routes flagged content to human reviewers without coupling the agents.
