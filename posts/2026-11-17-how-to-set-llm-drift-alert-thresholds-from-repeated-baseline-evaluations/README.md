# How to Set LLM Drift Alert Thresholds from Repeated Baseline Evaluations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Monitoring, Statistical Analysis, Python

Description: Calibrate recurring LLM drift alerts from complete baseline runs, then replay frozen thresholds on held-out runs to measure false alerts and detection delay.

A scheduled evaluation drops from 90% to 87% passing. Is that a regression or ordinary variation? One baseline run cannot answer. Repeated healthy runs reveal the distribution your monitor must distinguish from a meaningful decline.

The monitoring unit matters: if production alerts on one complete evaluation suite every four hours, calibrate against repeated complete suites with that same composition and execution policy.

## Collect comparable whole-run scores

Freeze the cases, weights, rubric, judge, prompt, model configuration, retrieval snapshot, and tool fixtures. Preserve each case result, but also store one aggregate score per scheduled run. Keep suite size, concurrency, retries, and aggregation unchanged. Averaging five repetitions during calibration while checking one repetition in production creates incompatible distributions.

Run fresh requests at representative times. Disable response replay that would manufacture stability. LangSmith documents that repetitions rerun both the target and evaluators, while its test cache can reuse identical API results. Record which components were actually rerun. [Experiment configuration](https://docs.langchain.com/langsmith/experiment-configuration).

Use frozen-answer controls to monitor the judge separately. Reject incomplete or unscorable suites from quality calibration and report their availability separately; do not silently replace missing cases with passes.

## Estimate variability of future runs

A confidence interval for the baseline mean describes uncertainty about an average. As you collect more runs, that interval narrows even when individual runs remain variable. Using its lower endpoint as a future-run alert threshold can therefore trigger frequent false alarms. Prediction must include variability of the new observation. [NIST prediction intervals](https://www.itl.nist.gov/div898/handbook/pmd/section5/pmd512.htm).

For a higher-is-better score, start with an estimated lower-tail percentile of whole-run scores. Choose the tail probability and smallest meaningful decline before examining validation results. Require both an unusual score and that practical decline:

```text
threshold = min(baseline lower-tail percentile, baseline mean - minimum_drop)
breach = new_run_score < threshold
```

This is an application policy, not a distribution-free false-alarm guarantee. Keep an absolute minimum-quality requirement separate: a consistently poor baseline must not make poor behavior acceptable.

## Calibrate once, then replay later runs

This self-contained Python example uses synthetic 200-case suites. Replace them with chronological, known-healthy complete-run scores. The percentile helper implements NIST's R6 interpolation, including endpoint handling; percentile definitions differ, so record the method. [NIST percentiles](https://www.itl.nist.gov/div898/handbook/prc/section2/prc262.htm).

```python
from math import floor, isfinite
from random import Random
from statistics import mean


def lower_percentile(values, probability):
    ordered = sorted(values)
    if not ordered or not 0 < probability < 1:
        raise ValueError("nonempty observations and probability in (0, 1) required")
    if any(not isfinite(v) or not 0 <= v <= 1 for v in ordered):
        raise ValueError("scores must be finite fractions")
    position = probability * (len(ordered) + 1)
    rank = floor(position)
    if rank <= 0:
        return ordered[0]
    if rank >= len(ordered):
        return ordered[-1]
    return ordered[rank - 1] + (position - rank) * (
        ordered[rank] - ordered[rank - 1]
    )


def calibrate(values, tail=0.05, minimum_drop=0.02):
    if not 0 < tail < 0.5 or not 0 <= minimum_drop <= 1:
        raise ValueError("invalid calibration policy")
    cutoff = lower_percentile(values, tail)
    # An illustrative evidence gate, not a statistical sufficiency theorem.
    if len(values) * tail < 10:
        raise ValueError("collect more complete baseline runs for this tail")
    if min(values) == max(values):
        raise ValueError("zero observed variance: investigate before calibration")
    return min(cutoff, mean(values) - minimum_drop)


def replay(values, threshold):
    if not isfinite(threshold):
        raise ValueError("threshold must be finite")
    streak = breaches = episodes = 0
    first_page = None
    for run_number, score in enumerate(values, 1):
        if not isfinite(score) or not 0 <= score <= 1:
            raise ValueError("invalid run; monitor evaluation health separately")
        breach = score < threshold
        breaches += breach
        streak = streak + 1 if breach else 0
        # Page once when two consecutive runs breach; recover on a good run.
        if streak == 2:
            episodes += 1
            if first_page is None:
                first_page = run_number
    return {"runs": len(values), "breaches": breaches,
            "episodes": episodes, "first_page_run": first_page}


rng = Random(41)

def synthetic_runs(pass_probability, count):
    return [sum(rng.random() < pass_probability for _ in range(200)) / 200
            for _ in range(count)]

calibration = synthetic_runs(0.90, 240)
held_out_healthy = synthetic_runs(0.90, 120)
degraded = synthetic_runs(0.84, 60)
threshold = calibrate(calibration)
print("threshold", round(threshold, 4))
print("healthy", replay(held_out_healthy, threshold))
print("degraded", replay(degraded, threshold))
```

The fixture produces a threshold of `0.865`: five breaches and zero paging episodes across 120 healthy runs; 47 breaches and eight episodes across 60 degraded runs, with the first page at run two. These demonstrate the calculation and recovery rule, not measured provider performance.

## Interpret the evidence honestly

The five-percent calibration tail does not promise five-percent future breaches. Ties, interpolation, finite samples, changing conditions, and the practical-drop requirement affect the observed rate. Extreme tails need many more runs: ten observations cannot establish a reliable one-percent threshold. The example's ten-tail-observation gate is only a starting policy.

Zero observed variance may indicate caching, rounded scores, an easy suite, or insufficient repetitions. Do not invent an epsilon standard deviation. Investigate and collect more evidence; deterministic critical invariants can retain explicit failure rules.

Zero pages in the held-out sample does not establish zero future risk. Replay the actual schedule and report breaches per eligible run, paging episodes per month, recovery behavior, and detection delay. Retuning after inspecting the holdout requires another untouched validation period.

## Test the complete alert policy

Two consecutive breaches reduce sensitivity to isolated noise but delay detection. Correlated runs mean their probability is not necessarily the square of a single-run breach probability. A per-slice tail probability is not a fleet-wide or monthly false-alert rate. Preserve time order and test seasonal behavior, cooldowns, and all monitored slices together. NIST cautions that estimated control limits and additional signaling rules change false-alarm behavior. [Control-chart guidance](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc32.htm).

In production, missing scheduled runs should interrupt the consecutive-run rule and trigger a separate freshness signal. Keep threshold, dataset, judge, and alert-policy versions with each decision. Freeze the accepted baseline; automatically absorbing degraded runs into it can erase the change you intended to detect. Recalibrate after a reviewed change, preserving the earlier history and an overlap comparison.
