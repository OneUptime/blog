# How to Compare Prompt and Model Versions Using Stored Production Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Regression Testing, Observability

Description: Compare prompt and model changes on immutable production-derived cases while separating model-only replay from complete workflow evaluation.

Production traces contain realistic failures that synthetic prompts often miss: ambiguous requests, unusual tool results, and long conversations. They can support a fair comparison between prompt or model versions, but only after you decide what is held constant. A trace is an observation of one execution, not automatically a replayable test case.

For example, if the old agent fetched the wrong order, feeding its recorded result to a new model tests answer generation over bad evidence. It does not test whether the new agent would choose the correct order. Preserve that distinction in the experiment name and report.

## Choose the comparison boundary

There are three useful experiments:

| Experiment | What changes | What stays fixed |
| --- | --- | --- |
| Answer generation | Prompt or model | Rendered request context and tool results |
| Agent decisions | Prompt, model, or orchestration | Initial state and a validated tool simulator |
| Full integration | Deployed workflow | Case intent and controlled backend state |

Start with the smallest boundary that addresses the proposed change. A model-only comparison is easier to interpret, while a full workflow test catches integration failures. They answer different questions, so keep their scores separate.

## Build immutable cases from traces

Select cases using a recorded sampling rule. Include successful requests, failures, rare workflows, and critical languages. Sampling only complaints estimates performance on complaints. If that is intentional, label it as a challenge suite rather than a production quality estimate.

Store a stable case ID, source trace reference, authorized input snapshot, retrieved-document revisions, rendered tool responses, expected invariants, and the outcome time horizon. Redact or replace sensitive fields consistently. If redaction removes evidence needed to grade the answer, mark the case unsuitable for that criterion.

This application-owned record illustrates the model-only boundary:

```json
{
  "case_id": "case-018",
  "source_trace_ref": "restricted-trace-018",
  "boundary": "answer_generation",
  "input_snapshot": "case-018-input-v2",
  "tool_fixture": "order-lookup-v7-case-018",
  "expected": {"must_not_promise_refund": true},
  "case_revision": 2
}
```

A digest can detect accidental changes, but it neither encrypts the content nor authorizes reuse. Restrict the snapshot store and give evaluation data its own retention policy.

## Re-run both versions under the same conditions

Generate baseline and candidate answers now using the same cases and environment. Historical baseline answers can support a useful comparison, but a change in serving conditions or dependencies then becomes part of the contrast. Record that limitation instead of claiming isolation.

Keep model settings, context assembly, tool contracts, and grader settings identical except for the intended change. Randomize execution order to reduce time-of-day effects. Repeat stochastic generations when the decision requires it, preserving case and repetition IDs.

LangSmith supports repetitions, but its experiment configuration documents that repetitions execute both the target and evaluators. To isolate judge changes, score stored outputs separately. To measure fresh generation variability, ensure a response cache is not replaying the same answer.

## Join by identity before calculating changes

Never compare two CSV files by row position. A retry, timeout, or filtered result can reorder records. This standard-library fixture rejects duplicate and missing case IDs before calculating a paired pass-rate difference:

```python
def index_rows(rows):
    indexed = {}
    for row in rows:
        key = row["case_id"]
        if key in indexed:
            raise ValueError(f"duplicate case: {key}")
        if type(row["passed"]) is not bool:
            raise ValueError(f"missing or invalid grade: {key}")
        indexed[key] = row["passed"]
    return indexed

baseline = index_rows([{"case_id": "a", "passed": True},
                       {"case_id": "b", "passed": True}])
candidate = index_rows([{"case_id": "b", "passed": False},
                        {"case_id": "a", "passed": True}])
if not baseline or baseline.keys() != candidate.keys():
    raise ValueError("case coverage differs or is empty")
delta = sum(int(candidate[k]) - int(baseline[k]) for k in baseline) / len(baseline)
print(delta)  # -0.5 in this deliberately tiny fixture
```

With repeated generations, use a composite key or first aggregate within each case according to the analysis plan. Do not treat correlated turns from one conversation as independent observations. Report uncertainty using the sampling unit that reflects the workload, and show the regression cases beside the aggregate.

## Inspect changes at the right stage

A candidate may improve the answer while becoming slower because it makes an extra lookup. Another may reduce token use by omitting a required fact. Compare tool sequences, source selection, refusal behavior, latency, and cost alongside answer quality.

Use blinded grading so the evaluator does not see which answer is newer or more expensive. Keep errors, unavailable judgments, and incomplete traces visible. A missing tool result is missing evidence, not proof the tool never ran.

LangSmith's comparison view can display outputs and traces side by side. The important review remains the same in any system: inspect the concrete cases that changed, verify the evaluation inputs, and determine whether the difference addresses the release objective. Store the experiment manifest and immutable case revision so the next comparison uses an explainable baseline.

## Official documentation

- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [LangSmith: Experiment configuration](https://docs.langchain.com/langsmith/experiment-configuration)
- [LangSmith: Compare experiment results](https://docs.langchain.com/langsmith/compare-experiment-results)
