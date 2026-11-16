# How to Measure Guardrail False Positives on Harmless Quoted Attack Examples

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Guardrails, Testing, Security

Description: Measure guardrail false positives on benign quotations using paired context fixtures, explicit policy labels, and separate detection and enforcement metrics.

A security assistant may need to explain why a sentence such as “ignore previous instructions” is suspicious. A guardrail that blocks every appearance of that phrase can prevent legitimate analysis. Measure this as a classification and enforcement problem with a labeled corpus, not as a collection of anecdotes about awkward refusals.

A quotation is not automatically harmless. Label the user's intended operation, surrounding context, and allowed output according to the application's policy before deciding that a block was a false positive.

## Define the expected decision

Keep two labels for each fixture: whether an attack pattern appears in the text, and whether the application should block the requested operation. Those are different targets. A detector can correctly identify quoted attack language while the application should still allow a bounded explanatory task.

Azure Prompt Shields distinguishes attack-pattern detection from application task alignment and other safety properties. For direct Azure AI Content Safety calls, the application decides how to act on the returned detection. Evaluate that integration decision separately from the detector output. [Prompt Shields concepts and application responsibilities](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/concepts/jailbreak-detection).

Write a short rubric covering educational explanation, incident triage, translation, retrieved-document analysis, and actual attempts to redirect the agent. Have reviewers label cases without seeing the current guardrail result. Retain `needs_review` when the policy is unclear rather than forcing a convenient binary label.

## Build paired examples

Create pairs that share suspicious text but differ in context. For example, one fixture asks the assistant to identify an instruction inside a quoted document; another presents that instruction as the user's actual direction. Use harmless synthetic targets and disabled tools.

Vary quotation style, code fences, nested JSON, document position, and language. Include benign cases without attack-like phrases, plus disallowed cases that do not contain the obvious keywords. Otherwise a keyword detector can look strong on the benchmark without understanding the distinction you care about.

Record a `family_id` for related variants. Keep entire families together when splitting development and holdout sets, so punctuation variants of a tuned example do not masquerade as independent generalization tests.

A useful fixture schema is:

```json
{
  "case_id": "quote-021",
  "family_id": "quoted-instruction-analysis",
  "language": "en",
  "task_type": "explain_quoted_text",
  "contains_attack_pattern": true,
  "expected_action": "allow",
  "policy_version": "support-assistant-v4",
  "review_status": "adjudicated"
}
```

Store the associated text under the dataset's access policy. The record above is application-defined metadata, not a provider request schema.

## Calculate the correct denominator

Define a positive prediction as an enforcement block and a positive reference label as a request that should be blocked. The end-to-end false-positive rate is blocked benign requests divided by all labeled benign requests. The share of blocks that were mistaken is a different metric. For detector-quality analysis, you can also calculate rates conditional on valid decisions, but label that narrower denominator explicitly.

This runnable Python fixture computes rates conditional on valid decisions and counts unavailable decisions separately:

```python
rows = [
    {"expected": "allow", "actual": "block"},
    {"expected": "allow", "actual": "allow"},
    {"expected": "block", "actual": "block"},
    {"expected": "block", "actual": "allow"},
    {"expected": "allow", "actual": "error"},
]
scored = [r for r in rows if r["actual"] in {"allow", "block"}]
fp = sum(r["expected"] == "allow" and r["actual"] == "block" for r in scored)
tn = sum(r["expected"] == "allow" and r["actual"] == "allow" for r in scored)
tp = sum(r["expected"] == "block" and r["actual"] == "block" for r in scored)
fn = sum(r["expected"] == "block" and r["actual"] == "allow" for r in scored)
result = {
    "false_positive_rate": fp / (fp + tn) if fp + tn else None,
    "false_negative_rate": fn / (fn + tp) if fn + tp else None,
    "mistaken_share_of_blocks": fp / (fp + tp) if fp + tp else None,
    "unscored": len(rows) - len(scored),
}
assert result["false_positive_rate"] == 0.5
assert result["unscored"] == 1
print(result)
```

The fixture excludes the error row from its rate denominators. In production, report unavailable decisions by reference class and record whether fail-open or fail-closed handling actually allowed or blocked each request. Use that final action across all labeled requests for end-to-end rates; otherwise detector outages can disappear from your quality numbers.

This orientation matches the usual binary confusion-matrix convention documented by scikit-learn. Always state which class is positive when publishing the results. [scikit-learn confusion-matrix reference](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.confusion_matrix.html).

## Compare policies without hiding regressions

Run the same holdout cases against the current and proposed policies. Report changes by task type and language, alongside attack misses, detector errors, and review volume. A lower false-positive rate achieved by allowing every request is not an improvement.

For stochastic detectors, repeat each case and report decision consistency. Treat repeats as observations of the same case rather than independent new examples. Show sample sizes and uncertainty, especially for small language slices. A zero observed error count on ten examples is weak evidence.

## Use the result to change behavior carefully

Inspect false positives with the highest user impact. Potential fixes include better separation of document text from instructions, a narrower task policy, or routing ambiguous examples to review. Quotation marks alone should never grant permission to execute the quoted instruction.

After a change, rerun both benign quotation cases and disallowed redirection cases. Monitor sampled production blocks with human review and keep unknown outcomes visible. The goal is to let authorized explanatory work proceed while preserving the application's independent restrictions on tool use and external effects.
