# How to Compare Hybrid and Vector Search in a RAG Regression Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Vector Search, Evaluation, Observability, Python

Description: Compare hybrid and vector retrieval on identical queries with paired quality metrics, latency distributions, evidence coverage, and regression drill-downs.

A hybrid retriever improves several demo questions, but the production dashboard shows only average similarity and request latency. Neither measurement establishes whether the new pipeline retrieves better evidence. Hybrid scores may use a different scale, and the demo questions may favor exact keyword matches.

Build a regression dashboard around paired queries and reviewed relevance labels. Compare evidence retrieval before asking a generator to turn the evidence into prose.

## Define the two systems precisely

Write down the vector model, index version, filters, candidate budget, reranker, and final context budget for each variant. A useful first experiment changes only the retrieval strategy. Keep authorization rules and the document snapshot identical.

For example, Azure AI Search hybrid queries combine text and vector retrieval. Its Reciprocal Rank Fusion combines result ranks rather than treating raw keyword and vector scores as interchangeable. The fusion constant is distinct from the nearest-neighbor `k`. [Azure AI Search hybrid ranking](https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking).

Consequently, an average hybrid score cannot be compared directly with an average vector distance. Use labeled ranking metrics for quality and preserve each backend's raw score only for diagnosis.

## Create a query-level evaluation table

Each row should identify the query, query class, allowed corpus, reference evidence, and configuration version. Include exact identifiers, paraphrases, abbreviations, rare terminology, multi-document questions, and questions with no answer in the corpus.

Choose the relevance unit deliberately. Document-level labels work when any passage from a source suffices. Chunk-level or fact-level labels are necessary when only one passage contains the answer. A document appearing at rank one does not establish that its relevant passage reached the final prompt.

Store ordered candidate IDs before reranking, ordered IDs after reranking, and final selected IDs after context assembly. That supports separate diagnoses for retrieval, reranking, and token-budget losses.

## Calculate paired metrics

The following standalone Python uses reviewed document IDs. It calculates Recall@k and reciprocal rank for the first relevant item. For simplicity, duplicate IDs are removed before the cutoff; document that policy and report duplicate counts separately in a real dashboard.

```python
def quality(ranked, relevant, k):
    if k <= 0:
        raise ValueError("k must be positive")
    ordered = list(dict.fromkeys(ranked))[:k]
    relevant = set(relevant)
    if not relevant:
        return {"recall": None, "rr": None}
    hits = set(ordered) & relevant
    rr = next((1 / rank for rank, item in enumerate(ordered, 1)
               if item in relevant), 0.0)
    return {"recall": len(hits) / len(relevant), "rr": rr}

cases = [
    {"id": "q1", "relevant": {"a", "b"},
     "vector": ["a", "x", "b"], "hybrid": ["a", "b", "x"]},
    {"id": "q2", "relevant": {"c"},
     "vector": ["c", "x"], "hybrid": ["x", "c"]},
]
for case in cases:
    baseline = quality(case["vector"], case["relevant"], k=2)
    candidate = quality(case["hybrid"], case["relevant"], k=2)
    print(case["id"], {
        metric: candidate[metric] - baseline[metric]
        for metric in baseline
    })
```

The first case gains evidence coverage while the second loses first-result quality. An aggregate can conceal this tradeoff, so preserve the per-query differences.

Recall requires a reference denominator. Ragas documents both evidence-ID approaches and claim-based recall against a reference answer; do not describe unlabeled nearest-neighbor scores as recall. [Ragas context recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/).

## Design dashboard panels around decisions

Show mean paired Recall@k change, first-relevant rank, final-context fact coverage, and the proportion of queries that improved, tied, or regressed. Add query counts and confidence intervals calculated over paired query-level differences. For graded relevance, include a documented ranking metric such as nDCG rather than converting every judgment to a binary hit.

Place latency percentiles, embedding calls, reranker calls, and context tokens beside quality. Use the same workload and cache policy for both variants. Randomize execution order or interleave trials so a warmed index does not systematically favor the candidate.

Keep no-answer questions in a separate answerability panel. A denominator-free recall value is undefined for those cases; replacing it with one rewards systems for returning nothing without demonstrating useful behavior.

## Make regressions actionable

A drill-down should display the query, reviewed evidence, both ranked lists, score meanings, filter differences, and final prompt selection. If hybrid search finds a rare product code but pushes a needed policy exception out of the context budget, inspect both stages before increasing top-k.

Review representative losses before shipping. Improvements concentrated in a large easy slice should not erase regressions in a small critical slice. Set acceptance criteria before inspecting the final experiment, and retain a held-out query set for the release decision.

After deployment, compare production query mix with the evaluation mix and refresh labels when the corpus changes. The dashboard should explain which evidence improved, which cases regressed, and what the latency and cost tradeoffs were. That makes retrieval changes reviewable instead of relying on incomparable scores or a handful of persuasive answers.
