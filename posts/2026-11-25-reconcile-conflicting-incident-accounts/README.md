# Reconcile Conflicting Incident Accounts with Evidence and Confidence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem, Incident Response, Root Cause Analysis

Description: Resolve conflicting incident accounts by comparing scope, timestamps, source lineage, and evidence strength while keeping unresolved disagreements explicit.

One responder remembers recovery at 12:18. Another says customers still had problems until 12:25. A dashboard appears to support the first account, while support tickets support the second. Choosing the most senior person's version would make the document simpler, but it would not resolve the discrepancy.

Start by asking whether the accounts describe the same thing. They may use different customer cohorts, recovery definitions, clocks, or source records. When the disagreement is real, preserve it until evidence supports a conclusion.

PagerDuty's Howie Guide recommends sharing an interim analysis with participants so they can correct it, and recognizes that different perspectives can require different timelines. That provides a useful basis for reconciliation without forcing every observation into one prematurely settled story. [Calibrating incident analysis](https://docs.pagerduty.com/ops-guides/howie-guide/calibrate)

## Turn each account into a specific claim

Record what the person or system actually asserts. Avoid paraphrasing “I saw the dashboard recover” into “all customers recovered.”

For a fictional incident, create a claim ledger:

| Claim | Source | Scope and definition | Current question |
|---|---|---|---|
| C1: Recovered at 12:18 | Regional request dashboard | New requests; five-minute aggregate error rate | Does this include queued work? |
| C2: Impact continued until 12:25 | Customer support account | Previously queued exports | Were those jobs created during the incident? |
| C3: Restart caused recovery | Responder recollection | Restart followed by apparent improvement | What other changes occurred? |

C1 and C2 may be compatible once their scopes are clear. C3 is a causal explanation and needs different evidence from a statement about event order.

Keep the original account, the clarified claim, and the clarification date. This shows how the investigation changed the interpretation without implying that the participant originally said something more precise.

## Classify the discrepancy before trying to resolve it

Use the type of disagreement to choose the next investigation step.

| Discrepancy | Useful next step |
|---|---|
| Different populations or definitions | Compare query filters, customer cohorts, and recovery criteria |
| Different timestamp meanings | Identify event, ingestion, publication, and observation times |
| Different clock assumptions | Establish timezone and any supported clock-offset information |
| Different interpretations of the same record | State the competing mechanisms and evidence that would distinguish them |
| Truly incompatible observations | Check source integrity, identity mapping, coverage, and missing records |

This avoids arguing about causes when the apparent contradiction is only a difference between new-request recovery and backlog completion.

When reviewing a recollection, ask what information was available to that person and what they understood at the time. PagerDuty's interview guidance emphasizes that telemetry alone does not capture the reasoning and coordination involved in an incident. [Participant perspectives](https://docs.pagerduty.com/ops-guides/howie-guide/interview)

## Normalize timestamps without inventing precision

Keep the original timestamp and its interpretation. Convert known offsets into a common timezone, and record uncertainty rather than guessing missing details. RFC 3339 provides a standard timestamp format with explicit offsets; a formatted timestamp still does not prove that its source clock was accurate. [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339)

Check field meanings too. CloudWatch Logs, for example, exposes `timestamp` for the event and `ingestionTime` for ingestion. Sorting by the latter can produce a different sequence when delivery is delayed. [CloudWatch log-event fields](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_OutputLogEvent.html)

Do not average conflicting times to obtain a neat answer. An average of “new traffic recovered” and “backlog cleared” does not describe either event.

## Represent supported clock uncertainty as a range

The following local calculation illustrates how uncertainty can prevent a confident ordering. The offsets and bounds are fictional assumptions supplied to the example; the program does not measure clock accuracy.

Save it as `compare_event_windows.py` and run `python3 compare_event_windows.py`. It requires Python 3.9 or later and was checked with Python 3.9.6. It uses timezone-aware datetimes and timedeltas from Python's standard library. [Python datetime documentation](https://docs.python.org/3.13/library/datetime.html)

```python
from datetime import datetime, timedelta, timezone

def event_window(timestamp, clock_ahead_seconds, uncertainty_seconds):
    observed = datetime.fromisoformat(timestamp)
    if observed.utcoffset() is None or uncertainty_seconds < 0:
        raise ValueError("Need an explicit offset and nonnegative uncertainty")
    center = observed.astimezone(timezone.utc) - timedelta(
        seconds=clock_ahead_seconds
    )
    error = timedelta(seconds=uncertainty_seconds)
    return center - error, center + error

a = event_window("2026-11-25T12:00:20+00:00", 45, 5)
b = event_window("2026-11-25T11:59:38+00:00", 0, 3)
for name, window in (("A", a), ("B", b)):
    print(name, *(point.isoformat() for point in window))
print("Windows overlap:", max(a[0], b[0]) <= min(a[1], b[1]))
```

Expected windows are 11:59:30–11:59:40 UTC for A and 11:59:35–11:59:41 UTC for B, followed by `Windows overlap: True`. A positive `clock_ahead_seconds` means the source clock is ahead, so the calculation subtracts it.

Under those assumptions, the timestamp ranges do not establish which event happened first. They also do not establish that the events were simultaneous. If you lack a defensible bound, report the ordering as uncertain instead of choosing an offset that makes the preferred explanation work.

## Trace evidence back to its origin

Three agreeing artifacts may represent one observation. A dashboard screenshot, an incident chat message quoting it, and a status update copied from that message are not three independent measurements.

Record source lineage: where the value originated, how it was transformed, and which later statements depend on it. Preserve query settings, aggregation intervals, and filters alongside exported results where practical.

Correlation identifiers can help connect records across services. W3C Trace Context standardizes propagation of tracing context between services, including a trace identifier. That helps establish which operation records belong together, but it does not make their clocks accurate or guarantee that every event was retained. [W3C Trace Context](https://www.w3.org/TR/trace-context/)

Treat missing records carefully. A missing trace may reflect sampling or retention rather than proof that no request occurred. State the relevant coverage limit before using absence as evidence.

## Attach confidence to claims, with reasons

Use confidence labels as a review convention, not as invented statistical probabilities. Define what each label means for your investigation.

For example, “high confidence” might mean a directly relevant record with verified interpretation and no unresolved contradiction. “Moderate confidence” might mean supporting evidence with a material coverage gap. “Low confidence” might describe an uncorroborated account or an explanation that still has plausible alternatives.

Keep disputed or unknown as explicit states. Do not average one high-confidence timestamp and one low-confidence causal theory into a single confidence score for the whole incident.

A useful ledger entry says: “High confidence that new-request error rate was normal by 12:18 for the measured region; queued exports are outside this measurement.” The qualification makes the label assessable. It does not claim that the entire service recovered then.

## Resolve what you can and preserve what you cannot

In the fictional case, job records might establish that the remaining exports completed by 12:25. The final report can then retain both recovery milestones, with their definitions, and mark the apparent C1/C2 contradiction resolved.

The restart explanation may remain unsettled if traffic also declined and no evidence separates their contributions. Record that uncertainty, the next useful investigation, its owner, and a stopping condition if further evidence is unavailable.

Share the revised account with participants and ask targeted questions about what changed. Keep a dated note when a claim is corrected, narrowed, or withdrawn. Future readers should be able to see why the conclusion became stronger or why the investigation retained a limit.

Reconciliation is complete when the record accurately represents the supported facts and unresolved differences. Agreement is useful, but a transparent unresolved question is better evidence practice than a conclusion chosen only to end the discussion.
