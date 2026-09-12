# Which RAG Stage Failed? Correlate Retrieval, Context, and Grounding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, RAG

Description: Trace retrieval candidates, final context selection, and answer evidence together to identify exactly where a RAG response went wrong.

A RAG answer can cite a real document and still be wrong. The retriever may have found an obsolete revision, a context builder may have dropped the relevant paragraph, or the model may have made a claim the supplied text does not support. A single generation span cannot distinguish these cases.

Build a trace around the transformations between stages. The useful question is not simply whether retrieval ran, but which evidence survived long enough to influence the answer.

## Define the Evidence Chain

Give one user request a root span and create child spans for retrieval, reranking, context assembly, generation, and grounding evaluation. Keep an application response ID alongside the trace ID so delayed feedback can find the same answer. OpenTelemetry provides parent and child spans; the `app.rag.*` fields below are application conventions, not required OpenTelemetry attributes. [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/).

Record four separate identities for each candidate: logical document ID, immutable revision, chunk ID, and retrieval attempt. A stable document ID alone is insufficient when the index changes between the incident and investigation.

| Stage | Evidence to retain | What it diagnoses |
|---|---|---|
| Retrieve | Candidate IDs, ranks, scores, filters, index version | Missing or irrelevant evidence |
| Rerank | New ranks and model/version | Relevant candidates demoted |
| Assemble | Included chunk IDs, order, truncation decisions | Evidence omitted by token budget |
| Generate | Prompt version, context reference, model response ID | Wrong input or generation failure |
| Evaluate | Claim labels, evidence IDs, evaluator version | Unsupported or contradictory claims |

Do not normalize unrelated vector scores into one apparent confidence number. A distance, cosine similarity, and reranker score have different meanings. Preserve the score type and whether larger or smaller values rank better.

## Instrument the Selection Boundary

The following application helper accepts already ranked candidates. It deliberately measures characters to demonstrate deterministic selection; replace that budget with your model tokenizer and include the prompt, tools, and reserved output when enforcing a real context limit.

```python
from opentelemetry import trace

tracer = trace.get_tracer("support.rag")


def assemble_context(candidates, max_chars):
    selected = []
    used = 0
    with tracer.start_as_current_span("rag.assemble") as span:
        for rank, item in enumerate(candidates, start=1):
            rendered = f"[{item['chunk_id']}] {item['text']}\n"
            include = used + len(rendered) <= max_chars
            span.add_event("candidate_selection", {
                "app.rag.chunk_id": item["chunk_id"],
                "app.rag.revision": item["revision"],
                "app.rag.rank": rank,
                "app.rag.included": include,
                "app.rag.reason": "selected" if include else "budget",
            })
            if include:
                selected.append(rendered)
                used += len(rendered)
        span.set_attribute("app.rag.context_chars", used)
        span.set_attribute("app.rag.selected_count", len(selected))
    return "".join(selected)
```

The event excludes document text. In a production implementation, bound the number of events and store the full selection manifest in an access-controlled artifact if it is too large. Attach its opaque ID to the span. A collector or backend can truncate attributes and events, so a trace should not be your only copy of evidence required for an audit.

Store the final rendered context once, subject to your capture policy. Reconstructing it later by fetching the same chunk IDs can produce different text after an index refresh. When raw content cannot be retained, store immutable content references and keyed fingerprints together with selection decisions.

## Follow One Failure Through the Trace

Suppose an answer says the refund period is 60 days, but the current policy says 30. First inspect retrieval. If only the older policy appears, examine the index refresh, document permissions, query rewriting, and filters before changing the generation prompt.

If the new policy ranks first but the assembly manifest excludes it, inspect the context budget and ordering. A common application bug reserves no room for the system prompt, then truncates the final message after selection. Recording a pre-truncation candidate list falsely suggests the model received the new policy.

If the assembled context contains both versions, inspect dates and document identity. The model may have received contradictory evidence without a clear precedence rule. If it receives only the new policy and still says 60 days, generation or postprocessing becomes the leading suspect.

Finally, compare the model response with the value delivered to the user. A response cache, citation formatter, or streaming concatenation bug can change the visible result after generation. Add a final response fingerprint so the investigated answer matches the delivered answer.

## Evaluate Grounding Separately from Retrieval

Grounding asks whether claims follow from supplied evidence. Retrieval relevance asks whether the selected evidence addresses the question. They require different labels. LangSmith supports feedback on individual child runs, which makes it possible to attach a retrieval judgment to the retriever and an answer judgment to generation. [Attach user feedback](https://docs.langchain.com/langsmith/attach-user-feedback).

Define explicit outcomes such as supported, contradicted, insufficient evidence, and evaluator failure. An unavailable judge is not a grounded answer. Preserve the judge model, rubric version, and evidence snapshot. Avoid allowing retrieved text to become instructions to the evaluator; present it as untrusted data.

Use controlled fixtures before rollout: a missing document, an obsolete revision, a relevant chunk excluded by budget, contradictory context, and a fabricated claim. For each fixture, check whether the trace points to the intended stage. This tests diagnostic usefulness, not merely whether spans were exported.

## Conclusion

A useful RAG trace connects candidates to selected context and selected context to answer claims. Preserve revisions, selection reasons, and evaluation provenance so a bad answer leads to a specific repair instead of an unstructured prompt rewrite.

## Official Documentation

- [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/)
- [LangSmith observability concepts](https://docs.langchain.com/langsmith/observability-concepts)
- [LangSmith feedback on traces and child runs](https://docs.langchain.com/langsmith/attach-user-feedback)
