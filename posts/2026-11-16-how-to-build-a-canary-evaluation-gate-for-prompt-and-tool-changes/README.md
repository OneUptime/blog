# How to Build a Canary Evaluation Gate for Prompt and Tool Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, CI/CD, Observability

Description: Gate prompt and tool releases with offline canary cases, limited live exposure, explicit evidence thresholds, and rollback-ready version bundles.

A prompt edit can leave HTTP success rates unchanged while increasing unsupported answers or choosing the wrong tool. A tool change can pass isolated unit tests while breaking the model's interpretation of a result. An evaluation gate should catch these failures before a release reaches the whole audience, then keep measuring while a small production cohort exercises the change.

Use two distinct stages: a small, deliberately chosen offline canary suite and a limited live canary. Passing the first makes the candidate eligible for the second. Neither stage proves that every future request will succeed.

## Freeze the release as a bundle

A release identifier must resolve to the prompt template, model configuration, tool schemas, tool implementation, retrieval configuration, and evaluator version. Record the rendered prompt hash as well as the template version because dynamic assembly can change behavior without modifying the template.

Keep the control release available. Rolling back a prompt while leaving an incompatible tool response deployed is not a complete rollback. If a tool writes external state, plan how ongoing runs finish and how partial writes are reconciled. Replaying a payment tool to obtain another evaluation observation is not an acceptable test strategy.

An application-owned manifest might look like this:

```json
{
  "release": "support-agent-42",
  "control": "support-agent-41",
  "prompt_revision": "refund-18",
  "tool_contract": "orders-v7",
  "dataset": "release-canaries-v12",
  "rubric": "refund-policy-v4",
  "rollout_unit": "conversation",
  "initial_exposure_percent": 2
}
```

The two-percent exposure is an illustration, not a recommended universal setting. Choose exposure and duration from traffic volume, failure cost, and the number of observations needed for your decision.

## Choose canaries around the changed behavior

For a refund prompt change, include an eligible order, an expired return window, missing order identity, a tool timeout, and a tool result that requires escalation. Check both the visible answer and the tool arguments. Give the suite known failing controls so a disconnected grader cannot report a misleading perfect score.

Run baseline and candidate on the same versioned cases. Use recorded read responses or an isolated test backend for offline evaluation. If the candidate changes a tool argument, the replay harness must reject a mismatched fixture instead of supplying the response for the baseline's argument.

Keep schema checks, deterministic policy checks, and semantic grading separate. Required tool selection can often be checked directly. Answer faithfulness may need calibrated model or human review. Record missing judgments as incomplete evidence and report their coverage.

## Implement three possible decisions

The gate needs a hold state. A small canary with no observed errors may simply lack evidence. The following Python fixture consumes an already computed quality interval and operational measurements; it does not estimate statistical confidence itself.

```python
from math import isfinite

def gate(m):
    if m["critical_failures"] > 0:
        return "rollback"
    if m["graded"] != m["eligible"] or m["eligible"] < 200:
        return "hold"
    if not all(isfinite(m[k]) for k in ("quality_delta_low", "error_rate")):
        return "hold"
    if m["error_rate"] > 0.02:
        return "rollback"
    if m["quality_delta_low"] <= -0.02:
        return "hold"
    return "eligible_for_next_stage"

sample = {"critical_failures": 0, "graded": 240, "eligible": 240,
          "quality_delta_low": -0.01, "error_rate": 0.004}
assert gate(sample) == "eligible_for_next_stage"
assert gate({**sample, "graded": 239}) == "hold"
assert gate({**sample, "critical_failures": 1}) == "rollback"
```

These thresholds are an example policy. Define your tolerances before seeing candidate results. For paired offline cases, estimate uncertainty from per-case differences. Live canary and control usually receive different requests, so their analysis must use the actual randomized or otherwise justified allocation design. Do not reuse a paired test on unrelated traffic.

## Keep production allocation stable

Assign conversations to a release before their first turn and keep the assignment stable through retries and tool calls. Randomize within relevant cohorts when feasible. Otherwise a canary containing only internal users or one region may miss the production failure you care about.

Measure quality, tool error rate, completion rate, latency, cost, and critical policy violations by release. Include active conversations and delayed outcomes in the accounting. A canary that has not yet received customer feedback should not appear equivalent to a control with mature outcomes.

Choose decision checkpoints in advance. Repeatedly checking a conventional fixed-sample confidence interval until it looks favorable changes the error properties of the decision. Use a single prespecified final analysis, planned analysis points with adjustments for repeated testing, or an appropriate sequential method. At each checkpoint, inspect critical slices as well as the aggregate.

## Make failures actionable

A rejection should identify the failing case, release bundle, tool call, evaluator criterion, and control result. Restrict access to sensitive request content; trace references and sanitized diffs are usually enough for the release summary.

Exercise rollback before depending on it. Confirm that the routing change takes effect, existing runs have a defined policy, and both model and tool versions remain observable. Promote only when the planned evidence is complete. A useful canary gate limits exposure and produces a clear decision, including a clear decision to wait.

## Official documentation

- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Google SRE Workbook: Canarying releases](https://sre.google/workbook/canarying-releases/)
