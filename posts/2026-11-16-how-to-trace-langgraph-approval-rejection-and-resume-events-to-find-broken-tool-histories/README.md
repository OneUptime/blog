# How to Trace LangGraph Approvals and Resumes to Debug Broken Tool Histories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LangGraph, AI Agents, LLM Observability, Python

Description: Trace approval decisions and resumed LangGraph runs while preserving tool call identities and detecting incomplete message histories.

An approval workflow can resume successfully and still fail on its next model call. The human decision was recorded, but the resumed message list contains a tool result with the wrong ID, no result for a rejected tool, or two results produced by repeated execution.

Debug the approval lifecycle and the model message protocol as separate state machines. A valid human decision does not automatically create a valid tool history.

## Record identities before requesting approval

Persist the graph thread ID, pending tool call ID, proposed arguments reference, and an application approval ID. Also record a checkpoint reference when available. A request to approve `delete_report` is ambiguous if two calls to that tool are pending.

LangGraph interrupts require a checkpointer and a stable `thread_id`. Resume using `Command(resume=...)` with that same thread ID. The interrupted node starts again, so code before `interrupt()` executes again. Keep external writes after the decision or make them idempotent. [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts).

Use bounded event types such as `approval.requested`, `approval.decided`, `graph.resumed`, and `tool.completed`. Store raw arguments in a controlled artifact only when required; IDs and decision metadata usually suffice for tracing.

## Preserve the original tool call ID

This small runnable graph demonstrates one pending tool call. Install `langgraph` and `langchain-core` in an isolated environment. Its tool is a local simulation, not an external action. The in-memory checkpointer is suitable for the example; use durable storage for production resumes.

```python
from langchain_core.messages import AIMessage, ToolMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.types import Command, interrupt


def review_tool(state: MessagesState):
    call = state["messages"][-1].tool_calls[0]
    decision = interrupt({
        "tool_call_id": call["id"],
        "tool": call["name"],
        "args": call["args"],
    })
    if decision not in ("approve", "reject"):
        raise ValueError("expected approve or reject")
    result = (
        "Simulated report archived"
        if decision == "approve"
        else "Rejected by reviewer; no action performed"
    )
    return {"messages": [ToolMessage(
        content=result,
        tool_call_id=call["id"],
    )]}

builder = StateGraph(MessagesState)
builder.add_node("review_tool", review_tool)
builder.add_edge(START, "review_tool")
builder.add_edge("review_tool", END)
graph = builder.compile(checkpointer=InMemorySaver())
config = {"configurable": {"thread_id": "approval-example-1"}}
proposal = AIMessage(content="", tool_calls=[{
    "name": "archive_report",
    "args": {"report_id": "report-42"},
    "id": "call-42",
    "type": "tool_call",
}])
paused = graph.invoke({"messages": [proposal]}, config)
assert paused["__interrupt__"]
resumed = graph.invoke(Command(resume="reject"), config)
assert resumed["messages"][-1].tool_call_id == "call-42"
assert "no action" in resumed["messages"][-1].content
```

Returning a tool message for rejection tells the next model invocation what happened. It does not claim that the tool succeeded. If your product cancels the workflow instead, ending without another model call can also be valid. Define that branch explicitly.

For parallel tool calls, track each pending call independently and join all required results before invoking the model again. The one-call example deliberately does not implement parallel approvals.

## Check history at the model boundary

For the common chat tool-calling protocol, each assistant tool call needs one matching tool result before the next assistant generation. Missing, duplicate, or orphan results are different failures. LangChain documents this protocol in its invalid-tool-results guidance; that particular named error is currently specific to its JavaScript implementation. [LangChain tool-result protocol errors](https://docs.langchain.com/oss/python/langchain/errors/INVALID_TOOL_RESULTS).

Add a validation boundary immediately before your model adapter. Examine message types and tool call IDs, not the text of tool results. Store the number of proposed calls, matched results, unresolved calls, and duplicate result IDs on a diagnostic event. Do not apply a single global uniqueness rule across unrelated conversations.

If history was compacted, check that the compactor retained complete tool-call/result groups. If a reviewer edited arguments, retain the original call ID with the approved argument revision and record both revisions. Changing an ID without changing its corresponding messages breaks the association.

## Separate wait time from execution time

Close the active invocation span when the graph pauses. Start another span when it resumes, using the persisted approval and thread IDs for correlation. Human waiting time belongs in an approval-duration metric, not in the model's latency distribution.

Record a new attempt ID whenever execution restarts. An event before the interrupt may legitimately appear twice because the node reruns. Deduplicate business notifications by the durable approval identity, rather than hiding all repeated trace events.

## Reproduce the broken history

Use fixtures for approval, rejection, an edited argument, two parallel pending calls, a stale resume, and a resumed run after process restart. Inspect the exact history supplied to the model adapter, with content redacted as appropriate.

A trace should explain which decision matched which pending call, whether any side effect ran, and which tool result the model received. Once these relationships are visible, an apparent resume failure becomes a precise problem in routing, persistence, execution, or message assembly.
