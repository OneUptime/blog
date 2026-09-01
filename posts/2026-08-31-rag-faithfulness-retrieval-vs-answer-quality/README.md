# How to Measure RAG Faithfulness Without Confusing Retrieval Quality with Answer Quality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Retrieval-Augmented Generation, Evaluation, Information Retrieval, LLM

Description: Measure whether RAG answers are supported by retrieved context while keeping retrieval relevance, coverage, and answer usefulness as separate evaluation dimensions.

---

RAG faithfulness asks whether claims in the generated answer are supported by the context that the generator received. It does not ask whether the retriever found the best documents, whether those documents are true, or whether the answer fully solves the user’s problem.

Confusing those questions makes remediation guesswork. A low-quality answer may be a retrieval failure, a generation failure, or both; a high faithfulness score can still describe a useless answer.

## Preserve the Pipeline Boundaries

Log a structured record for every evaluation case:

```json
{
  "user_input": "When can an annual plan be refunded?",
  "retrieved_contexts": ["Policy section 4...", "Billing FAQ..."],
  "retrieved_context_ids": ["policy-v7#4", "faq-v12#refunds"],
  "response": "...",
  "reference": "...",
  "retriever_version": "hybrid-2026-08-17",
  "generator_version": "support-prompt-12"
}
```

`retrieved_contexts` must be the exact ordered text supplied to the generator after filtering, reranking, and truncation-not every candidate returned by the vector database. Otherwise faithfulness is measured against evidence the model never saw.

Snapshot mutable sources or store stable document versions. A later documentation edit can make the same answer look newly supported or unsupported without any application change.

## Score Four Separate Questions

Use a small evaluation matrix:

| Component | Question | Example signal |
|---|---|---|
| Retrieval precision | Were retrieved chunks relevant, and were useful chunks ranked early? | context precision / precision@k |
| Retrieval recall | Was the information needed for the reference answer retrieved? | context recall / recall@k |
| Faithfulness | Are response claims supported by retrieved context? | claim support ratio |
| Answer quality | Is the response correct, relevant, and complete for the user? | reference checks, rubric, human rating |

These dimensions produce distinct failure patterns:

- High retrieval quality plus low faithfulness points to the generator ignoring or distorting good evidence.
- Low retrieval recall plus high faithfulness can mean the generator cautiously repeated the incomplete context.
- Low retrieval precision plus high answer quality may mean the generator found the useful passage amid noise, but the system is inefficient and fragile.
- High faithfulness plus low correctness can occur when the retrieved source itself is outdated or wrong.

Never collapse the four into one average before reviewing their individual floors and critical slices.

## Measure Faithfulness at the Claim Level

Decompose the answer into independently checkable factual claims. For each claim assign:

- `supported`: entailed by one or more supplied contexts;
- `contradicted`: conflicts with the supplied contexts;
- `unsupported`: neither supported nor contradicted;
- `not_factual`: advice, formatting, or another statement outside the criterion; or
- `insufficient_context`: evidence cannot decide.

A basic faithfulness score is supported material claims divided by all material factual claims. Ragas’ official `Faithfulness` metric follows this broad approach: extract statements and check whether each can be inferred from the retrieved context. Its finite ratio is from 0 to 1, but the v0.4.3 collections implementation returns `NaN` when it extracts no statements or receives no verdict statements, so coverage must be reported with the score.

Weighting claims by severity can be appropriate, but do not hide the unweighted counts. An incorrect refund deadline can matter more than a harmless wrong adjective. Define materiality and weights before evaluating candidates.

## Use the Modern Ragas API Explicitly

Current Ragas documentation recommends the collections API for new projects:

```python
import asyncio
from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import Faithfulness

async def main():
    evaluator = llm_factory("gpt-4o-mini", client=AsyncOpenAI())
    metric = Faithfulness(llm=evaluator)
    result = await metric.ascore(
        user_input="When can an annual plan be refunded?",
        response="Annual plans can be refunded within 14 days of purchase.",
        retrieved_contexts=[
            "Annual subscriptions are eligible for a refund within 14 days of purchase."
        ],
    )
    print(result.value, result.reason)

asyncio.run(main())
```

In Ragas v0.4’s collections API, metrics are imported from `ragas.metrics.collections`, take keyword arguments in `score` or `ascore`, and return a result whose numeric score is in `.value`. Older examples using `SingleTurnSample`, `ragas.metrics.Faithfulness`, and `single_turn_ascore` are legacy API patterns. Pin your installed Ragas version and follow its matching documentation.

The metric’s output is an evaluator judgment, not ground truth. Calibrate it against human claim labels, save missing or malformed results, and inspect disagreement by answer length, domain, and language.

## Isolate Retrieval and Generation with Ablations

Run controlled experiments rather than tuning everything at once:

1. Feed the generator human-selected gold context. If faithfulness stays low, focus on prompting, context formatting, or the generator.
2. Feed a fixed, validated answer template from the retrieved facts. If this succeeds while the production answer fails, retrieval may be adequate.
3. Evaluate the retriever without generation using reference document IDs or human relevance labels.
4. Replace the retriever with deliberately incomplete and noisy contexts to test whether the generator abstains rather than invents.
5. Evaluate the same saved answers with a fixed judge to separate application variation from scoring variation.

Also test context conflicts. A faithful answer may correctly acknowledge disagreement rather than select one passage. The rubric must state source precedence and recency rules.

## Avoid Common Interpretive Errors

- A refusal with no factual claims can be safe but unhelpful; score task success separately.
- Copying context can be faithful but irrelevant or incomplete.
- Correct outside knowledge is still unsupported if the product promises source-grounded answers.
- A citation marker does not prove the associated claim is supported; resolve and check the cited span.
- Context precision without a reference may measure usefulness relative to the generated response, creating dependence between retrieval and generation.
- Dropping `NaN` values can inflate the aggregate; report judge coverage and failures.

Set release rules per dimension, such as minimum retrieval recall, maximum unsupported critical claims, and minimum answer success. Investigate by slice before changing chunking, top-k, or prompts.

## Official Documentation

- [Ragas: Faithfulness](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/)
- [Ragas v0.4.3 collections `Faithfulness` implementation](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/collections/faithfulness/metric.py)
- [Ragas: Context precision](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/)
- [Ragas: Context recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/)
- [Ragas: v0.3 to v0.4 migration](https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/)
- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

## Conclusion

Faithfulness is a claim-to-context measurement. Preserve the exact generator context, score retrieval precision and recall independently, and evaluate correctness and usefulness against their own requirements. Claim-level review and controlled ablations reveal whether to fix the retriever, the generator, the source corpus, or the judge.
