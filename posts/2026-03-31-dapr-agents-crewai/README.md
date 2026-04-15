# How to Use Dapr Agents with CrewAI Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, CrewAI, Multi-Agent, Integration

Description: Learn how to integrate CrewAI with Dapr Agents to combine CrewAI's role-based agent orchestration with Dapr's durable state management and pub/sub messaging.

---

## Why Combine CrewAI and Dapr?

CrewAI excels at defining multi-agent crews with specific roles, goals, and task sequences. Dapr provides the operational infrastructure that CrewAI lacks: durable state, persistent memory, pub/sub for async communication, and Kubernetes-native deployment. Combining them gives you CrewAI's intuitive agent orchestration with Dapr's production-grade reliability.

## Installation

```bash
pip install crewai dapr dapr-agents
```

## Building a CrewAI Crew with Dapr-Backed Memory

```python
from crewai import Agent, Task, Crew, Process
from dapr.clients import DaprClient
import json

dapr_client = DaprClient()

def save_crew_result(crew_id: str, result: str):
    """Saves crew execution results to Dapr state store."""
    dapr_client.save_state("statestore", f"crew-result-{crew_id}", result)

def load_crew_context(crew_id: str) -> str:
    """Loads previous crew execution context from Dapr."""
    state = dapr_client.get_state("statestore", f"crew-context-{crew_id}")
    return state.data.decode() if state.data else ""
```

## Defining a Research and Writing Crew

```python
from crewai import Agent, Task, Crew
from crewai.tools import tool as crewai_tool
from dapr.clients import DaprClient

# Define agents with CrewAI's role-based syntax
researcher = Agent(
    role="Senior Research Analyst",
    goal="Research topics thoroughly and extract key insights",
    backstory="""You are an expert researcher with years of experience
    synthesizing complex information into actionable insights.""",
    verbose=True
)

writer = Agent(
    role="Content Writer",
    goal="Write clear, engaging content based on research findings",
    backstory="""You are a skilled writer who transforms research
    into compelling, accessible content for technical audiences.""",
    verbose=True
)

# Dapr-aware tool for the researcher
@crewai_tool("Search Knowledge Base")
def search_knowledge_base(query: str) -> str:
    """Searches the internal knowledge base for relevant information."""
    dapr_client = DaprClient()
    # In practice, query a vector store via Dapr state
    result = dapr_client.get_state("statestore", f"kb-{query.replace(' ', '-').lower()}")
    if result.data:
        return result.data.decode()
    return f"No cached results for '{query}'. Proceeding with general knowledge."

@crewai_tool("Save Research Finding")
def save_finding(topic: str, finding: str) -> str:
    """Saves a research finding to the shared state store."""
    dapr_client = DaprClient()
    dapr_client.save_state("statestore", f"finding-{topic}", finding)
    return f"Finding saved for topic: {topic}"

# Assign tools to the researcher
researcher.tools = [search_knowledge_base, save_finding]
```

## Defining CrewAI Tasks

```python
research_task = Task(
    description="""Research the topic: {topic}
    Search the knowledge base for existing information.
    Save key findings using the save_finding tool.
    Provide a comprehensive research summary.""",
    expected_output="Structured research summary with key facts and insights",
    agent=researcher
)

writing_task = Task(
    description="""Using the research findings, write a comprehensive article about {topic}.
    The article should be 600-800 words, well-structured with headers,
    and accessible to a technical audience.""",
    expected_output="A complete, polished article ready for publication",
    agent=writer,
    context=[research_task]
)
```

## Running the Crew with Dapr Integration

```python
from fastapi import FastAPI, BackgroundTasks
import uuid

app = FastAPI()

@app.post("/run-crew")
async def run_crew(request: dict, background_tasks: BackgroundTasks):
    crew_id = str(uuid.uuid4())
    topic = request["topic"]

    # Run crew asynchronously
    background_tasks.add_task(execute_crew, crew_id, topic)

    # Notify via Dapr pub/sub
    dapr_client.publish_event(
        pubsub_name="pubsub",
        topic_name="crew-started",
        data=json.dumps({"crew_id": crew_id, "topic": topic})
    )

    return {"crew_id": crew_id, "status": "started"}

async def execute_crew(crew_id: str, topic: str):
    crew = Crew(
        agents=[researcher, writer],
        tasks=[research_task, writing_task],
        process=Process.sequential,
        verbose=True
    )

    result = crew.kickoff(inputs={"topic": topic})

    # Save result to Dapr state store
    save_crew_result(crew_id, str(result))

    # Publish completion event
    dapr_client.publish_event(
        pubsub_name="pubsub",
        topic_name="crew-completed",
        data=json.dumps({"crew_id": crew_id, "result_preview": str(result)[:200]})
    )

@app.get("/crew-result/{crew_id}")
async def get_crew_result(crew_id: str):
    state = dapr_client.get_state("statestore", f"crew-result-{crew_id}")
    return {"crew_id": crew_id, "result": state.data.decode() if state.data else "Not ready yet"}
```

## Running the Integration

```bash
export OPENAI_API_KEY="sk-your-key"

dapr run --app-id crewai-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --components-path ./components \
  -- uvicorn crew_service:app --port 8080
```

## Summary

Combining CrewAI with Dapr provides role-based multi-agent orchestration backed by Dapr's durable state and pub/sub. Define agents and tasks with CrewAI's expressive syntax, equip agents with Dapr-aware tools that read and write to the state store, run crews asynchronously with FastAPI background tasks, and publish completion events via Dapr pub/sub for downstream processing.
