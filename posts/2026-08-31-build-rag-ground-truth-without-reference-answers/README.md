# How to Build Ground Truth for RAG Evaluation When No Reference Answers Exist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Retrieval-Augmented Generation, Datasets, Evaluation, Data Quality

Description: Build defensible RAG ground truth from source evidence, production questions, and expert adjudication even when no answer key exists yet.

---

A RAG team often has documents and production queries but no trusted reference answers. That does not make evaluation impossible. It means the answer key must be constructed as a versioned data product instead of copied from an existing benchmark.

The safest principle is **source first, answer second**. An annotator should identify the authoritative evidence that answers a question, decide whether the corpus can answer it, and only then write the required claims. Asking an LLM to invent both a question and its “truth” without verification merely creates a second model output, not ground truth.

## Define What Ground Truth Means for This System

Ground truth is not always one ideal paragraph. For a RAG system, a useful record can contain several independently reviewable fields:

```json
{
  "query": "Can a trial account export audit logs?",
  "answerability": "answerable",
  "source_version": "docs-2026-08-20",
  "evidence": [
    {"document_id": "plans", "section": "Audit logs", "span": "..."}
  ],
  "required_claims": [
    "Audit-log export requires an Enterprise plan"
  ],
  "forbidden_claims": [
    "Trial accounts can export audit logs"
  ],
  "reference_answer": "No. Audit-log export requires an Enterprise plan.",
  "acceptable_behavior": ["answer", "answer_with_citation"]
}
```

The evidence and required claims matter more than the exact wording of `reference_answer`. They allow a concise and a detailed response to be correct for the same reasons. Add an explicit unanswerable label and expected abstention behavior; otherwise a system can be rewarded for confidently answering questions its corpus does not support.

Before annotation, define document precedence. Product documentation may override an old support article, and a jurisdiction-specific policy may override a global page. Record effective dates because a once-correct answer can become wrong when the source changes.

## Sample Questions from the Workload

Start with real, privacy-reviewed queries, search logs, support cases, and known production failures. Cluster near-duplicates so one incident does not dominate the dataset. Then stratify by dimensions that can change system behavior:

- intent, product area, language, and user role;
- single-hop versus multi-hop questions;
- common, rare, and high-consequence cases;
- answerable, partially answerable, ambiguous, and unanswerable queries;
- queries that require current, historical, or conflicting documents.

Do not keep only questions the existing retriever can already answer. That converts a retrieval limitation into a hidden dataset-selection rule. Preserve the original user wording and store any normalized form separately.

## Create Evidence Packs Before Answers

Give annotators a frozen corpus snapshot and a search interface, but do not show the candidate system's response first. For each query, an annotator should:

1. mark answerability against that snapshot;
2. select the minimal sufficient passages and their stable identifiers;
3. list atomic required facts and important contradictions;
4. draft a short answer using only the selected evidence;
5. record ambiguity, missing context, or source conflict.

This order reduces anchoring on a fluent candidate answer. It also produces separate labels for retrieval and generation: reference passages can measure whether evidence was retrieved, while required claims can measure whether the response used that evidence correctly.

For consequential domains, use two independent annotators and an adjudicator. Track disagreement by field rather than hiding it in one score. Low agreement on `answerability` often reveals a policy or corpus problem; disagreement only about phrasing may not matter.

## Bootstrap Carefully When Experts Are Scarce

Several weak sources can accelerate drafting without becoming truth themselves:

- resolved support tickets can propose a query and answer;
- documentation headings can seed coverage gaps;
- an LLM can extract candidate claims from cited passages;
- synthetic test generation can propose single-hop, multi-hop, specific, and abstract questions.

Ragas documents a knowledge-graph and scenario-based process that generates queries, contexts, and references from documents. That is useful for expanding coverage. Treat every generated sample as a candidate until a reviewer confirms that the question is natural, the cited context is sufficient, and the reference contains no unsupported inference. Synthetic-only sets also miss production vocabulary, malformed inputs, and organizational policy edge cases.

A practical triage queue is: deterministic checks first, one expert review for low-risk clear cases, and double review for ambiguous or high-severity cases. Preserve provenance such as `label_source: synthetic_verified` or `label_source: production_adjudicated` so results can be sliced later.

## Prevent Leakage and Staleness

Split by semantic cluster, customer incident, or time period-not by random row alone. Near-duplicate questions in both development and holdout sets make prompt tuning look stronger than it is. Keep a locked release-gate set and a larger development set whose failures engineers may inspect.

Version all inputs together:

```text
dataset_version + corpus_snapshot + annotation_guide_version + source_precedence_policy
```

When documentation changes, identify affected evidence spans and re-review only dependent records. Retire obsolete examples but retain their history for reproducibility. Add new production failures continuously, while monitoring the distribution so the golden set does not become only a collection of rare bugs.

## Audit the Dataset Before Using It

Run mechanical checks for missing document IDs, duplicate queries, invalid spans, and references that contain facts absent from evidence. Then sample records for expert review. Measure agreement on answerability and atomic claims, not merely whether two reviewers wrote similar paragraphs.

Finally, validate the dataset against deliberately flawed responses: unsupported claims, answers based on the wrong source version, incomplete multi-part answers, and correct abstentions. If the rubric cannot distinguish those cases, the ground truth is not yet ready to gate a release.

## Official Documentation

- [OpenAI Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Ragas Testset Generation for RAG](https://docs.ragas.io/en/stable/concepts/test_data_generation/rag/)
- [Ragas Evaluation Sample schema](https://docs.ragas.io/en/stable/references/evaluation_schema/)
- [NIST AI Risk Management Framework: Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)

## Conclusion

When reference answers do not exist, build them from frozen authoritative evidence and representative real questions. Store answerability, citations, atomic claims, and provenance; use synthetic generation only to propose candidates; and require expert adjudication where errors matter. The result is not merely an answer file-it is a maintainable specification of what grounded behavior means for the RAG system.
