# How to Find Oversized Tool Results That Make Later Agent Steps Slower

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, LangChain, Observability, Performance

Description: Measure tool-result size at the point it enters model context and identify outputs that inflate later agent-step latency.

A database tool can finish in 80 milliseconds and still make an agent much slower. If it returns thousands of rows that are appended to the conversation, every later model call may carry those rows again. A tool-duration chart looks healthy while first-output latency and input cost climb.

Measure what the tool returns, what the application retains, and what the model actually receives. These can be three very different payloads.

## Attribute growth to the producing tool call

At each tool boundary, record tool name, call ID, result status, serialized byte size, row or document count, model-visible size, and any truncation or summarization decision. At the next model boundary, record total input tokens, cached input, and first-text latency.

Link the model-visible result to its originating call ID. LangChain's [ToolMessage reference](https://reference.langchain.com/python/langchain-core/messages/tool/ToolMessage) uses `tool_call_id` to associate a result with its call and supports keeping a fuller artifact separately from model-visible content.

Measure bytes after serialization, not the in-memory Python object's size. A compact object may serialize into large JSON, and base64 data can dominate a result that contains only a few logical fields. Token estimates should use a model-appropriate tokenizer and be labeled estimates; provider-reported complete input usage is the stronger end-to-end count.

## Separate storage from prompt content

Here is a concrete LangChain message construction example. Install `langchain-core` to run it:

```python
import json
from langchain_core.messages import ToolMessage

rows = [
    {"ticket_id": "T-100", "status": "open", "priority": "high"},
    {"ticket_id": "T-101", "status": "closed", "priority": "low"},
]
full_result = {"rows": rows, "query_version": "open-tickets-v2"}
model_result = {
    "matching_rows": len(rows),
    "rows": rows[:1],
    "has_more": len(rows) > 1,
    "retrieval_hint": "Request the next page if more rows are needed.",
}
content = json.dumps(model_result, separators=(",", ":"))
message = ToolMessage(
    content=content,
    artifact=full_result,
    tool_call_id="call_example",
)
print({
    "raw_bytes": len(json.dumps(full_result).encode("utf-8")),
    "model_visible_bytes": len(content.encode("utf-8")),
})
```

The artifact still occupies application memory or storage and may be captured by tracing. It is not a license to retain unlimited sensitive data. In a production integration, use an access-controlled object reference for large results and keep only the fields needed for the current reasoning step in content.

The example deliberately marks that more rows exist. Silently showing the first row as though it were the complete answer changes correctness. Implement an actual pagination tool or retrieval path before using that hint in a real workflow.

## Measure marginal context growth

Create a per-step report with the previous model's input size, new user content, new tool-result sizes, next input size, and retained history policy. The difference between successive input counts is a useful signal but is not an exact tool token count: model outputs, tool schemas, and other context may have changed too.

For a stronger measurement, build the next request twice in a diagnostic harness: once with the original result and once with a bounded substitute. Tokenize both using the same serialization and model assumptions. The difference estimates the marginal prompt contribution of that result.

Keep first-text timing separate from total duration. A later step may intentionally produce a longer answer, so total latency alone can blame the tool for decoding work. Compare requests with similar output length and model configuration.

LangChain's [short-term memory guide](https://docs.langchain.com/oss/python/langchain/short-term-memory) discusses growing message history and approaches such as trimming and summarization. Apply those techniques while preserving valid tool-call/result pairing and the evidence needed for the task.

## Find repeated retention, not just one large response

Rank tool results by cumulative model exposure: how many subsequent model calls include the result, multiplied by its estimated size. A 10,000-token result reused across six steps can matter more than a 20,000-token result used once.

Do not call that exposure billable uncached tokens. Prefix caching may reuse some work, and the actual billing partition depends on the provider. Use exposure to prioritize investigation, then inspect reported usage and latency to quantify impact.

Common fixes include selecting only required columns, limiting query results, returning aggregate statistics, retrieving relevant excerpts, and keeping large files outside message history. Prefer a structured summary with stable record IDs over a vague prose summary when the agent must later verify specific facts.

## Validate the bounded result against the task

Build cases where the answer depends on a row near the end of the result, a rare error, or information spread across several pages. Confirm the agent requests additional evidence when necessary and does not invent a complete answer from a partial page.

Measure tool duration, first-text latency, input usage, total workflow cost, and task success before and after the change. Also watch checkpoint size and trace-export volume; moving the full result into an artifact can preserve those costs even while reducing model input.

A successful fix makes the model-visible payload deliberately small and sufficient, retains a reliable path to the omitted evidence, and demonstrates faster later steps without hiding the information required for a correct answer.
