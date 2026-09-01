# How to Turn LLM Evaluation into a Reliable CI Regression Gate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, CI/CD, Regression Testing, Test Automation

Description: Build a CI gate that catches meaningful LLM regressions without confusing stochastic variation, judge failures, or infrastructure errors with product quality.

---

An LLM evaluation becomes a useful CI gate only when a failed check has a clear meaning. A rule such as “fail when average score is below 0.80” looks precise, but it can be unstable when outputs, judges, and sample composition vary. Reliable gates pair the candidate with a known baseline, isolate deterministic contracts, quantify uncertainty, and treat evaluation infrastructure failures separately.

## Define a Release Contract

Write the gate policy before wiring it into CI. For each metric and critical slice, specify:

- the dataset and rubric version;
- candidate and baseline model, prompt, retriever, and tool versions;
- decoding settings and number of repetitions;
- whether the metric is deterministic, human-labeled, or judge-based;
- maximum acceptable regression and minimum absolute floor;
- confidence level and decision rule; and
- what happens when a score is missing.

Pin the full evaluation envelope in a manifest. A model alias, live document index, unversioned prompt, or changing tool response makes a CI result impossible to reproduce. Use replay fixtures for external tools where the test is about agent decisions, and run separate integration evaluations for live dependencies.

## Use Layers Instead of One Expensive Suite

Run cheap, high-signal checks on every pull request:

1. schema validation, exact constraints, citation resolution, and tool-argument types;
2. a small set of historical “never regress” failures;
3. a stratified smoke sample comparing candidate and baseline; and
4. evaluator health checks with known good and known bad outputs.

Run the larger representative dataset, repeated stochastic trials, and costly judges on trusted branches, a nightly schedule, or before release. This keeps feedback fast without weakening the release decision. Cache only immutable intermediate results whose key includes all behavior-affecting inputs.

## Compare Paired Results

Run candidate and baseline on the same case, fixtures, and scoring path. Compute a per-case difference rather than comparing unrelated aggregate runs:

```python
from scipy.stats import bootstrap
import numpy as np

baseline = np.asarray(load_scores("baseline.json"), dtype=float)
candidate = np.asarray(load_scores("candidate.json"), dtype=float)

if baseline.shape != candidate.shape or baseline.size < 2:
    raise RuntimeError("candidate and baseline need the same case set with at least two rows")
if not np.isfinite(baseline).all() or not np.isfinite(candidate).all():
    raise RuntimeError("incomplete evaluation results")

deltas = candidate - baseline
if np.all(deltas == deltas[0]):
    # BCa is undefined for a degenerate bootstrap distribution. The empirical
    # bootstrap distribution collapses to the observed point value.
    low = high = float(deltas[0])
else:
    ci = bootstrap(
        (deltas,), np.mean, confidence_level=0.95,
        n_resamples=9999, method="BCa", rng=np.random.default_rng(7)
    ).confidence_interval
    low, high = float(ci.low), float(ci.high)
    if not np.isfinite([low, high]).all():
        raise RuntimeError("confidence interval could not be estimated")

allowed_regression = -0.02
if low <= allowed_regression:
    raise SystemExit(
        "non-inferiority gate not cleared: "
        f"mean={deltas.mean():.3f}, 95% CI=({low:.3f}, {high:.3f})"
    )
```

Load or join these arrays by stable case ID and verify the IDs match before relying on positional pairing. The constant-difference branch prevents a degenerate BCa result from becoming a non-finite interval that accidentally passes the gate. Its point interval describes the empirical resampling distribution only; it is not evidence that an unseen production population has zero uncertainty. A production gate still needs enough independent, representative cases when the observed differences happen to be identical.

The exact rule is a product decision. A conservative non-inferiority gate may block when the lower confidence bound is at or below the tolerated regression because the data have not ruled out unacceptable harm; that does **not** prove the candidate regressed. Another policy may fail only when the upper bound is below the tolerance, requiring stronger evidence of harm but permitting uncertain candidates. State which error is more costly: temporarily blocking a good change or shipping a bad one.

For binary critical behaviors, also impose hard constraints such as zero unsafe tool calls in designated cases. Do not let a high average compensate for violating a non-negotiable invariant.

## Make Missing Scores Fail Clearly

`NaN`, timeout, malformed judge output, rate limiting, and empty slices are not passing results and should not be silently dropped from a mean. Emit a distinct evaluator-error status with counts and case IDs. Retry only failures considered transient and cap retries. If required coverage remains incomplete, fail the job as an infrastructure error so reviewers do not misread it as a quality regression.

Test the grader with controls on every run:

- a response that must pass;
- a response that must fail;
- a boundary example; and
- a malformed or unavailable-judge case that must surface an error.

If controls fail, do not trust the candidate score.

## Publish Evidence, Not Just Red or Green

Upload a machine-readable artifact containing the manifest, per-case outputs, tool traces, scores, missing-result reasons, aggregate confidence intervals, and cost. The pull-request summary should show:

- candidate and baseline means;
- paired delta and interval;
- results for critical slices;
- new failures and fixed regressions; and
- evaluator coverage and health.

Keep prompts and responses out of public artifacts if they contain sensitive data. Reference restricted trace IDs instead.

## Wire the Gate into GitHub Actions

A minimal workflow can invoke a repository-owned script and rely on its exit status:

```yaml
name: llm-eval
on: [pull_request]

jobs:
  regression:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with:
          python-version: "3.13"
          cache: pip
      - run: pip install -r evals/requirements.lock
      - run: python -m evals.run --suite pr --baseline evals/baseline.json
        env:
          EVAL_API_KEY: ${{ secrets.EVAL_API_KEY }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: llm-eval-report
          path: evals/results/
```

GitHub Actions treats a nonzero exit as failure. Protect the target branch with this check only after observing it in advisory mode, measuring flakiness, and confirming that failures are actionable. Do not give pull-request code from untrusted forks access to production secrets or writable caches.

## Roll Out the Gate Safely

First run the suite in shadow mode across normal changes. Record false alarms, rerun rates, time, and cost. Calibrate the judge against blinded human labels and estimate run-to-run variance. Freeze an initial baseline only after the measurement is stable.

Require explicit review for intentional product-contract changes. Such a change should update the rubric, affected cases, and baseline in one reviewed diff, with before-and-after results. Never make “update the snapshot until CI is green” the normal workflow.

## Official Documentation

- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [GitHub Docs: Building and testing Python](https://docs.github.com/en/actions/tutorials/build-and-test-code/python)
- [GitHub Docs: Setting exit codes for actions](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/set-exit-codes)
- [SciPy: `scipy.stats.bootstrap`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html)

## Conclusion

A dependable CI gate is a controlled paired experiment, not a raw score threshold. Pin inputs, separate deterministic and stochastic layers, use critical-slice invariants, quantify the paired regression, and fail visibly on evaluator errors. Then publish enough evidence for a reviewer to understand exactly why the gate decided to block.
