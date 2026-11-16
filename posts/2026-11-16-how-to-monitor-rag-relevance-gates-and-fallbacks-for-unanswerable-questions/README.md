# How to Monitor RAG Relevance Gates and Fallbacks for Unanswerable Questions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Evaluation, Observability, Python

Description: Monitor RAG relevance decisions with labeled answerability data, explicit fallback reasons, and separate false-answer and false-abstention rates.

A retriever almost always returns a nearest neighbor, even when the knowledge base contains no answer. A relevance gate decides whether the retrieved evidence is adequate to continue. Without instrumentation, a stricter gate can appear to improve answer quality while quietly refusing many answerable questions.

Monitor the gate as a decision system: record its evidence, decision, fallback, and eventual outcome. A high similarity score alone is not proof that the question can be answered.

## Separate relevance from answerability

A passage can discuss the right product without containing its refund deadline. It is relevant but insufficient. Conversely, a passage containing the deadline may be a poor textual match because the question uses an internal acronym.

Keep labels for corpus answerability, retrieved-context sufficiency, and final-answer correctness. The first asks whether an authorized source exists; the second asks whether this retrieval found enough evidence. LangSmith's RAG evaluation tutorial similarly separates retrieval quality, answer relevance, and answer accuracy. [Evaluate a RAG application](https://docs.langchain.com/langsmith/evaluate-rag-tutorial).

For a multi-part question, require evidence for each mandatory part or explicitly answer only the supported portion. Define whether partial answers are allowed before measuring a gate's success rate.

## Make each gate decision inspectable

Record the index version, retriever version, candidate count, score type, threshold version, selected chunk IDs, and decision reason. If a classifier or model judges sufficiency, add its version and retain an access-controlled reference to the evidence it saw.

Useful reasons include `no_candidates`, `below_threshold`, `missing_required_fact`, `conflicting_sources`, and `evaluator_unavailable`. Keep the fallback action separate: ask for clarification, search another authorized source, return a partial answer, or abstain.

Do not combine unlike scores. Chroma's LangChain `similarity_search_with_score` returns a distance, whereas a relevance classifier may produce a larger-is-better score. A threshold copied across these systems can reverse the gate. [Chroma scored similarity search](https://reference.langchain.com/python/langchain-chroma/vectorstores/Chroma/similarity_search_with_score).

## Measure both kinds of gate error

Use a reviewed dataset containing answerable and unanswerable questions, including near misses. The following standalone example evaluates an application-defined gate against whether the **retrieved context** is sufficient. It assumes each row has already been judged independently.

```python
rows = [
    {"sufficient": True, "proceed": True},
    {"sufficient": True, "proceed": False},
    {"sufficient": False, "proceed": True},
    {"sufficient": False, "proceed": False},
    {"sufficient": False, "proceed": False},
]

def gate_metrics(rows):
    sufficient = [r for r in rows if r["sufficient"]]
    insufficient = [r for r in rows if not r["sufficient"]]
    proceeding = [r for r in rows if r["proceed"]]
    def rate(numerator, denominator):
        return numerator / denominator if denominator else None
    return {
        "false_abstention_rate": rate(
            sum(not r["proceed"] for r in sufficient), len(sufficient)
        ),
        "unsafe_proceed_rate": rate(
            sum(r["proceed"] for r in insufficient), len(insufficient)
        ),
        "proceed_precision": rate(
            sum(r["sufficient"] for r in proceeding), len(proceeding)
        ),
        "decision_count": len(rows),
    }

metrics = gate_metrics(rows)
assert metrics["false_abstention_rate"] == 0.5
assert metrics["unsafe_proceed_rate"] == 1 / 3
assert metrics["proceed_precision"] == 0.5
```

The word “unsafe” here means proceeding without sufficient grounding under this product's contract. It does not establish that a resulting answer is harmful or factually false. Evaluate the final answer separately.

`None` means a denominator is absent, not a zero error rate. Show sample counts beside rates, and report missing labels and evaluator failures. A tiny reviewed sample should not produce a confident production-wide claim.

## Calibrate thresholds on the actual retrieval pipeline

Choose thresholds using a development set, then report results on held-out questions. Include paraphrases, exact identifiers, outdated policies, empty indexes, permission-restricted questions, and questions whose answer exists in a different tenant.

Evaluate the score after the same filtering and reranking used in production. A threshold calibrated on unfiltered vector scores does not automatically work after a reranker or embedding upgrade. Version the full configuration and compare paired decisions on identical cases.

Inspect slices by language, query type, and answer source. A global target can conceal a gate that rejects short queries or accepts convincing but obsolete documents.

## Trace fallbacks through to an outcome

A fallback is another path with latency, cost, and failure modes. If the first retriever has no evidence and a second succeeds, record the recovery. If a clarification question resolves ambiguity, link the next turn to the earlier gate decision without treating the first turn as a failed answer.

Bound fallback attempts. Repeated query rewrites can consume the budget while returning the same irrelevant chunks. Record the number of unique evidence sets and stop when the policy says additional retrieval is no longer useful.

Alert on changes in false abstention and insufficient-context proceeds, together with shifts in fallback frequency and coverage. The goal is a gate that makes its uncertainty observable and can be adjusted using evidence about both the answers it permits and the questions it declines.
