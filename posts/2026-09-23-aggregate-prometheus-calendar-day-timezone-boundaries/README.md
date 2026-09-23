# How to Aggregate Metrics by Calendar Day When PromQL Has No Dynamic Offset

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Monitoring

Description: Calculate explicit calendar-day boundaries for Prometheus totals, including daylight-saving transitions and incomplete days.

---

A PromQL window of `[1d]` means 24 hours. It does not mean the current calendar date in a selected timezone. At 15:00, it measures a rolling interval ending at 15:00; on a daylight-saving transition, a local calendar day may not even contain 24 hours.

The title's “no dynamic offset” needs a version qualification. Current Prometheus supports arithmetic duration expressions and functions such as `range()` and `step()`. Those features do not provide a general timezone-aware calendar operation. The portable solution is to calculate explicit boundaries outside PromQL and evaluate the counter increase at the day's end.

## Define the reporting interval

For a completed UTC date, use midnight at the start of the next date as the evaluation timestamp and a 24-hour range:

```bash
curl -fsSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=sum by (service) (increase(http_requests_total[24h]))' \
  --data-urlencode 'time=2026-09-23T00:00:00Z'
```

This estimates the requests during September 22 in UTC. It is an instant query returning one value per service. Running the same expression at many arbitrary timestamps produces rolling totals, not calendar buckets.

The [PromQL duration reference](https://prometheus.io/docs/prometheus/latest/querying/basics/#float-literals-and-time-durations) explicitly defines a day as 24 hours without daylight-saving adjustments. Its [duration expression section](https://prometheus.io/docs/prometheus/latest/querying/basics/#duration-expressions) documents the newer arithmetic support; do not assume arbitrary functions such as timezone conversion can be inserted into an offset.

## Generate local-midnight boundaries

Use a timezone database for civil-time reports. Python's [`zoneinfo`](https://docs.python.org/3/library/zoneinfo.html) handles IANA timezone rules, including daylight-saving changes:

```python
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from urllib.parse import urlencode

report_date = date(2026, 3, 29)
zone = ZoneInfo("Europe/London")
start_local = datetime.combine(report_date, time.min, zone)
end_local = datetime.combine(report_date + timedelta(days=1), time.min, zone)

start_utc = start_local.astimezone(timezone.utc)
end_utc = end_local.astimezone(timezone.utc)
seconds = int((end_utc - start_utc).total_seconds())
assert seconds > 0

query = f"sum by (service) (increase(http_requests_total[{seconds}s]))"
params = {"query": query, "time": end_utc.isoformat()}
print(start_utc.isoformat(), end_utc.isoformat(), seconds)
print("http://localhost:9090/api/v1/query?" + urlencode(params))
```

For this date in London, the interval contains 82,800 seconds, or 23 hours. Convert to UTC before subtracting so the duration measures elapsed time. On the autumn transition, the corresponding local day contains 90,000 seconds.

The example constructs boundaries and prints the request; it does not fetch production data. For historical timezones with unusual midnight transitions, define a policy for ambiguous or nonexistent civil times and test the relevant dates. Standard DST examples do not exhaust all timezone history.

## Query each day with its own duration

For a UTC-only daily chart, a range query aligned to midnight with a one-day step can return consecutive daily increases. Its timestamps represent the end of each bucket; label the report accordingly.

For local days across DST, generate one instant query per date using that date's boundary pair. A fixed 86,400-second step drifts relative to local midnight when the offset changes. Store the calendar date, timezone, UTC start, UTC end, and elapsed seconds with each report row.

Avoid adding a `date` label to a continuously scraped metric simply to create daily groups. It creates changing series identities and moves reporting concerns into instrumentation. Calendar grouping is usually clearer in the reporting layer.

## Keep counter semantics intact

Apply `increase()` to each original counter before aggregation:

```promql
sum by (service) (
  increase(http_requests_total[82800s])
)
```

This lets Prometheus detect resets independently per producer. Summing raw counters first can conceal resets behind increases from other instances.

The [increase documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#increase) explains that results are extrapolated to the selected interval. A daily result can therefore be fractional even when requests are discrete. Sparse scrapes, short-lived processes, and unseen resets prevent these estimates from being an exact event ledger.

Do not force integer rounding before comparing alternative queries. Rounding can hide small discrepancies caused by boundary coverage. Keep a separate authoritative transactional source when exact accounting is required.

## Distinguish complete days from today

A completed-day report ends at the next midnight. A “today so far” report ends now and uses elapsed time since today's midnight. Mark that row as partial so it is not compared directly with a completed date's total.

Also allow for ingestion delay. Querying at midnight does not ensure every producer's final sample has arrived. Choose a reporting delay, requery recent dates when late data is accepted, and record the report generation time.

Verify the implementation on a normal day, both daylight-saving transitions, and a period containing a process restart. Compare the calculated UTC intervals before inspecting totals. Most calendar aggregation errors come from boundaries that look correct in local time while representing the wrong elapsed interval.
