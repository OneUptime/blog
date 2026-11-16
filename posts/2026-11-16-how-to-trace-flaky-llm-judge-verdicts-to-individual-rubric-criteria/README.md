# How to Trace Flaky LLM Judge Verdicts to Individual Rubric Criteria

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Observability, Prompt Engineering

Description: Localize unstable LLM judge verdicts by freezing candidate answers, tracing atomic rubric criteria, and comparing repeated evidence-bound judgments.

An overall judge verdict can flip even when the answer being evaluated has not changed. Before replacing the judge model, identify which criterion moved. A rubric that combines factual support, completeness, tone, and policy compliance can hide a disagreement inside one pass/fail label.

The investigation should preserve the candidate answer and repeat only the measurement under examination. Regenerating the answer and regrading it changes two variables at once.

## Define an evidence record for each criterion

Assign every criterion a stable ID and revision. State the required evidence, pass boundary, fail boundary, and the meaning of insufficient evidence. Keep evaluator infrastructure errors separate from rubric outcomes.

For example, a support response can have three checks: every refund claim is supported, the requested next step is present, and the cited policy revision is current. A missing source may make the first criterion unjudgeable while the next-step criterion remains assessable. Do not let one generic exception turn all criteria into failures.

Use an application-owned record such as:

```json
{
  "case_id": "refund-18",
  "candidate_revision": "answer-3",
  "criterion_id": "refund_claim_supported",
  "rubric_revision": "4",
  "judge_revision": "judge-config-12",
  "repetition": 2,
  "verdict": "fail",
  "evidence_refs": ["policy-v7:paragraph-8", "answer-3:sentence-2"],
  "reason": "The answer promises an outcome that the cited policy does not guarantee."
}
```

Evidence references should resolve to restricted snapshots. A short reason makes the result reviewable; it is not proof of the judge's internal reasoning or the correctness of its verdict.

## Repeat the judge over unchanged inputs

Freeze the answer, user request, source snapshot, criterion prompt, examples, output schema, parser, and model settings. Save a digest of the assembled evaluation input. If two repetitions have different digests, investigate assembly before calling the judge flaky.

Record every attempt, including timeout, refusal, invalid output, and unavailable evidence. Do not repeatedly call the judge until it returns the preferred label. Use a fixed repetition count and preserve the raw response alongside the parsed outcome in a controlled store.

Keep criterion calls separately observable, whether they are spans or structured evaluation records. Useful fields include run ID, case ID, criterion ID, judge revision, duration, verdict, parse status, and evidence availability. Avoid putting case IDs or raw answer text into metric labels; use metrics for bounded summaries and traces for individual investigations.

## Rank the criteria that need review

The following standalone example reports modal disagreement for each criterion. It deliberately treats an error as unavailable measurement rather than a quality verdict:

```python
from collections import Counter

observations = {
    "supported": ["pass", "fail", "pass", "fail", "error"],
    "complete": ["pass", "pass", "pass", "pass", "pass"],
}
allowed = {"pass", "fail", "cannot_judge"}
for criterion, labels in observations.items():
    valid = [label for label in labels if label in allowed]
    counts = Counter(valid)
    modal_disagreement = (
        1 - max(counts.values()) / len(valid) if valid else None
    )
    print({"criterion": criterion, "attempts": len(labels),
           "valid": len(valid), "unavailable": len(labels) - len(valid),
           "modal_disagreement": modal_disagreement})
```

The support criterion has four valid observations split evenly between pass and fail, plus one unavailable attempt. The completeness criterion is stable in this sample. These are descriptive diagnostics, not a calibrated statistical test or evidence that the stable criterion is accurate.

Inspect both instability and human agreement. A judge can consistently fail a correct answer because the rubric is wrong. Likewise, frequent `cannot_judge` labels may reveal missing evidence rather than stochasticity.

## Examine the exact boundary behind each flip

Read the conflicting verdicts side by side with the relevant source. Typical causes include an undefined term such as material, examples that imply different rules, conflicting policy revisions, a parser default, truncated context, or a multi-part criterion that asks the judge to trade one failure against another.

Change one factor at a time on development cases. Split compound criteria, clarify whether a paraphrase counts, provide an explicit unsupported-claim example, or correct the source assembly. Then rerun the fixed-answer experiment. If you change the criterion's meaning, increment its revision rather than treating the scores as one continuous series.

Input instructions embedded in the answer or retrieved text can also target the evaluator. Keep those strings inside an explicit data boundary and test adversarial examples. Delimiters improve structure but do not guarantee isolation from prompt injection.

## Reconstruct the overall decision

Combine criterion outcomes with an explicit policy outside the judge. For example, all required criteria may need a pass; an unavailable mandatory criterion produces an incomplete evaluation. Do not let a majority vote across unrelated criteria override a critical policy failure.

After repairing the unstable criterion, test on held-out cases and compare with blinded human labels. If repeated voting is introduced, evaluate it as a new judge configuration with its own cost, latency, and error rates. The result of this investigation should be a specific explanation for a verdict change, not simply a smoother overall score.

## Official documentation

- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [LangSmith: Evaluate an existing experiment](https://docs.langchain.com/langsmith/evaluate-existing-experiment)
- [LangSmith: Evaluate with repetitions](https://docs.langchain.com/langsmith/repetition)
