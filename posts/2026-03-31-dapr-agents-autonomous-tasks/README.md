# How to Use Dapr Agents for Autonomous Task Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Autonomous, Task Execution, AI

Description: Learn how to build autonomous AI agents with Dapr that execute multi-step tasks independently, make decisions, and complete goals without human intervention.

---

## What Is Autonomous Agent Execution?

An autonomous agent receives a high-level goal and independently plans and executes the steps needed to achieve it. Unlike simple Q&A agents, autonomous agents:

- Break goals into subtasks
- Execute tools in sequence or parallel
- React to results and adjust their plan
- Decide when the goal is complete
- Handle errors and retry failed steps

Dapr provides the durable execution infrastructure for long-running autonomous tasks.

## Building an Autonomous Research Agent

```python
from dapr_agents import DurableAgent, tool, OpenAIChatClient, AgentRunner
from dapr_agents.agents.configs import AgentExecutionConfig
from dapr.clients import DaprClient
import json
import time


@tool
def web_search(query: str) -> str:
    """Searches the web for information on a specific query.

    Args:
        query: The search query to execute.
    """
    # Integrate with Serper, Tavily, or SerpAPI
    import httpx
    try:
        response = httpx.post(
            "https://api.tavily.com/search",
            json={"query": query, "max_results": 5},
            headers={"Authorization": "Bearer your-tavily-key"},
            timeout=15
        )
        results = response.json().get("results", [])
        summaries = [f"- {r['title']}: {r['content'][:200]}" for r in results[:3]]
        return "\n".join(summaries)
    except Exception as e:
        return f"Search failed: {str(e)}. Using general knowledge."


@tool
def read_webpage(url: str) -> str:
    """Reads and extracts text content from a webpage.

    Args:
        url: The URL of the webpage to read.
    """
    import httpx
    from html.parser import HTMLParser

    class TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text = []
        def handle_data(self, data):
            self.text.append(data.strip())

    try:
        response = httpx.get(url, timeout=10, follow_redirects=True)
        parser = TextExtractor()
        parser.feed(response.text)
        text = " ".join(filter(None, parser.text))
        return text[:3000]
    except Exception as e:
        return f"Could not read {url}: {str(e)}"


@tool
def save_finding(task_id: str, category: str, finding: str) -> str:
    """Saves a research finding to the task's knowledge store.

    Args:
        task_id: The unique task identifier.
        category: The category or research question this addresses.
        finding: The finding or insight to save.
    """
    key = f"finding-{task_id}-{category.replace(' ', '-').lower()}"
    with DaprClient() as client:
        client.save_state("statestore", key, json.dumps({
            "category": category,
            "finding": finding,
            "timestamp": time.time()
        }))
    return f"Finding saved under category: {category}"


@tool
def compile_and_save_report(task_id: str, report: str) -> str:
    """Compiles findings into a final report and marks the task complete.

    Args:
        task_id: The unique task identifier.
        report: The complete research report text.
    """
    with DaprClient() as client:
        client.save_state("statestore", f"report-{task_id}", json.dumps({
            "task_id": task_id,
            "report": report,
            "completed_at": time.time(),
            "status": "complete"
        }))
        # Publish completion event
        client.publish_event(
            pubsub_name="pubsub",
            topic_name="task-completed",
            data=json.dumps({"task_id": task_id, "type": "research"})
        )
    return f"Report saved and task {task_id} marked complete."


# Create the autonomous research agent
research_agent = DurableAgent(
    name="autonomous-research-agent",
    role="Research Agent",
    instructions=[
        "You are an autonomous research agent.",
        "When given a research goal, break it into 3-5 specific research questions.",
        "Research each question using available tools.",
        "Synthesize findings into a comprehensive report.",
        "Save the final report when complete.",
        "Work independently. Do not ask for clarification - make reasonable assumptions.",
        "Mark the task complete when you have a comprehensive report."
    ],
    tools=[web_search, read_webpage, save_finding, compile_and_save_report],
    llm=OpenAIChatClient(model="gpt-4o"),
    execution=AgentExecutionConfig(max_iterations=20),
)
```

## Submitting Autonomous Tasks

```python
from fastapi import FastAPI, BackgroundTasks
import uuid

app = FastAPI()

@app.post("/tasks/research")
async def create_research_task(request: dict, background: BackgroundTasks):
    task_id = str(uuid.uuid4())
    goal = request["goal"]

    # Save task metadata
    with DaprClient() as client:
        client.save_state("statestore", f"task-{task_id}", json.dumps({
            "task_id": task_id,
            "goal": goal,
            "status": "running",
            "created_at": time.time()
        }))

    # Run autonomously in background
    background.add_task(run_autonomous_task, task_id, goal)
    return {"task_id": task_id, "status": "started"}

async def run_autonomous_task(task_id: str, goal: str):
    runner = AgentRunner()
    try:
        await runner.run(
            research_agent,
            payload={
                "task": (
                    f"Task ID: {task_id}\n"
                    f"Research Goal: {goal}\n\n"
                    f"Work autonomously to complete this research goal. "
                    f"Save your findings as you go, then compile and save the final report."
                )
            }
        )
    except Exception as e:
        with DaprClient() as client:
            client.save_state("statestore", f"task-{task_id}", json.dumps({
                "task_id": task_id, "status": "failed", "error": str(e)
            }))
    finally:
        runner.shutdown(research_agent)
```

## Monitoring Autonomous Task Progress

```python
@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    with DaprClient() as client:
        state = client.get_state("statestore", f"task-{task_id}")
    if not state.data:
        return {"error": "Task not found"}
    return json.loads(state.data)

@app.get("/tasks/{task_id}/report")
async def get_task_report(task_id: str):
    with DaprClient() as client:
        state = client.get_state("statestore", f"report-{task_id}")
    if not state.data:
        return {"status": "not ready"}
    return json.loads(state.data)
```

## Safety Controls for Autonomous Agents

Limit what autonomous agents can do:

```python
@tool
def safe_web_search(query: str) -> str:
    """Searches the web for information, restricted to approved domains."""
    if len(query) > 200:
        return "Query too long. Please shorten it."
    return web_search(query)

safe_agent = DurableAgent(
    name="safe-autonomous-agent",
    role="Research Agent",
    instructions=[
        "You are a safe autonomous research agent.",
        "Only search approved domains: wikipedia.org, arxiv.org, github.com.",
        "When given a research goal, break it into specific research questions.",
        "Research each question, synthesize findings, and save the final report."
    ],
    tools=[safe_web_search, read_webpage, save_finding, compile_and_save_report],
    llm=OpenAIChatClient(model="gpt-4o"),
    execution=AgentExecutionConfig(max_iterations=15),
)
```

## Summary

Autonomous Dapr Agents receive high-level goals and independently execute multi-step plans using tools like web search, page reading, and state storage. Run them asynchronously via background tasks to avoid blocking HTTP requests. Monitor progress through the Dapr state store, where agents save intermediate findings and final reports. Add safety controls by limiting `max_iterations` through `AgentExecutionConfig` and restricting tool capabilities.
