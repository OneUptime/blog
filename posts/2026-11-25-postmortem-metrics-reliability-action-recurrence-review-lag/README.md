# Postmortem Metrics That Help Improve Reliability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem, SRE, Incident Management

Description: Measure verified action completion, recurring failure patterns, detection, and review lag with clear cohorts and safeguards against misleading averages.

A dashboard can show that 95% of postmortem actions are closed while the most important protection remains unimplemented. Another can show faster reviews simply because the oldest unfinished reports are missing from the calculation.

Useful postmortem metrics help a team choose what to investigate or improve. They need clear definitions, a stable population, and enough context to distinguish administrative progress from a change in customer reliability.

Google describes using consistently structured postmortems to analyze incident trends. Consistency makes comparison possible; it does not make every count a good measure of improvement. [Postmortem trend analysis](https://sre.google/workbook/postmortem-analysis/)

## Start with the decision each metric supports

Choose a small set of measures whose results lead to an operational question.

| Metric | Decision it can support | Common misleading interpretation |
|---|---|---|
| Verified action completion | Which accepted safeguards need attention? | Closed tickets mean the failure class is eliminated |
| Recurrence of a failure pattern | Did related incidents continue after a change? | No reported recurrence proves the change worked |
| Detection interval | Where is customer impact going unnoticed? | Faster pages always mean better detection |
| Review lag and open-review age | Is learning reaching teams while context is available? | A short median means all reviews are timely |

Keep these measures at the service or improvement-program level. Ranking individual responders by them can encourage shorter reports, easier action items, or narrower incident definitions instead of better reliability.

## Define action completion as a verified outcome

Choose the action population before counting results. For example: actions accepted before the reporting cutoff whose original due date is on or before that cutoff.

Report implementation and verification separately. A new alert can be deployed but still have an untested notification path. A retry limit can exist in configuration without evidence that the affected client uses it.

Google's postmortem guidance emphasizes actions with owners, priorities, and verifiable end states. Those fields provide a better basis for tracking improvement than ticket status alone. [Concrete action items](https://sre.google/workbook/postmortem-culture/)

Preserve the original due date when work is rescheduled. A legitimate extension changes the current plan, but it should not rewrite whether the earlier commitment was met. Report deferrals, rejections, and replacements explicitly rather than counting them as completed protection.

## Calculate a stable due-action cohort

The following fictional example includes six previously accepted actions. A cohort means the defined group included in a calculation. Five actions were originally due by the end-of-day cutoff; one has a future original deadline. A6 has been deferred, but remains visible in the original-commitment measure.

Save this as `action_metrics.py` and run `python3 action_metrics.py` with Python 3.9 or later. It uses standard-library dates and was checked with Python 3.9.6. [Python date handling](https://docs.python.org/3.13/library/datetime.html)

```python
from datetime import date

cutoff = date.fromisoformat("2026-11-25")
# ID, original due date, current due date, verification date
rows = [
    ("A1", "2026-11-20", "2026-11-20", "2026-11-19"),
    ("A2", "2026-11-21", "2026-11-21", "2026-11-24"),
    ("A3", "2026-11-23", "2026-11-23", None),
    ("A4", "2026-11-25", "2026-11-25", "2026-11-25"),
    ("A5", "2026-12-05", "2026-12-05", None),
    ("A6", "2026-11-22", "2026-12-12", None),
]
actions = [
    (key, date.fromisoformat(original), date.fromisoformat(current),
     date.fromisoformat(verified) if verified else None)
    for key, original, current, verified in rows
]
due = [item for item in actions if item[1] <= cutoff]
verified = [item for item in due
            if item[3] is not None and item[3] <= cutoff]
on_time = [item for item in verified if item[3] <= item[1]]

print("Originally due:", len(due))
if due:
    print(f"Verified by cutoff: {len(verified) / len(due):.0%}")
    print(f"Verified by original due date: {len(on_time) / len(due):.0%}")
else:
    print("Completion rates: not applicable")
print("Due but not yet verified:", len(due) - len(verified))
print("Rescheduled within cohort:", sum(item[2] > item[1] for item in due))
```

Expect five originally due actions, 60% verified by cutoff, 40% verified by the original due date, two not yet verified, and one rescheduled. A2 counts as verified by cutoff but late. Moving A6's current deadline into December does not remove its missed November commitment from this view.

This is one proposed reporting definition, not an industry-standard formula. It assumes the input contains the accepted actions for the snapshot. A real implementation also needs disposition history, approval dates, and evidence links so later edits do not alter historical reports invisibly.

## Show which risk remains behind the percentage

A completion percentage weights every included action equally. Completing four documentation edits does not necessarily compensate for leaving one high-impact isolation control undone.

Show the remaining high-priority actions, their age, current decision, and expected effect beside the rate. Keep the weighting transparent if you add a risk-weighted measure; a complicated score can be harder to audit than the underlying list.

Use verification evidence to distinguish an improvement delivered from an improvement demonstrated. A controlled exercise may show that a safeguard limits a particular failure mode, while customer-impact trends provide a different, longer-term view.

## Measure recurrence by mechanism and exposure

Group related incidents using a reviewed failure pattern, such as retry amplification against a saturated dependency. Identical alert names do not guarantee identical mechanisms, and different error messages may belong to the same pattern.

Compare periods only after checking workload, traffic, deployment frequency, instrumentation, and incident-reporting criteria. A quieter month may provide fewer opportunities for the failure to recur. A reporting change may reveal incidents that were previously invisible.

Record whether recurrence happened before or after the relevant action was deployed and verified, and whether it affected the same configuration and workload. An incident after a fix may reveal incomplete rollout, a broader failure mode, or a different mechanism; it does not automatically prove the action was useless.

Keep the customer effect visible: affected operations, duration, or reliability-target consumption. A recurring fault with much smaller impact can indicate useful mitigation even when prevention is incomplete.

## Define detection from customer impact to an actionable signal

Specify the start event and detection event. An example definition is the interval from confirmed customer-impact onset to the first signal that prompted response. Separate automated detection from customer-reported detection when that distinction supports improvement.

If impact onset is uncertain, retain a range or mark the sample unknown. Do not substitute incident-ticket creation time without labeling the change in meaning.

Review false positives and missed incidents alongside speed. Google's SLO-alerting guidance evaluates alert quality using precision, recall, detection time, and reset time. Precision concerns how many alerts warrant action; recall concerns how much relevant impact is detected. [Alert-quality tradeoffs](https://sre.google/workbook/alerting-on-slos/)

A faster noisy alert can increase interruption without improving customer protection. Pair interval trends with alert coverage and response usefulness.

## Report unfinished reviews beside completed-review lag

Define review lag consistently, such as elapsed calendar days from mitigation to reviewed analysis. Keep it separate from the time required to finish corrective actions.

Suppose three fictional reviews finished after 5, 8, and 12 days. Their median is 8 days, but a fourth review is still open at day 20. Reporting only the median hides the oldest case. Show three of four reviewed, the completed-review distribution, and the open review's age.

Do not enter the open review as a completed 20-day duration. Its final lag is not yet known. Also record meaningful exceptions such as waiting for evidence, without using an exception label to make the work disappear.

## Review the measures with the incident narratives

Use the dashboard to select questions, then read the relevant postmortems and action evidence. Ask what changed in the system, whether the measurements cover comparable work, and which decision follows from the result.

PagerDuty's Howie Guide emphasizes learning and insight in addition to error reduction. A program can lose that value if it optimizes only for faster document closure. [Learning from incident investigation](https://docs.pagerduty.com/ops-guides/howie-guide)

Keep the definitions versioned and include the reporting cutoff, sample size, and missing-data count. The useful outcome is a better-informed reliability decision, supported by numbers that remain understandable when someone examines the records underneath them.
