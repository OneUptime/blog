# Validation Summary: How to Compare Hybrid and Vector Search in a RAG Regression Dashboard

## Status
validated

## Post Type
Technical guide with a standalone Python retrieval-evaluation example.

## Technologies Covered
- Retrieval-augmented generation (RAG), vector search, and hybrid retrieval
- Azure AI Search and Reciprocal Rank Fusion (RRF)
- Python built-in collections and iteration
- Ragas context recall
- Recall@k, reciprocal rank, nDCG, and paired evaluation
- Retrieval observability, latency, and context-budget diagnostics

## Sources Consulted
- [Azure AI Search hybrid ranking](https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking): rank fusion, score scales, and the distinction between the RRF constant and nearest-neighbor k.
- [Azure AI Search semantic ranking](https://learn.microsoft.com/en-us/azure/search/semantic-search-overview): secondary ranking over initial retrieval results.
- [Ragas context recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/): reference-ID recall and reference-answer claim coverage.
- [Python built-in types](https://docs.python.org/3/library/stdtypes.html): dictionary insertion order, fromkeys, slicing, and set operations.
- [Python built-in functions](https://docs.python.org/3/library/functions.html): enumerate and next with a default value.
- [SciPy bootstrap](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html): confidence intervals and paired resampling.
- [scikit-learn nDCG](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ndcg_score.html): graded relevance and rank-sensitive normalized gain.
- [scikit-learn cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html): held-out evaluation and avoiding evaluation-set overfitting.
- [NIST randomized block designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm): controlling nuisance factors and randomizing comparisons.
- [Author GitHub profile](https://github.com/nawazdhandala): verified the author link resolves to the intended profile.

## Issues Found
- The post recommended recording only pre-reranking candidates and final context selections while claiming this supports separate diagnoses of retrieval, reranking, and context-budget losses. Those two snapshots alone cannot reliably distinguish reranking changes from context assembly losses. Added the ordered post-reranking IDs to the same sentence so each stage can be compared. No restructuring or stylistic changes were made.

## Review Notes
- Executed the exact Python code block successfully. q1 produces recall change +0.5 and reciprocal-rank change 0.0; q2 produces recall change 0.0 and reciprocal-rank change -0.5, matching the explanation.
- Checked duplicate removal before cutoff, relevant items outside the cutoff, empty retrieval results, empty relevance labels, a first hit at rank two, and rejection of zero or negative k.
- The reciprocal-rank calculation is truncated at k because the ranked list is sliced first. It returns zero when no relevant item appears within that cutoff.
- Empty relevance sets intentionally return None for both metrics. The supplied comparison loop uses answerable cases only; extending it to no-answer cases requires routing those cases to the separate answerability panel before numeric subtraction, as the prose recommends.
- Dictionary insertion order is guaranteed in Python 3.7 and later. The example uses only standard built-ins and no deprecated third-party APIs.
- Verified the two technical links and the author link. No terminal commands, configuration snippets, or pinned dependency versions appear in the post.
- The guidance on comparable corpora and filters, explicit relevance units, paired measurements, graded relevance, workload controls, held-out queries, and production query-mix monitoring is technically sound. The article describes a dashboard design; no live search service or dashboard implementation was exercised.
