# Preserve Parent-Child Traces Across Concurrent Tools and AI Agents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, LangGraph

Description: Keep concurrent tool calls and nested agents under the correct parent span using task-local context and explicit execution boundaries.

A trace that makes one tool call the parent of another concurrent tool call tells the wrong story. So does a nested agent that appears as an unrelated root. These problems often come from how instrumentation stores active context, rather than from the agent's execution graph.

The core rule is simple: the parent is the operation that caused the work. It is not whichever span happened to start most recently in the process.

## Model Concurrency as Siblings

For a request that invokes two tools concurrently, the expected structure is a request span, an agent span, and two sibling tool spans. Each tool can have its own HTTP or database children. A nested agent receives its own span under the delegating agent and becomes the parent of its own tools.

OpenTelemetry's current span is execution-context state. In Python, asynchronous context support depends on task-local context rather than a single process-wide stack. Python's `contextvars` module is designed for this kind of concurrent context handling. [Python context variables](https://docs.python.org/3/library/contextvars.html).

The following example uses Python 3.11 or later and an already configured OpenTelemetry SDK. The supplied tools are asynchronous application functions; no model provider is required.

```python
import asyncio
from opentelemetry import trace

tracer = trace.get_tracer("assistant.tools")


async def invoke_tool(name, function, argument):
    with tracer.start_as_current_span(f"tool.{name}") as span:
        span.set_attribute("app.tool.name", name)
        return await function(argument)


async def answer(question, search_tool, profile_tool):
    with tracer.start_as_current_span("agent.answer"):
        async with asyncio.TaskGroup() as group:
            search_task = group.create_task(
                invoke_tool("search", search_tool, question)
            )
            profile_task = group.create_task(
                invoke_tool("profile", profile_tool, "current-user")
            )
        return search_task.result(), profile_task.result()
```

Create both tasks while the intended parent is current. Each task creates its own tool span and keeps that span current during its function call. The task group also makes the parent wait for the child work. If a task fails, Python's structured concurrency rules cancel remaining tasks and report the failure through the group. [Python task groups](https://docs.python.org/3/library/asyncio-task.html#task-groups).

The attributes in this example are application-specific. Use bounded operation names rather than embedding prompts, account names, or arguments into span names.

## Avoid Shared Span Stacks

A callback bridge sometimes keeps `self.current_span` and changes it whenever a run starts. Under concurrency, the second callback overwrites the first tool's parent. An ordinary list used as a stack has the same flaw: completion order does not necessarily reverse start order.

If you maintain a bridge from framework runs to spans, index spans by framework run ID. Resolve `parent_run_id` explicitly, and synchronize access when callbacks can run on several threads. End the span associated with the completion callback's run ID, not the last span in a global list.

Also distinguish creating a span from making it current. A callback that creates a span and leaves a context token attached across unrelated callbacks can contaminate another execution. A token must be detached in the context that attached it. When you do not own the execution scope, prefer a maintained framework integration over manually holding context managers open.

## Pass Configuration Through Nested Framework Calls

A nested graph needs both tracing context and the framework configuration that carries callbacks and metadata. Those are related, but they are not interchangeable. An OpenTelemetry parent ID does not automatically restore a discarded LangChain callback manager.

Inside a LangGraph node that calls another runnable, accept the incoming config and pass it into the nested invocation:

```python
async def nested_node(state, config, *, nested_agent):
    result = await nested_agent.ainvoke(
        {"messages": state["messages"]},
        config=config,
    )
    return {"messages": result["messages"]}
```

Bind `nested_agent` when registering your application node, for example with a closure. The snippet illustrates forwarding configuration, not a complete graph definition. LangGraph documents explicit configuration forwarding for async streaming on Python versions before 3.11; forwarding it deliberately also makes custom boundaries easier to inspect. [LangGraph streaming](https://docs.langchain.com/oss/python/langgraph/streaming).

## Handle Detached Work as a Different Lifetime

A task scheduled after an HTTP response may outlive its initiating span. That does not inherently invalidate the trace, but a process restart or long delay makes a single giant trace operationally awkward. For durable background work, serialize propagation headers into the job and start a consumer span on the worker. For a new lifecycle or work with multiple causes, consider a new trace with span links.

Never keep a span open merely because a conversation may resume tomorrow. Model each active invocation separately and use an application conversation ID to group them. Trace lifetime and conversation lifetime serve different purposes.

## Prove the Parentage

Use two fake tools with deliberately reversed completion order. Export spans to an in-memory exporter and assert that both tools have the agent span ID as their parent and share its trace ID. Then invoke two requests concurrently and ensure no span crosses between their trace IDs.

Add a nested agent, a failing tool, and cancellation. Check that every started application span eventually ends and that failed requests remain identifiable. Seeing a plausible diagram in one successful request is insufficient evidence for concurrent correctness.

## Conclusion

Correct parentage follows execution scope. Create tasks under their intended parent, preserve framework configuration, and replace shared callback stacks with run-ID-based bookkeeping when custom instrumentation is unavoidable.

## Official Documentation

- [Python context variables](https://docs.python.org/3/library/contextvars.html)
- [Python task groups](https://docs.python.org/3/library/asyncio-task.html#task-groups)
- [OpenTelemetry context specification](https://opentelemetry.io/docs/specs/otel/context/)
- [LangGraph streaming and async configuration](https://docs.langchain.com/oss/python/langgraph/streaming)
