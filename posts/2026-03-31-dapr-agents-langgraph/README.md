# How to Use Dapr Agents with LangGraph Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, LangGraph, LangChain, Graph

Description: Learn how to integrate LangGraph with Dapr to build stateful graph-based AI agent workflows with Dapr's durable state management and pub/sub messaging.

---

## Why LangGraph and Dapr Together?

LangGraph lets you define agent workflows as directed graphs with conditional branching, loops, and parallel execution. Dapr provides the persistence and messaging infrastructure LangGraph needs for production deployments. Together, you get:

- LangGraph's expressive workflow graphs
- Dapr's durable state (graph state survives restarts)
- Pub/sub for async graph triggering
- Kubernetes-native deployment

## Installation

```bash
pip install langgraph langchain-openai dapr dapr-agents
```

## Defining a LangGraph Agent with Dapr State Checkpointing

LangGraph supports custom checkpointers. Here is a Dapr-backed checkpointer:

```python
from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple
from dapr.clients import DaprClient
import pickle
import base64
from typing import Any, Iterator, Optional, Sequence

class DaprCheckpointer(BaseCheckpointSaver):
    """LangGraph checkpointer backed by Dapr state store."""

    def __init__(self, store_name: str = "statestore"):
        super().__init__()
        self.store_name = store_name

    def get_tuple(self, config: dict) -> CheckpointTuple | None:
        thread_id = config["configurable"]["thread_id"]
        with DaprClient() as client:
            state = client.get_state(self.store_name, f"langgraph-{thread_id}")
        if state.data:
            data = pickle.loads(base64.b64decode(state.data))
            return CheckpointTuple(
                config=config,
                checkpoint=data["checkpoint"],
                metadata=data.get("metadata", {}),
            )
        return None

    def put(self, config: dict, checkpoint: Checkpoint, metadata: CheckpointMetadata, new_versions: dict) -> dict:
        thread_id = config["configurable"]["thread_id"]
        data = {"checkpoint": checkpoint, "metadata": metadata}
        serialized = base64.b64encode(pickle.dumps(data)).decode()
        with DaprClient() as client:
            client.save_state(self.store_name, f"langgraph-{thread_id}", serialized)
        return config

    def put_writes(self, config: dict, writes: Sequence[tuple[str, Any]], task_id: str) -> None:
        pass

    def list(self, config: Optional[dict], *, filter: Optional[dict[str, Any]] = None, before: Optional[dict] = None, limit: Optional[int] = None) -> Iterator[CheckpointTuple]:
        return iter([])
```

## Building a Research Agent Graph

```python
from typing import TypedDict, Annotated, Sequence
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
import operator

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    research_complete: bool
    draft_complete: bool


llm = ChatOpenAI(model="gpt-4o")

def research_node(state: AgentState) -> AgentState:
    """Performs research based on the user's question."""
    last_message = state["messages"][-1].content
    response = llm.invoke([
        HumanMessage(content=f"Research this topic thoroughly: {last_message}")
    ])
    return {
        "messages": [AIMessage(content=f"Research complete: {response.content}")],
        "research_complete": True,
        "draft_complete": False
    }

def writing_node(state: AgentState) -> AgentState:
    """Writes a draft based on research findings."""
    research = next(
        (m.content for m in reversed(state["messages"]) if "Research complete" in m.content),
        ""
    )
    response = llm.invoke([
        HumanMessage(content=f"Write an article based on: {research}")
    ])
    return {
        "messages": [AIMessage(content=response.content)],
        "research_complete": True,
        "draft_complete": True
    }

def review_node(state: AgentState) -> AgentState:
    """Reviews and improves the draft."""
    draft = state["messages"][-1].content
    response = llm.invoke([
        HumanMessage(content=f"Review and improve this article: {draft}")
    ])
    return {
        "messages": [AIMessage(content=response.content)],
        "research_complete": True,
        "draft_complete": True
    }

def should_continue(state: AgentState) -> str:
    """Determines the next node based on workflow state."""
    if not state.get("research_complete"):
        return "research"
    if not state.get("draft_complete"):
        return "write"
    return "review"
```

## Assembling the Graph

```python
workflow = StateGraph(AgentState)

workflow.add_node("research", research_node)
workflow.add_node("write", writing_node)
workflow.add_node("review", review_node)

workflow.set_conditional_entry_point(
    should_continue,
    {
        "research": "research",
        "write": "write",
        "review": "review"
    }
)

workflow.add_edge("research", "write")
workflow.add_edge("write", "review")
workflow.add_edge("review", END)

# Compile with Dapr checkpointing
dapr_checkpointer = DaprCheckpointer()
app = workflow.compile(checkpointer=dapr_checkpointer)
```

## Running with Thread-Based State

```python
from fastapi import FastAPI

api = FastAPI()

@api.post("/graph/{thread_id}")
async def run_graph(thread_id: str, request: dict):
    config = {"configurable": {"thread_id": thread_id}}
    result = app.invoke(
        {"messages": [HumanMessage(content=request["message"])],
         "research_complete": False,
         "draft_complete": False},
        config=config
    )
    return {"thread_id": thread_id, "output": result["messages"][-1].content}
```

## Running with Dapr

```bash
export OPENAI_API_KEY="sk-your-key"

dapr run --app-id langgraph-agent \
  --app-port 8080 \
  --components-path ./components \
  -- uvicorn graph_service:api --port 8080
```

## Summary

LangGraph integrates with Dapr through a custom `DaprCheckpointer` that persists graph state to the Dapr state store. This enables graph workflows to resume after process restarts, supports concurrent threads with separate state, and allows Dapr pub/sub to trigger graph executions asynchronously. The combination delivers LangGraph's flexible graph-based orchestration with Dapr's production-ready operational infrastructure.
