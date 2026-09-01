# Context Precision vs Context Recall: How to Evaluate the Retriever in a RAG Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Retrieval-Augmented Generation, Evaluation, Information Retrieval, LLM

Description: Evaluate RAG retrieval by measuring whether ranked contexts are relevant and whether all information needed for a reference answer was retrieved.

---

Context precision and context recall diagnose different retriever failures. Precision asks whether the retrieved list is concentrated with useful results and ranks them early. Recall asks whether the retriever found all the information needed to answer the query. Improving one can reduce the other, so a single “retrieval score” hides the tradeoff.

## Define Relevance Before Computing Anything

For each query, decide what counts as relevant. Strong ground truth uses stable source or chunk IDs reviewed by domain experts. When IDs are unavailable, a reference answer can define the claims the context must support. These are not identical targets:

- document-ID relevance measures retrieval against a labeled corpus;
- claim coverage measures whether retrieved text contains the answer evidence; and
- usefulness to a generated response can reward context that supports an answer even when that answer is wrong or incomplete.

Record the corpus version, chunking strategy, query, ordered retrieved chunk IDs, exact post-rerank text, and reference IDs or answer. A changed chunker or corpus changes the evaluation universe.

## Understand Context Precision

Precision at rank `k` is the fraction of the first `k` results that are relevant. Ragas’ `ContextPrecision` is an average-precision-like ranking metric: relevant chunks receive more credit when they appear earlier. This matters because generators have context limits and may attend unevenly to long prompts.

Suppose relevance by rank is:

```text
rank:      1  2  3  4  5
relevant:  1  0  1  0  0
```

Precision@1 is 1.0, precision@3 is 2/3, and precision@5 is 2/5. A ranking-sensitive score rewards the relevant item at rank 1 more than if it appeared at rank 5.

Low precision produces noisy prompts, higher token cost, and more opportunities for the generator to follow irrelevant or conflicting passages. Fixes include stronger filters, metadata constraints, hybrid retrieval, reranking, query rewriting, and better chunk boundaries.

## Understand Context Recall

Recall is the fraction of relevant material that was retrieved. With reference document IDs, it is:

\[
\text{recall} = \frac{|\text{retrieved IDs} \cap \text{reference IDs}|}{|\text{reference IDs}|}
\]

Ragas’ LLM-based `ContextRecall` uses the reference answer as a proxy when reference contexts are expensive to annotate. It decomposes the reference into claims and estimates what fraction is attributable to the retrieved contexts.

Low recall means required evidence is missing. Increasing top-k may help, but it can lower precision and increase cost. Other fixes include query expansion, multi-hop retrieval, corpus coverage, chunk overlap, embeddings, and filters that no longer exclude the needed source.

Recall requires a denominator. Without reference contexts, IDs, or a reference answer, you cannot establish what relevant material was missed. A “reference-free recall” claim should be treated skeptically.

## Use the Modern Ragas Metrics

Current collections-based examples pass fields directly and read `.value`:

```python
import asyncio
from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import ContextPrecision, ContextRecall

async def main():
    llm = llm_factory("gpt-4o-mini", client=AsyncOpenAI())
    retrieved = [
        "Refunds are available within 14 days of annual-plan purchase.",
        "Monthly plans renew on the first day of each billing cycle.",
    ]
    kwargs = {
        "user_input": "When can an annual plan be refunded?",
        "reference": "An annual plan can be refunded within 14 days of purchase.",
        "retrieved_contexts": retrieved,
    }

    precision = await ContextPrecision(llm=llm).ascore(**kwargs)
    recall = await ContextRecall(llm=llm).ascore(**kwargs)
    print(precision.value, recall.value)

asyncio.run(main())
```

Ragas also documents `IDBasedContextPrecision` and `IDBasedContextRecall` for direct ID comparisons. Prefer deterministic ID calculations when trustworthy relevance IDs exist: they are cheaper and avoid a judge interpreting text. However, the stable documentation currently demonstrates these classes with `ragas.metrics`, `SingleTurnSample`, and `single_turn_ascore`, so those examples use the legacy sample-based API rather than the collections API. The documented non-LLM context variants use the same legacy calling shape, and string similarity is not the same as expert relevance.

The `LLMContextPrecisionWithReference`, `LLMContextRecall`, `IDBasedContextPrecision`, `IDBasedContextRecall`, `NonLLMContextPrecisionWithReference`, and `NonLLMContextRecall` examples shown with `SingleTurnSample` belong to the legacy metric API. Do not mix those imports and calling conventions with collections metrics. For a new collections-based application, a small deterministic precision/recall function over your IDs is often clearer than introducing the legacy dataset layer solely for this calculation.

## Read the Two Metrics Together

The four broad quadrants suggest different actions:

| Precision | Recall | Likely diagnosis |
|---|---|---|
| High | High | Useful evidence is present and ranked early |
| High | Low | A clean but incomplete result set |
| Low | High | Evidence is present but buried in noise |
| Low | Low | Retrieval, corpus coverage, or labels need major work |

Always inspect by query type. Single-hop factual queries, multi-hop synthesis, temporal queries, and permission-filtered queries have different difficulty and acceptable top-k. A global average can conceal zero recall for a critical source.

## Design Controlled Retrieval Experiments

Evaluate the retriever before generation. For each query:

1. freeze the corpus and access-control context;
2. run each retriever with the same query and candidate budget;
3. preserve ordered IDs and scores before and after reranking;
4. compute metrics at several cutoffs such as 1, 3, 5, and 10;
5. bootstrap paired query-level differences; and
6. inspect wins, losses, and missing-source cases.

When comparing chunking strategies, map labels carefully. A reference document may split into several chunks, and treating every overlapping chunk as an independent required item can distort recall. Define whether the target is a document, passage, fact, or claim.

Add negative controls with plausible but irrelevant chunks, and temporal controls where an older policy conflicts with the current one. Measure latency and tokens alongside quality so a top-k increase is not presented as free.

## Keep Answer Metrics Separate

A retriever can achieve high recall while the generator hallucinates, or low recall while a model answers from memorized knowledge. Evaluate response faithfulness, correctness, relevance, and completeness separately. For a grounded product, outside knowledge may be correct but still violate the requirement to use supplied sources.

Also report evaluator failures. Timeouts, invalid judge output, empty references, and unavailable embeddings are not retrieval scores. Track metric coverage and never let `NaN` rows disappear from an aggregate.

## Official Documentation

- [Ragas: Context precision](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/)
- [Ragas: Context recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/)
- [Ragas: Available metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/)
- [Ragas: v0.3 to v0.4 migration](https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/)
- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

## Conclusion

Context precision measures concentration and ranking of useful results; context recall measures missing required evidence. Define the relevance unit, preserve ranked retrieval outputs, use IDs when possible, and report both metrics at operational cutoffs. Then evaluate the generator separately so retrieval improvements and answer improvements remain distinguishable.
