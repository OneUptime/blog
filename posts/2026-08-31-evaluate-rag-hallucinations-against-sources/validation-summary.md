# Validation Summary: How to Evaluate Hallucinations by Checking LLM Answers Against Retrieved Sources

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Retrieval-Augmented Generation (RAG)
- Ragas v0.4.3 Faithfulness
- Ragas Context Precision and Context Recall
- Claim-level hallucination and citation evaluation
- LLM-as-a-judge evaluation
- JSON structured evaluator output

## Sources Consulted

- [Ragas Faithfulness metric](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/)
- [Ragas v0.4.3 collections `Faithfulness` implementation](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/collections/faithfulness/metric.py)
- [Ragas Context Precision](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/)
- [Ragas Context Recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/)
- [OpenAI Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [OpenAI Safety in Building Agents](https://developers.openai.com/api/docs/guides/agent-builder-safety)
- [NIST AI 600-1: Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

## Issues Found

- The post described evidence-relative grounding as narrower than evaluating whether a statement is false about the world. These criteria are different rather than nested: a true claim can be unsupported, while a claim supported by faulty evidence can still be false about the world. Changed the sentence to describe the criteria as different.
- The post said an empty or evasive answer makes claim support precision undefined. Evasive answers can still contain assessable factual claims; the ratio is undefined specifically when there are zero assessable claims. Changed this to “empty or otherwise claim-free answer.”

## Review Notes

- The JSON evaluator-output example is syntactically valid.
- All external links in the post returned HTTP 200 after redirects on 2026-09-01 and point to the stated resources.
- The pinned Ragas v0.4.3 collections implementation returns `NaN` when statement extraction yields no statements, as the post says. A literally empty `response` is rejected earlier with `ValueError`; the post does not claim otherwise.
- The Ragas Faithfulness, Context Precision, and Context Recall explanations match the official definitions and formulas.
- A balanced judge-calibration set is useful for per-class diagnosis, but deployment performance should also be checked on a production-representative or appropriately weighted sample because precision depends on class prevalence.
- Delimiting, sanitizing, and structurally isolating retrieved passages reduce prompt-injection risk but are defense-in-depth mitigations rather than an absolute security boundary.
