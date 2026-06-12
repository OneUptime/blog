# Validation Summary: How to Analyze Locust Test Results

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Locust (load testing framework, 2.x API)
- Python
- pandas
- matplotlib
- Chart.js (in custom HTML report)

## Sources Consulted
- Locust source code — `locust/stats.py` (CSV column definitions): https://github.com/locustio/locust/blob/master/locust/stats.py
- Locust source code — `locust/event.py` (event signatures): https://github.com/locustio/locust/blob/master/locust/event.py
- Locust source code — `locust/clients.py` (request event kwargs): https://github.com/locustio/locust/blob/master/locust/clients.py
- Locust official documentation: https://docs.locust.io/en/stable/
- Locust API reference: https://docs.locust.io/en/stable/api.html
- Locust running-without-web-ui docs (`--headless`, `--csv`, `--html`, `--run-time`): https://docs.locust.io/en/stable/running-without-web-ui.html

## Issues Found

1. **Wrong column name in `plot_results` for stats_history.csv** — The code referenced `history['Total 95%']`, but Locust's `_stats_history.csv` writes the percentile columns with bare percentage names (`50%`, `95%`, `99%`, etc.). The `Total ` prefix only applies to running totals (`Total Request Count`, `Total Average Response Time`, etc.), not percentiles. Calling `history['Total 95%']` would raise a `KeyError`. Fixed by changing the access to `history['95%']` (the existence check on the line above already uses the correct name).

2. **Incorrect iteration over `environment.stats.entries`** — In Locust, `entries` is `dict[tuple[str, str], StatsEntry]` where keys are `(name, method)` tuples. The original code did `for name, stats in environment.stats.entries.items():` which would bind `name` to the entire `(name, method)` tuple (not a string), producing broken output like `GET ('/api/data', 'GET')`. Fixed by unpacking the key explicitly: `for (name, method), stats in environment.stats.entries.items():` and removed the now-redundant `method = stats.method` line.

## Review Notes

- All Locust CLI flags used (`--headless`, `--csv=results`, `--html=report.html`, `--run-time=5m`) are valid and current.
- The CSV file naming pattern (`<prefix>_stats.csv`, `<prefix>_stats_history.csv`, `<prefix>_failures.csv`) is accurate.
- Stats CSV column references (`Request Count`, `Failure Count`, `Average Response Time`, `Median Response Time`, `90%`, `95%`, `99%`, `Requests/s`, `Type`, `Name`) are all correct.
- `_failures.csv` column reference `Error` is accurate (alongside `Method`, `Name`, `Occurrences`).
- Locust API references (`environment.stats.total`, `num_requests`, `num_failures`, `avg_response_time`, `min_response_time`, `max_response_time`, `total_rps`, `get_response_time_percentile()`) are correct for Locust 2.x.
- Event listeners (`events.test_start`, `events.test_stop`, `events.request`) and their signatures are correct. The post uses `**kwargs` which gracefully absorbs the additional kwargs (`response_length`, `response`, `context`, `exception`, `start_time`, `url`) that Locust passes to the `request` event.
- The user model definition (`HttpUser`, `@task(weight)`, `wait_time = between(1, 2)`, `self.client.get/post`) is correct.
- Minor stylistic notes (not fixed, since the post is otherwise correct):
  - The code uses `datetime.utcnow()`, which is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. It still works at runtime but emits a `DeprecationWarning` on newer Python versions.
  - In `stats_history.csv`, the bare percentile columns (e.g. `95%`) reflect the *recent interval* percentile, while `Total Average Response Time` reflects a cumulative running average — mixing them on the same chart is slightly inconsistent but not incorrect.
  - By default (without `--csv-full-history`), `stats_history.csv` only writes the Aggregated row per interval, so the plotting code works as expected on default output.
