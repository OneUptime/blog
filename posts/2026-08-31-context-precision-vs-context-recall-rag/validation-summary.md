# Validation Summary: Context Precision vs Context Recall: How to Evaluate the Retriever in a RAG Pipeline

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Retrieval-Augmented Generation (RAG)
- Information-retrieval evaluation, including Precision@k, context precision, and context recall
- Ragas 0.4.3 collections metrics and legacy sample-based metrics
- Python and `asyncio`
- OpenAI Python SDK, `AsyncOpenAI`, and `gpt-4o-mini`
- LLM-as-a-judge and deterministic ID-based retrieval evaluation

## Sources Consulted

- [Ragas: Context precision](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/)
- [Ragas: Context recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/)
- [Ragas: Available metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/)
- [Ragas: v0.3 to v0.4 migration](https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/)
- [Ragas: LLM factory reference](https://docs.ragas.io/en/stable/references/llms/)
- [Ragas 0.4.3 package release](https://pypi.org/project/ragas/0.4.3/)
- [Ragas 0.4.3 collections metric source](https://github.com/vibrantlabsai/ragas/tree/v0.4.3/src/ragas/metrics/collections)
- [Ragas 0.4.3 legacy context-precision source](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/_context_precision.py)
- [Ragas 0.4.3 legacy context-recall source](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/_context_recall.py)
- [Stanford Introduction to Information Retrieval: Evaluation of ranked retrieval results](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html)
- [OpenAI Python SDK: Async usage](https://github.com/openai/openai-python#async-usage)
- [OpenAI: GPT-4o mini model](https://developers.openai.com/api/docs/models/gpt-4o-mini)
- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

## Issues Found

- The post conflated three different precision signals: Precision@k, Ragas' ranking-sensitive `ContextPrecision`, and the order-insensitive `IDBasedContextPrecision`. The opening, diagnostic table, and conclusion now distinguish concentration at a cutoff from ranking quality so readers do not treat the metrics as interchangeable.
- The post implied that Ragas' `ContextPrecision` measured noise throughout the full retrieved list. The explanation now states that trailing irrelevant chunks after all relevant chunks do not lower this average-precision-like score, and directs readers to Precision@k for concentration at a fixed cutoff.
- The ID-based metrics were described without their set semantics. The post now explains that they ignore rank order and deduplicate IDs, and recommends calculating conventional Precision@k directly over ranked positions or using a separate ranking-sensitive metric when order matters.

## Review Notes

- The Python example is syntactically valid and matches the current Ragas 0.4.3 collections API: direct keyword fields to `ascore`, an `AsyncOpenAI` client passed through `llm_factory`, and score access through `MetricResult.value`.
- Running the example requires the `ragas` and `openai` packages, an `OPENAI_API_KEY`, network access, and access to `gpt-4o-mini`. The metric scores are LLM-judged and therefore may vary between runs.
- The legacy API characterization is accurate for Ragas 0.4.3. The documented ID-based and non-LLM variants use `SingleTurnSample` and `single_turn_ascore` and are not exported by `ragas.metrics.collections`.
- All external links in the post resolved to their intended resources during validation. The linked OpenAI evaluation guide remains applicable as design guidance, although the separate OpenAI Evals platform is scheduled to become read-only on October 31, 2026 and shut down on November 30, 2026.
