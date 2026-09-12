# Restore MLflow Traces for Custom LangGraph StateGraph Runs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, MLflow

Description: Troubleshoot missing MLflow traces from custom StateGraph runs by checking autolog setup, compatible packages, execution paths, and async context.

A custom `StateGraph` runs correctly, but the MLflow Traces tab stays empty. It is tempting to conclude that MLflow only traces prebuilt agents. Current MLflow documentation explicitly supports LangGraph through its LangChain integration, so begin with instrumentation and execution boundaries instead.

The investigation should establish whether tracing works at all, whether the compiled graph is invoked through an instrumented path, and whether custom code preserves the expected context.

## Check the Integration You Enabled

MLflow documents `mlflow.langchain.autolog()` as the Python entry point for automatic LangGraph tracing. Enabling a provider-specific integration alone can capture model calls without giving the graph structure you expect. [MLflow LangGraph integration](https://mlflow.org/docs/latest/genai/tracing/integrations/listing/langgraph/).

Run autolog setup in the actual worker process before graph execution. Notebook cells, web workers, and queue workers have separate initialization paths. A call made in a development shell does not instrument a separately launched service.

Also verify that trace logging has not been disabled. The LangChain autolog API exposes `log_traces`, `disable`, `silent`, and compatibility controls. Keep warnings visible during diagnosis and compare the installed package set with the compatibility range documented for your MLflow release. [MLflow LangChain API](https://mlflow.org/docs/latest/api_reference/python_api/mlflow.langchain.html).

Avoid copying a version range from an old incident into a permanent runbook. Pin a tested combination of MLflow, LangChain, langchain-core, LangGraph, and provider packages in the application lockfile.

## Use a Graph That Needs No Provider

Start with a small graph containing only deterministic application code. Configure a local MLflow server through `MLFLOW_TRACKING_URI`; do not put credentials into the script.

```python
import os
from typing import TypedDict

import mlflow
from langgraph.graph import END, START, StateGraph

mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])
mlflow.set_experiment("langgraph-trace-smoke")
mlflow.langchain.autolog(log_traces=True, silent=False)


class State(TypedDict):
    question: str
    answer: str


def answer_node(state: State):
    return {"answer": "received: " + state["question"]}


builder = StateGraph(State)
builder.add_node("answer", answer_node)
builder.add_edge(START, "answer")
builder.add_edge("answer", END)
graph = builder.compile()

result = graph.invoke({"question": "synthetic test", "answer": ""})
assert result["answer"] == "received: synthetic test"
```

Invoke the compiled graph, not just the node function. A direct `answer_node(...)` call bypasses graph execution and cannot prove that graph autologging works. Compilation defines the executable graph, while invocation creates runtime activity. [LangGraph graph API](https://docs.langchain.com/oss/python/langgraph/graph-api).

Open the configured experiment's Traces tab. MLflow Runs and Traces are different objects; logging a metric or entering `mlflow.start_run()` does not itself create a trace. [MLflow tracing FAQ](https://mlflow.org/docs/latest/genai/tracing/faq/).

## Isolate Export from Autologging

If the graph trace is absent, add a standalone manual trace as a separate diagnostic:

```python
@mlflow.trace(name="manual_smoke")
def manual_smoke(value):
    return {"result": value + 1}

assert manual_smoke(1) == {"result": 2}
```

MLflow supports decorators and explicit spans for custom functions. If the manual trace appears but the graph trace does not, focus on integration compatibility, setup timing, and the invoked path. If neither appears, inspect the tracking URI, experiment selection, authentication, server logs, and export behavior. [MLflow manual tracing](https://mlflow.org/docs/latest/genai/tracing/app-instrumentation/manual-tracing/).

Do not wrap every graph node in a decorator just to make an empty UI disappear. That can obscure the root issue and later produce duplicate nested instrumentation after autologging is fixed. Add manual spans where custom operations need their own semantic boundary.

## Check Async Context and Custom Calls

Reproduce the issue with synchronous `invoke` first, then compare with `ainvoke` and streaming. If only async execution is broken, inspect the Python version, callback propagation, and how custom tasks are created.

Pass the incoming runnable config into nested model or graph calls. Code that constructs a fresh config can discard callback state. For older Python async environments, LangGraph documents explicit config propagation requirements. [LangGraph streaming](https://docs.langchain.com/oss/python/langgraph/streaming).

The current MLflow LangChain API includes `run_tracer_inline`, documented for context propagation when manual tracing and async autologging interact. Evaluate that option against your installed release and a minimal reproduction rather than enabling it blindly across the application.

If graph nodes call a custom provider client that is not instrumented, expect the graph structure without detailed provider spans. Add the supported provider integration or a manual span around that client. Graph visibility and provider visibility are distinct layers.

## Verify Completion and Worker Lifetime

Consume a streaming run to completion during the smoke test. A consumer that abandons an iterator can prevent normal terminal callbacks or leave usage incomplete. Then test cancellation explicitly, with the cleanup required by your framework and client.

Short-lived processes may exit before asynchronous exports finish. Follow the MLflow release's documented flushing behavior and inspect export errors. Do not assume a successful function return proves successful trace ingestion.

After the minimal graph works, restore your custom nodes one at a time. Compare span names, parent relationships, inputs allowed by the capture policy, and error outcomes. Keep one deterministic graph fixture in your integration checks so future dependency upgrades reveal tracing regressions before production.

## Conclusion

Custom StateGraph runs are supported by current MLflow tracing. Use a provider-free graph and a manual smoke trace to separate graph instrumentation problems from export, compatibility, and context issues.

## Official Documentation

- [MLflow LangGraph tracing](https://mlflow.org/docs/latest/genai/tracing/integrations/listing/langgraph/)
- [MLflow LangChain autolog API](https://mlflow.org/docs/latest/api_reference/python_api/mlflow.langchain.html)
- [MLflow manual tracing](https://mlflow.org/docs/latest/genai/tracing/app-instrumentation/manual-tracing/)
- [MLflow tracing FAQ](https://mlflow.org/docs/latest/genai/tracing/faq/)
- [LangGraph graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [LangGraph streaming](https://docs.langchain.com/oss/python/langgraph/streaming)
