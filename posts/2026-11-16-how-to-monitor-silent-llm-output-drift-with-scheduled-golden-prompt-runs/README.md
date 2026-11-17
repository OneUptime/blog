# How to Monitor Silent LLM Output Drift with Scheduled Golden-Prompt Runs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Monitoring, Python

Description: Detect silent LLM behavior changes with versioned golden prompts, separate judge controls, fresh scheduled requests, and explicit evaluation freshness checks.

A model endpoint can remain available while its answers change. A stable set of golden prompts gives you a repeatable observation point: submit the same versioned cases, grade the results with the same criteria, and inspect changes over time. The difficult part is deciding whether a score change came from the application, the evaluator, the surrounding data, or a missing run.

A golden suite is a behavioral monitor. It measures the tasks you included; it cannot establish that all production behavior is unchanged.

## Freeze the evidence you intend to hold constant

For each case, record the rendered prompt, expected behavior, relevant reference material, tool fixtures, language, and severity. Pin model snapshots where the provider supports them and record the actual returned model identifier. If you deliberately use a moving alias to detect provider changes, make that choice explicit.

Use two companion suites. The first submits frozen inputs to the application and grades fresh outputs. The second grades frozen outputs with known human labels to monitor evaluator behavior. If both move together, investigate the judge before attributing the change to the application.

Maintain a third, separately labeled integration probe if live retrieval or tools are important. A changed catalog or policy can legitimately change a live answer. Combining that probe with a frozen-context suite hides the source of movement.

## Prevent caches from turning monitoring into replay

Each scheduled observation must actually reach the component under test. An application response cache can return yesterday's answer while the model underneath changes. A test harness cache can do the same. Record cache status and confirm the expected upstream request was made.

Provider prompt caching is different: cached input computation can reduce processing work while a fresh output is generated. Do not treat any mention of caching as proof that the answer was replayed. Decide which cache layer you are observing and preserve that distinction in the run record.

LangSmith documents a test cache that reuses identical API call results. Disable or isolate such caching when measuring fresh behavior. Keep fixtures cached only for dependencies you explicitly intend to freeze.

## Schedule runs and monitor their completion

Run at a cadence matched to how quickly a change matters and what the suite costs. Record a unique run ID, intended slot, actual start, completion, expected case count, and observed result count. A partially completed batch must not replace the last complete baseline.

This GitHub Actions fragment shows the trigger only; the job implementation must call your evaluation runner and publish its result:

```yaml
on:
  schedule:
    - cron: '17 */6 * * *'
  workflow_dispatch:
```

With no timezone setting, this runs on a UTC schedule. GitHub documents that scheduled events can be delayed or dropped under load and run from the default branch. Therefore, schedule configuration alone is not proof that the monitor ran. Use an independent freshness check on the latest completed result.

Here is a self-contained Python fixture for the accounting layer:

```python
from datetime import datetime, timedelta, timezone

now = datetime(2026, 11, 16, 18, 0, tzinfo=timezone.utc)
run = {"completed_at": datetime(2026, 11, 16, 12, 20, tzinfo=timezone.utc),
       "expected": 120, "observed": 119, "scored": 118}

def run_health(run, now):
    if run["completed_at"] is None:
        return "never_completed"
    if now - run["completed_at"] > timedelta(hours=8):
        return "stale"
    if run["observed"] != run["expected"] or run["scored"] != run["expected"]:
        return "incomplete"
    return "complete"

assert run_health(run, now) == "incomplete"
assert run_health({**run, "observed": 120, "scored": 120}, now) == "complete"
```

The eight-hour limit is illustrative. Set it from the scheduled interval and tolerated delay. Export monitor health separately from application quality so a grader outage does not masquerade as a perfect score.

## Compare outcomes rather than exact wording alone

Exact string matching is useful for closed labels or identifiers. For prose, separate format, required facts, prohibited claims, and task completion. A paraphrase can be harmless; changing a refund deadline is not. Include examples with adjudicated outcomes to test the grading path itself.

Repeat baseline runs to measure normal variability. Freeze the alert policy before monitoring, including minimum coverage, critical-case behavior, and the practical regression that matters. Display failures and denominators by language and workflow. A global average can hide a small but essential case group.

A confirmed failure of a critical deterministic invariant can justify immediate action. A small movement in a noisy semantic score usually needs a predeclared confirmation procedure. Retrying until a preferred result appears biases the monitor; retain every attempt and show the original failure.

## Investigate without erasing the signal

When an alert fires, compare the same case across the last healthy and current runs. Inspect prompt hashes, retrieved revisions, tool fixtures, provider metadata, grader controls, and incomplete-run counts. If only the evaluator controls changed, quarantine the quality score until the measurement is repaired.

If the product requirement intentionally changes, create a new case or rubric revision and overlap old and new measurements. Do not overwrite historical labels to make the chart green. A useful golden-prompt monitor leaves a clear record of what changed, what remained fixed, and which user-facing behavior now needs attention.

## Official documentation

- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [LangSmith: Experiment configuration](https://docs.langchain.com/langsmith/experiment-configuration)
- [GitHub Actions: Scheduled workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
