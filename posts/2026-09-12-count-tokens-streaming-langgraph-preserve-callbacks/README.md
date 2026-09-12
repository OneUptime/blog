# Count Tokens in Streaming LangGraph Without Breaking Callbacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, LangGraph

Description: Collect LangGraph model usage while preserving callback managers, stream delivery, nested configuration, and per-request accounting.

Adding token accounting to a streaming LangGraph application should not remove tracing, stop UI updates, or replace callbacks installed by the hosting framework. The common mistake is assigning a new `callbacks` list and silently discarding the original configuration.

A second mistake is counting message chunks as tokens. Use completed model usage for accounting and keep streaming events for user interface delivery.

## Use the Framework's Usage Callback

LangChain provides `UsageMetadataCallbackHandler`, which accumulates usage from model responses. The handler collects `AIMessage.usage_metadata` and groups it by model name; the current implementation expects `response_metadata['model_name']` as well. An empty result may therefore indicate missing provider metadata rather than zero consumption. [Usage callback source](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/callbacks/usage.py).

Create one handler per logical request. A global handler mixes users, concurrent requests, and old totals. The callback uses synchronization internally, but that does not make process-lifetime totals appropriate for request billing.

Use configuration merging to preserve existing callback lists or managers:

```python
from langchain_core.callbacks import UsageMetadataCallbackHandler
from langchain_core.runnables.config import merge_configs


def stream_with_usage(graph, inputs, base_config, emit):
    usage = UsageMetadataCallbackHandler()
    config = merge_configs(base_config, {"callbacks": [usage]})
    for message, metadata in graph.stream(
        inputs,
        config=config,
        stream_mode="messages",
        version="v1",
    ):
        emit(message, metadata)
    return usage.usage_metadata
```

This helper expects an existing compiled graph and an application `emit` function. It explicitly requests the `v1` tuple format; stream shapes differ when you choose other versions or multiple modes. Check the version supported by your installed LangGraph package. [LangGraph streaming](https://docs.langchain.com/oss/python/langgraph/streaming).

`merge_configs` supports callback lists and callback managers, which is safer than treating every incoming callback value as iterable. It also preserves other invocation configuration, including checkpoint identifiers, tags, and metadata. [LangChain configuration implementation](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/runnables/config.py).

## Consume the Entire Stream

The callback receives completed model results. If the application stops iterating immediately after the first visible content, it may never receive final usage. Handle cancellation and stream closure through your provider and framework's lifecycle, then record that the request ended before final accounting was available.

A UI failure can also interrupt stream consumption. Decide whether the model request should be cancelled or drained, and account for the resulting policy. Continuing generation after a disconnect may still consume tokens even though the user saw only a partial answer.

Do not synthesize zeros for missing totals. Record a state such as `usage_unavailable` with the terminal reason, and retain an estimate in a separate field if needed for operational reporting.

## Forward Configuration Inside Custom Nodes

When a custom node calls a model or another runnable, keep the received config:

```python
async def model_node(state, config, *, model):
    response = await model.ainvoke(
        state["messages"],
        config=config,
    )
    return {"messages": [response]}
```

Bind the model when registering this node. This example returns an update suitable for a message state with the appropriate reducer; it is not a complete graph definition.

Python versions before 3.11 need explicit config forwarding for certain async streaming scenarios, as documented by LangGraph. Even on newer Python versions, code that creates fresh configs or calls a model outside the graph's scope can discard intended instrumentation.

Do not append the same usage callback at both the graph entry and every model call. Depending on how configurations combine, duplicate registrations can deliver the same completion more than once. Add it at a clear ownership boundary and verify the number of completion callbacks for one model attempt.

## Separate Aggregation from a Billing Ledger

The handler's model-level totals are useful for a request summary. They are not a durable, idempotent ledger. A replayed event, multiple instrumentation layers, or a resumed workflow can otherwise count the same provider response twice.

For durable accounting, record one event per model attempt with a unique attempt ID, provider response ID when present, final usage, and usage status. Deduplicate on ingestion. Keep request totals derived from those attempt records so a late usage correction updates a known row rather than adding another charge.

Inspect provider-specific cache and reasoning details before computing money. A total token count is not always a single price category. Keep the pricing version and model identity alongside any estimate.

## Test Without Spending Provider Tokens

Use a fake chat model that returns `AIMessage` instances with known usage and a `model_name`. Put it inside a small compiled graph. Attach both a counting callback and the usage callback, then verify the original callback still fires and usage equals the synthetic input and output totals.

Test a callback manager as well as a plain list. Add two model invocations to verify aggregation, two concurrent requests to verify isolation, and a model response with no usage to verify missing data handling. Finally, run one small integration request against your configured provider, because a synthetic model cannot prove that the provider emits streaming usage correctly.

## Conclusion

Merge callbacks into the existing invocation config, consume streams through completion, and let final model metadata drive token counts. Keep request summaries separate from durable attempt accounting so callbacks remain composable and totals remain explainable.

## Official Documentation

- [LangChain usage callback implementation](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/callbacks/usage.py)
- [LangChain configuration merging](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/runnables/config.py)
- [LangGraph streaming modes and async configuration](https://docs.langchain.com/oss/python/langgraph/streaming)
