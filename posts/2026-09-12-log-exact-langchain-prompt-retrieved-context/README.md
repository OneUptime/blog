# How to Log the Exact Prompt and Context LangChain Sent to the Model

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, LangChain

Description: Capture LangChain messages at the chat model boundary, correlate them with retrieved context, and distinguish model input from provider wire payloads.

Printing a prompt template does not show what a LangChain application sent to a model. The final input can also contain chat history, tool results, system instructions, retrieved passages, and content added by middleware. Logging the retriever output has the same limitation: the context builder may select, reorder, or truncate it afterward.

Capture the structured messages at the chat model boundary. Then be precise about what that observation proves: it shows the LangChain model input, while the provider integration may still transform it into an HTTP request.

## Choose the Right Observation Point

LangChain callbacks distinguish chat model starts from traditional text LLM starts. `on_chat_model_start` receives batches of message lists plus a run ID and optional parent run ID. The callback is therefore a better place to inspect the final LangChain conversation than the original application request. [LangChain callback implementation](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/callbacks/base.py).

Store messages as structured objects. Flattening them into a single string loses roles, tool call IDs, multimodal content blocks, and boundaries between messages. A model can interpret the same words differently depending on whether they appear in a system instruction or a tool result.

The following callback sends records to a supplied capture function. The function should enforce your storage policy and enqueue writes without delaying model calls.

```python
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import messages_to_dict


class CaptureModelInput(BaseCallbackHandler):
    def __init__(self, capture):
        super().__init__()
        self.capture = capture

    def on_chat_model_start(
        self, serialized, messages, *, run_id,
        parent_run_id=None, **kwargs
    ):
        for batch_index, conversation in enumerate(messages):
            self.capture({
                "run_id": str(run_id),
                "parent_run_id": (
                    str(parent_run_id) if parent_run_id else None
                ),
                "batch_index": batch_index,
                "messages": messages_to_dict(conversation),
            })
```

Pass the callback through invocation configuration alongside your existing callbacks. In application code, `chain` is the runnable you already constructed:

```python
def invoke_with_capture(chain, inputs, capture, callbacks=()):
    handler = CaptureModelInput(capture)
    return chain.invoke(
        inputs,
        config={"callbacks": [*callbacks, handler]},
    )
```

This example receives a callback sequence explicitly. If your application carries a `RunnableConfig` or callback manager, preserve it using LangChain's supported configuration merging mechanism; do not assume every callback object is a Python list. The framework uses configuration to propagate callbacks into nested operations. [Trace with LangChain](https://docs.langchain.com/langsmith/trace-with-langchain).

## Join Context to the Captured Messages

At context assembly, record the ordered chunk IDs and immutable document revisions. Give the assembled context a capture ID. Carry that ID in invocation metadata, and store it alongside the model run ID. The two records now answer different questions: the assembly manifest explains why passages were selected, and the captured message list shows where they appeared in the final conversation.

Check the actual generation child run when using LangSmith. A root chain's input might contain only a question, while the model child contains the expanded messages. Similarly, the root output may be a parsed object rather than the model's unprocessed response.

Do not depend on a mutable document URL for reconstruction. A page can change before someone investigates a failure. Use a versioned object, immutable index revision, or a controlled snapshot with a defined lifetime.

## Understand the Wire-Payload Boundary

The callback does not promise byte-for-byte provider request capture. Provider wrappers can serialize tools separately, convert messages, omit unsupported fields, select an endpoint, or apply request defaults after callbacks run. Middleware can also modify requests downstream.

For a serialization bug, reproduce the request with synthetic content in a development environment and inspect the provider client's documented request hooks or a local mock HTTP endpoint. Compare the message representation, tool schema, model identifier, and generation settings. Avoid broad production HTTP body logging: request headers can contain credentials, and document URLs can contain access tokens.

Record transport request IDs when the provider returns them. They help correlate an application span with provider support and usage records without assuming that the framework run ID is also a provider request ID.

## Capture Intentionally and Verify the Result

An exact prompt capture contains the exact sensitive material the model received. Decide whether each project is allowed to retain it, who can read it, and when it expires. LangSmith offers input and output hiding and transformation controls; verify the chosen mechanism applies to nested runs and any separately collected metadata. [Prevent logging sensitive data](https://docs.langchain.com/langsmith/mask-inputs-outputs).

Test with a synthetic conversation containing a system message, two history messages, one retrieved passage, and a tool result with a known tool call ID. Confirm all five elements survive capture with their roles intact. Test an empty context and two concurrent invocations to ensure records never mix by shared mutable state.

Check failure handling too. An unavailable capture destination should follow an explicit policy rather than accidentally break all model requests. Emit a small capture-failure metric, bound the queue, and count dropped records. If capture is mandatory for a particular workflow, make that requirement a deliberate application decision.

## Conclusion

Inspect model child inputs and capture structured messages at the chat model boundary. Keep the context manifest and provider request identity alongside them so you can distinguish selection errors, prompt construction errors, and provider serialization behavior.

## Official Documentation

- [LangChain callback definitions](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/callbacks/base.py)
- [LangSmith tracing with LangChain](https://docs.langchain.com/langsmith/trace-with-langchain)
- [LangSmith sensitive data controls](https://docs.langchain.com/langsmith/mask-inputs-outputs)
