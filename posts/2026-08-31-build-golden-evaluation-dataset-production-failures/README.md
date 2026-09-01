# How to Build a Golden Evaluation Dataset from Real LLM Production Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Datasets, Production, Data Quality

Description: Build a durable golden evaluation dataset by turning real production failures into privacy-safe, reproducible, and clearly labeled test cases.

---

A golden dataset should describe what “good” means for your application, not what is convenient to score. Production failures are unusually valuable because they expose cases drawn from the real input distribution, along with the surrounding system state and the consequences of a bad answer. The hard part is converting an incident into a stable test without preserving noise, private data, or a label that only one person understands.

## Start with a Failure Intake Queue

Do not sample only messages with a thumbs-down. Collect candidates from several signals:

- explicit user feedback and support tickets;
- human corrections, escalations, refunds, or abandoned workflows;
- deterministic contract failures such as invalid JSON or a forbidden tool call;
- groundedness, safety, latency, and cost monitors; and
- trace reviews after prompt, model, retriever, or tool changes.

Store a pointer to the original trace in a restricted system, but put only the minimum reproducible information in the evaluation repository. Redact or synthesize personal data, credentials, tenant identifiers, and proprietary text. A redacted case must preserve the property that caused the failure. Replacing every entity with `REDACTED` can destroy coreference, formatting, or retrieval behavior and make the test meaningless.

## Reconstruct the Evaluation Envelope

An isolated user message is often insufficient. Record the inputs that affected the result:

```json
{
  "case_id": "support-refund-0042",
  "failure_class": "wrong_tool_arguments",
  "user_input": "Refund order A-104 after the duplicate charge.",
  "conversation": [{"role": "user", "content": "..."}],
  "retrieved_context_ids": ["refund-policy-v7"],
  "tool_fixtures": {"lookup_order": {"id": "A-104", "status": "paid"}},
  "expected": {
    "tool": "refund_order",
    "arguments": {"order_id": "A-104", "reason": "duplicate_charge"}
  },
  "rubric_version": "tool-use/3",
  "source_window": "2026-08",
  "provenance": "support-escalation"
}
```

Pin mutable dependencies. That may mean a document snapshot or document IDs that resolve to immutable versions, replayed tool responses, system-prompt version, model configuration, locale, and feature flags. Do not save hidden reasoning. Save observable messages, tool calls, outputs, and state transitions needed to reproduce the product contract.

## Label the Desired Behavior, Not the Historical Output

The failed answer is evidence, not the reference answer. Write an expected outcome from the product requirement and domain facts. Prefer deterministic assertions where possible:

- exact schema and required fields;
- permitted tool names and argument constraints;
- citations that resolve to the supplied sources;
- statements that must or must not appear; and
- an explicit refusal or escalation condition.

Use a narrow human or LLM rubric only for qualities that cannot be checked directly. A useful single criterion defines the behavior, names exclusions, and gives pass/fail boundary examples. Have at least two qualified people label an initial calibration sample independently. Review disagreements, revise the rubric, and keep the adjudicated label plus the original votes. OpenAI’s evaluation guidance explicitly recommends calibrating automated scoring against human feedback; the automated grader is not the source of truth merely because it is scalable.

## Build Coverage Deliberately

One incident should rarely become only one row. Add nearby cases that test the same rule without copying irrelevant wording:

1. the exact sanitized regression case;
2. a minimal case that isolates the failed behavior;
3. a paraphrase or format variant;
4. a counterexample where the formerly failing action is correct; and
5. an edge case at the decision boundary.

Maintain a coverage table by workflow, language, customer segment, input length, failure class, and consequence severity. Sample common traffic proportionally, but deliberately oversample rare high-impact failures. Report both the traffic-weighted score and safety-critical slice scores so that a large easy slice cannot hide a severe regression.

Separate the data into roles. Keep a small immutable “never regress” set for known incidents, a representative comparison set for releases, and a challenge set for exploration. If examples are used to tune a prompt or judge, move them out of the untouched holdout. Split related conversations, paraphrases, and documents together to prevent near-duplicate leakage.

## Require a Reproduction and a Fix Check

Before accepting a case, run it against the version associated with the incident when that version is still available. Confirm through the retained trace or repeated independent trials that the asserted failure actually occurs. Predeclare the number of trials and pass-rate threshold when behavior is nondeterministic. Then run the same protocol against the proposed version and confirm it meets the threshold without breaking its counterexample.

A case that cannot be reproduced under the predeclared trial protocol can still be retained as an observed production trace, but mark it separately. Do not silently turn an ambiguous report into a hard release gate. A good intake checklist asks:

- Is the expected behavior supported by a product rule or authoritative source?
- Does the case preserve the original failure mechanism after sanitization?
- Can the scorer distinguish a correct answer from the known bad answer?
- Does a counterexample protect against overfitting?
- Are mutable fixtures and rubric versions pinned?
- Is ownership and review cadence recorded?

## Keep Provenance and History

Use stable case IDs and append-only label history. A label change should be a reviewed migration with a reason, not an in-place edit that rewrites past results. Version datasets and rubrics independently because a score can change when either one changes. Record additions, removals, deduplication, and known limitations in each release.

Track how many new production failures are already covered. A falling coverage rate can mean the product is changing faster than the dataset. Also track yield: if a slice never distinguishes candidates or finds incidents, review whether it is still representative, already saturated, or incorrectly scored.

## Official Documentation

- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [NIST AI RMF Core: Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [NIST AI RMF Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- [Anthropic: Challenges in evaluating AI systems](https://www.anthropic.com/news/evaluating-ai-systems)

## Conclusion

A trustworthy golden dataset is a versioned product artifact: it preserves real failure mechanisms, states an independently justified expected behavior, covers neighboring cases, and retains provenance. Mine production continuously, but promote cases only after privacy review, reproducibility checks, rubric calibration, and counterexample testing.
