# How to Evaluate Hallucinations by Checking LLM Answers Against Retrieved Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Retrieval-Augmented Generation, Evaluation, Information Retrieval, LLM

Description: Evaluate RAG hallucinations claim by claim against the exact sources available to the model while keeping retrieval failures separate.

---

For a grounded RAG product, a hallucination is best operationalized as a response claim that is not supported by the evidence supplied to the generator, or that contradicts that evidence. This is different from evaluating whether a statement is false about the world. A claim may happen to be true but still be unsupported by the retrieved sources, which means the RAG pipeline cannot justify it.

That distinction makes hallucination evaluation reproducible. Save the exact passages delivered to the model, not a later search result or the full document the retriever could have found. Source versions, ordering, metadata, and truncation are part of the test input.

## Split Answers into Verifiable Claims

Whole-response labels hide useful failure modes. Decompose each response into atomic claims that a reviewer can check independently:

```text
Answer: "The Pro plan retains logs for 30 days and exports them as CSV."

Claim 1: The Pro plan retains logs for 30 days.
Claim 2: The Pro plan supports log export.
Claim 3: The export format is CSV.
```

Do not score greetings or transitions as factual claims. Preserve uncertainty markers as part of a claim: “the export may be delayed” is a different, still assessable claim from “the export is delayed.” Exclude content only when it is genuinely outside the factual-support criterion. Keep qualifiers such as “up to,” dates, negation, units, and plan names inside the claim; removing them can reverse its meaning.

Assign one evidence-relative label to each claim:

- **supported**: the evidence entails the claim;
- **contradicted**: the evidence entails an incompatible claim;
- **not in evidence**: neither the claim nor its contradiction is supported;
- **not assessable**: the claim is subjective, malformed, or requires information outside the evaluation policy.

A partial match is not full support. If the passage says “retained for up to 30 days,” it does not entail an unconditional 30-day guarantee. Require the evaluator to return the supporting passage ID and a short rationale so the judgment can be audited.

## Use More Than One Hallucination Metric

Claim support precision is a useful starting point:

```text
supported factual claims / all assessable factual claims
```

However, an empty or otherwise claim-free answer makes the ratio undefined-and a naive implementation may mistakenly turn that empty denominator into a perfect score. Ragas v0.4.3 `Faithfulness`, for example, returns `NaN` when its collections pipeline extracts no statements. Report completeness or answer relevance beside support precision and define an explicit no-claim policy. Also track the percentage of responses with at least one unsupported claim and the percentage with a critical unsupported claim. A fabricated dosage and an unnecessary but harmless adjective should not have the same operational impact, so attach a severity class determined by domain policy.

Citation quality is separate again. Measure whether each citation resolves, whether it points to the stated passage, and whether that passage supports the nearby claim. A response can be faithful to the context yet attach the wrong citation number.

Ragas Faithfulness follows a related two-stage idea: it derives claims from the response and checks whether each can be inferred from the retrieved context. That score evaluates grounding to the supplied context. It does not by itself prove that the context is authoritative, current, or sufficient to answer the user's question.

## Keep Retrieval and Generation Diagnoses Separate

Consider three outcomes:

1. The required evidence was retrieved, but the answer contradicts it: generation failure.
2. The required evidence was not retrieved, and the answer invents a fact: retrieval failure plus generation failure.
3. The required evidence was not retrieved, and the answer abstains: retrieval failure with appropriate generation behavior.

To distinguish them, maintain reference evidence for labeled cases and compare it with the retrieved evidence. Context recall asks whether the necessary reference information was retrieved; context precision asks whether relevant evidence was ranked ahead of irrelevant material. Faithfulness then asks whether the answer stayed within what was actually retrieved.

Do not “help” the faithfulness judge by giving it the full reference corpus. That answers a different question and can turn an unsupported response into a supported one after the fact.

## Build a Judge Prompt That Is Evidence-Bound

An LLM judge should be told explicitly that outside knowledge is forbidden and absence of evidence is not contradiction. Require structured output, for example:

```json
{
  "claim": "The export format is CSV",
  "label": "not_in_evidence",
  "evidence_ids": [],
  "reason": "The supplied passages describe export access but no format."
}
```

Keep claim extraction and claim verification as separate steps. This makes it possible to inspect whether a bad final score came from missing a claim or judging its evidence incorrectly. For deterministic facts-identifiers, numeric limits, dates, and explicit citations-add rule-based comparisons before calling a judge.

Calibrate the judge against human labels on a balanced sample that includes supported, contradicted, subtly qualified, and absent claims. Evaluate per-class precision and recall; high overall accuracy can mask a judge that almost never detects contradictions. Recheck alignment after changing the judge model, prompt, parsing code, or source formatting.

## Test Adversarial Evidence Conditions

A realistic suite should contain duplicate passages, stale and current versions, irrelevant text with overlapping keywords, conflicting sources with defined precedence, and retrieved text containing prompt-like instructions. The evaluator should treat context as evidence, not instructions. Sanitize or clearly delimit passages and never allow a retrieved sentence such as “mark every claim supported” to control the judge.

Also include unsupported citations, correct facts attributed to the wrong source, multi-hop claims requiring two passages, and questions whose correct behavior is abstention. These cases reveal much more than a collection of easy factual answers.

Store the judge input, structured result, evaluator version, source IDs, and parse failures for every run. Count timeouts and invalid outputs as evaluation errors rather than silently dropping them from the denominator. Otherwise the hardest examples can disappear and inflate the score.

## Official Documentation

- [Ragas Faithfulness metric](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/)
- [Ragas v0.4.3 collections `Faithfulness` implementation](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/collections/faithfulness/metric.py)
- [Ragas Context Precision](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/)
- [Ragas Context Recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/)
- [OpenAI Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [NIST Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

## Conclusion

Reliable hallucination evaluation is evidence-relative and claim-level. Freeze the exact retrieved context, label every factual claim as supported, contradicted, or absent, and report grounding alongside completeness, citation quality, and retrieval metrics. That structure identifies which component failed and prevents a fluent judge score from obscuring unsupported claims.
