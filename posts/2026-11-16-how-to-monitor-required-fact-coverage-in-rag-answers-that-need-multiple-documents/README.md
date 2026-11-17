# How to Monitor Required Facts in RAG Answers Across Multiple Documents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Evaluation, Observability, Python

Description: Measure retrieval and answer coverage against explicit required facts when a RAG response must combine evidence from several documents.

An answer explains the refund deadline but omits the regional exception and required approval. Every sentence may be grounded in a source, yet the answer is incomplete. Faithfulness alone does not reveal what the response failed to say.

Define the required facts for each evaluation question and track their coverage through retrieval, context assembly, and the final answer. This is especially useful when a question cannot be answered from one document.

## Make the coverage denominator explicit

Create a reviewed fact inventory before evaluating the candidate answer. For “Can this account receive a refund, and what approval is needed?” the inventory might contain eligibility, deadline, regional exception, and approval authority.

For each fact, record a fact ID, a precise proposition, acceptable evidence, applicability conditions, and whether it is mandatory. Freeze the corpus revision and the question context, including relevant region and date. A different context may change which facts are required.

Ragas' context-recall metric decomposes a reference answer into claims and assesses whether retrieved context supports them. Its factual-correctness metric separately compares response and reference claims using precision, recall, or F1. These are useful foundations, but an application-specific mandatory-fact inventory makes the product requirement explicit. [Ragas context recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/), [Ragas factual correctness](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/factual_correctness/).

## Record coverage at three boundaries

For every required fact, evaluate whether evidence was retrieved, whether that evidence survived into the final prompt, and whether the answer states the fact correctly. Retain the supporting chunk IDs at each boundary.

Do not infer coverage merely from a document ID. A policy document can contain the required exception while the retrieved chunk contains only its introduction. Where evidence must be combined, represent the support relationship explicitly: two chunks may jointly establish a fact even when neither does alone.

Use independent verdicts for missing and contradicted facts. A wrong deadline is a more specific failure than a deadline that was omitted.

## Compute transparent application metrics

The following standalone example consumes already reviewed fact labels. It does not claim to determine semantic correctness from string matching. The weights and mandatory flags are product choices rather than a standardized metric.

```python
facts = [
    {"id": "eligibility", "weight": 1, "mandatory": True,
     "retrieved": True, "context": True, "answer": "correct"},
    {"id": "deadline", "weight": 1, "mandatory": True,
     "retrieved": True, "context": True, "answer": "correct"},
    {"id": "regional_exception", "weight": 2, "mandatory": True,
     "retrieved": True, "context": False, "answer": "missing"},
    {"id": "approver", "weight": 1, "mandatory": True,
     "retrieved": False, "context": False, "answer": "missing"},
]

def coverage(facts):
    if not facts or any(f["weight"] <= 0 for f in facts):
        raise ValueError("nonempty facts with positive weights required")
    if any(f["answer"] not in {"correct", "missing", "contradicted"} for f in facts):
        raise ValueError("unresolved evaluation label")
    total = sum(f["weight"] for f in facts)
    def fraction(predicate):
        return sum(f["weight"] for f in facts if predicate(f)) / total
    return {
        "retrieved_coverage": fraction(lambda f: f["retrieved"]),
        "context_coverage": fraction(lambda f: f["context"]),
        "answer_coverage": fraction(lambda f: f["answer"] == "correct"),
        "mandatory_complete": all(
            f["answer"] == "correct" for f in facts if f["mandatory"]
        ),
        "contradictions": sum(f["answer"] == "contradicted" for f in facts),
    }

result = coverage(facts)
assert result["retrieved_coverage"] == 0.8
assert result["context_coverage"] == 0.4
assert result["answer_coverage"] == 0.4
assert result["mandatory_complete"] is False
```

Report the unweighted fact count as well as weighted coverage. A favorable weighted average should not hide a missing mandatory requirement. Cases with incomplete evaluation labels belong in an unresolved bucket, not in the pass count.

## Diagnose the missing fact

If the approver fact never appears in retrieval, inspect query decomposition, metadata filters, and whether the approval document was indexed. If the regional exception appears in candidates but disappears from context, inspect reranking, deduplication, and token allocation. If the full evidence reaches the model but the answer omits it, inspect instructions, output structure, and generation.

A model may answer a missing fact from prior knowledge. That could be correct, but it does not satisfy a source-grounded contract unless the required evidence is supplied and cited. Track answer correctness and evidence support separately.

For synthesis questions, preserve relationships among facts. A list containing “30 days” and “manager approval” can still be wrong if it applies the approval requirement to the wrong region.

## Monitor coverage without rewarding verbosity

Add fact-count and document-count slices to the dashboard. A system may work well on one-source questions and fail sharply when three sources are required. Track mandatory completeness, contradictions, and evaluation coverage alongside aggregate recall.

If an LLM judge labels facts, give it a fixed rubric and the relevant evidence, record its version, and periodically compare it with human judgments. Treat malformed output and unavailable judges as evaluation failures. Do not let the candidate answer define its own required-fact inventory.

Test missing sources, dropped exceptions, contradictory revisions, and correct but incomplete answers. A release should improve the facts the user needs, rather than merely produce more fluent or longer responses.
