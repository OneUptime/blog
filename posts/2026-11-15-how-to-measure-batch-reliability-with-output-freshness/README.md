# How to Measure Batch Reliability with Output Freshness

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Prometheus, Python

Description: Publish a verified data watermark and alert on stale user-visible output instead of assuming a successful or fast batch job produced fresh data.

A batch job can finish quickly and still publish yesterday's data. It can also run slowly while the currently published output remains fresh enough for users. Measure the age of verified output at the point users consume it, then use job duration as diagnostic context. This aligns the reliability signal with the product's actual freshness promise.

The example assumes an hourly pipeline and a custom Prometheus gauge containing a Unix timestamp. Use Python 3 for the fixture. The watermark should come from committed output metadata, not merely the scheduler's last successful exit code. Define whether freshness refers to source event time, extraction time, or publication time.

## Publish a trustworthy watermark

Record the latest source timestamp covered by a successfully validated output. Advance it only after completeness checks and an atomic publication step succeed. A worker that starts processing new data must not update the public watermark before the new result is readable.

```json
{"dataset":"customer-summary","run_id":"run-208","source_watermark":"2026-11-15T09:00:00Z","published_at":"2026-11-15T09:07:00Z","validation":"passed","output_version":"v208"}
```

Source watermark and publication time answer different questions. A newly published result based on old source data is recently published but stale. Preserve both timestamps so responders can distinguish an upstream delay from a publication failure. Use an explicit timezone and check clock synchronization before trusting age calculations.

## Expose age as a derived value

Export a timestamp gauge and calculate age in PromQL. This keeps age increasing even if the pipeline stops updating its exporter. The metric name below is custom and must be implemented from the committed metadata.

```promql
time() - pipeline_output_watermark_timestamp_seconds{dataset="customer-summary"}
```

If the gauge disappears, the subtraction returns no series rather than a large age. Add a separate absence alert and exporter-health check. A stuck exporter serving an old watermark is correctly detected as growing age, while a missing exporter needs an unknown-state signal.

```mermaid
flowchart LR
  A[Source data] --> B[Batch processing]
  B --> C[Completeness validation]
  C --> D[Atomic output publication]
  D --> E[Committed watermark]
  E --> F[Freshness age and SLO]
```

## Test the deadline calculation

For an hourly product with a ninety-minute freshness limit, the fixture is healthy at sixty minutes and late at two hours. These limits are illustrative; choose them from user needs and expected source availability rather than job duration percentiles alone.

```python
from datetime import datetime,timezone
watermark = datetime(2026,11,15,9,0,tzinfo=timezone.utc)
limit_seconds = 90*60
for hour in [10,11]:
    now = datetime(2026,11,15,hour,0,tzinfo=timezone.utc)
    age = (now-watermark).total_seconds()
    print(hour,{"age_seconds":age,"fresh":age <= limit_seconds})
assert (datetime(2026,11,15,11,0,tzinfo=timezone.utc)-watermark).total_seconds() == 7200
```

## Turn freshness into a response policy

Page early enough for the responder to repair the pipeline before users reach the deadline. That may require a warning based on remaining time, followed by a user-impact alert when the freshness promise is breached. Include the dataset, last committed output version, source watermark, and recent run IDs in the runbook.

Measure a time-based SLO as the fraction of eligible assessments where output age is within the limit, or define a per-publication deadline SLO if that better matches the product. Do not silently switch between them: a single late publication can create many bad minutes in the first policy and one failed event in the second.

Investigate stale output by comparing source arrival, processing progress, validation results, and publication metadata. A successful scheduler status is only one piece of evidence. Test a worker crash before commit, a validation failure, a delayed upstream source, and a missing exporter. The acceptance criterion is that users never see a watermark claiming freshness for data that was not fully published and verified.

## References

The [community question](https://www.reddit.com/r/devops/comments/1r3i7kl/how_do_you_set_slos_for_longrunning_batch_jobs/) motivated this walkthrough. Implementation references:

- [Official reference 1](https://sre.google/workbook/data-processing/)
- [Official reference 2](https://prometheus.io/docs/practices/instrumentation/)
