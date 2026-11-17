# How to Regression-Test LLM Judge Changes by Replaying Stored Agent Runs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Regression Testing, Data Quality

Description: Regression-test evaluator changes against immutable agent traces, paired human labels, and explicit error-direction metrics without reexecuting production tools.

Changing an LLM judge can move every quality chart even when the application has not changed. A stronger model, a clarified rubric, or a repaired parser may all change scores for good reasons. Before adopting the change, run old and new judges over the same stored agent runs and inspect which decisions move.

For this experiment, replay means replaying evidence into the evaluator. It does not mean executing the agent's tools again. Reissuing writes would change external state and confound a test that is supposed to isolate the judge.

## Freeze the complete evidence package

Store the user request, final answer, relevant tool calls and results, source revisions, and any verified outcome required by the rubric. Assign a case revision and retain an immutable snapshot. A link to a live document is insufficient if its contents can change between judge runs.

Decide whether the criterion requires the full trace or only selected observations. A judge evaluating authorization may need the permission context and tool arguments. A judge evaluating answer completeness may need the user request and final response. Missing required evidence should produce a defined unavailable outcome.

Keep sensitive trace content in a restricted store and provide evaluators only the fields they need. Candidate text and tool outputs are untrusted data, including when they contain instructions aimed at the judge.

## Version everything that affects the measurement

The judge version includes the model, rubric, examples, request assembly, decoding configuration, schema, parser, and aggregation policy. Changing a parser default can alter outcomes as much as changing the model.

Run both versions against the same case revisions. Blind the evaluator to whether a trace comes from a preferred agent release or a historically successful customer interaction unless that information is required by the criterion. Keep human labels out of the judge input when they are the independent comparison target.

Include known good, known bad, boundary, malformed, and evidence-missing cases. Add an untouched representative set for confirmation. Cases used to repair the new judge are development data and cannot serve as its final independent assessment.

## Reuse stored runs through the evaluation system

LangSmith's Python SDK supports adding evaluators to an existing experiment by passing its name or ID to `evaluate`. That evaluates the previously recorded results without reexecuting the target function. The following integration sketch requires an existing experiment and your two evaluator implementations:

```python
from langsmith import evaluate

# judge_v1 and judge_v2 are application-defined evaluator callables.
# Give their returned feedback distinct keys, such as policy_v1 and policy_v2.
evaluate(
    "recorded-agent-runs:your-experiment-id",
    evaluators=[judge_v1, judge_v2],
    load_nested=True,
)
```

Verify that the stored runs include the required intermediate evidence. `load_nested=True` loads logged child runs; evaluators that need tool traces should accept a `run` argument and inspect its `child_runs` tree. By default, only root runs are loaded. An experiment containing only final answers cannot establish what a missing tool call did. Retain separate feedback keys and an external manifest so a newer evaluation does not overwrite the interpretation of historical scores.

## Count improvements and regressions by direction

Overall agreement between judges is not enough. If they disagree, compare both with adjudicated human labels. A new judge can improve total agreement while increasing false passes on a critical failure class.

This self-contained fixture records transitions and end-to-end correctness. An error counts as unavailable measurement and is not silently discarded:

```python
from collections import Counter

rows = [
    {"human": "fail", "old": "pass", "new": "fail"},
    {"human": "pass", "old": "pass", "new": "error"},
    {"human": "fail", "old": "fail", "new": "pass"},
    {"human": "pass", "old": "fail", "new": "pass"},
]
transitions = Counter((r["old"], r["new"]) for r in rows)
for version in ("old", "new"):
    correct = sum(r[version] == r["human"] for r in rows)
    false_pass = sum(r["human"] == "fail" and r[version] == "pass" for r in rows)
    false_fail = sum(r["human"] == "pass" and r[version] == "fail" for r in rows)
    unavailable = sum(r[version] not in {"pass", "fail"} for r in rows)
    print(version, {"correct": correct, "total": len(rows),
                    "false_pass": false_pass, "false_fail": false_fail,
                    "unavailable": unavailable})
print(transitions)
```

Define denominators explicitly when converting these counts to rates. False-pass rate among human failures differs from the fraction of judge passes that were wrong. Show both when both affect the decision. If the test sample intentionally overrepresents failures, do not present unweighted rates as production prevalence estimates.

## Measure repeatability and operational cost

Repeat scoring on unchanged evidence to compare judge stability. Inspect invalid outputs, refusals, timeouts, latency, and cost. A new judge that improves accuracy but cannot grade the required volume may need a narrower role or a cascade with human review.

Treat multiple verdicts for one case as correlated measurements. Aggregate at the case or conversation level before estimating uncertainty, or use a method that respects the hierarchy. Record the analysis plan before reviewing the candidate results.

## Introduce the new judge with an overlap period

Set acceptance rules for critical false passes, human agreement, coverage, repeatability, and operating cost. Review every consequential changed verdict. A changed business policy requires a new rubric version and may legitimately change the human target; do not hide that inside a model upgrade.

Run both judges in parallel on a sampled overlap period. Mark the measurement change on dashboards and preserve old scores. Backfill only with a clear judge-version label. A successful regression test explains why decisions changed and which evaluator is trustworthy for the intended scope.

## Official documentation

- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [LangSmith: Evaluate an existing experiment](https://docs.langchain.com/langsmith/evaluate-existing-experiment)
- [LangSmith: Compare experiment results](https://docs.langchain.com/langsmith/compare-experiment-results)
