# Validation Summary: How to Aggregate Metrics by Calendar Day When PromQL Has No Dynamic Offset

## Status
validated

## Post Type
Technical guide with PromQL, curl, and executable Python examples.

## Technologies Covered
- Prometheus and PromQL counter aggregation
- Prometheus HTTP instant and range query APIs
- Python 3: datetime, zoneinfo, and urllib.parse
- IANA timezones, UTC, and daylight-saving transitions
- curl

## Sources Consulted
- [Prometheus querying basics: durations, duration expressions, and range selectors](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus functions: increase and rate](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus aggregation operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)
- [Prometheus HTTP API: instant and range queries](https://prometheus.io/docs/prometheus/latest/querying/api/)
- [Prometheus data model and label identity](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus TSDB configuration and out-of-order ingestion](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tsdb)
- [Python zoneinfo documentation](https://docs.python.org/3/library/zoneinfo.html)
- [Python datetime documentation](https://docs.python.org/3/library/datetime.html)
- [Python urllib.parse.urlencode documentation](https://docs.python.org/3/library/urllib.parse.html#urllib.parse.urlencode)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [Author profile](https://github.com/nawazdhandala)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all implementation examples and technical explanations. No README changes were necessary.
- Confirmed that PromQL defines one day as 24 hours. Current documentation supports arithmetic duration expressions, including range() and step(), but these do not implement timezone-aware calendar boundaries. The post already qualifies its title appropriately; its executable examples use literal durations and do not depend on these newer features.
- Confirmed that the UTC example evaluates a 24-hour counter increase at September 23 midnight to estimate September 22 activity. Instant-query parameters, RFC3339 timestamps, URL encoding, and midnight-aligned range-query steps agree with the API documentation.
- Checked the curl flags against the official manual and passed the extracted command through bash -n. The command correctly uses GET with URL-encoded query parameters.
- Executed the Python example using Python 3.9.6 and the installed timezone database. The original March 29, 2026 London example produced UTC boundaries 2026-03-29T00:00:00+00:00 and 2026-03-29T23:00:00+00:00, with 82,800 elapsed seconds.
- Repeated the same code with October 25, 2026: UTC boundaries were 2026-10-24T23:00:00+00:00 and 2026-10-26T00:00:00+00:00, with 90,000 elapsed seconds. September 22, 2026 produced 86,400 seconds. Assertions also confirmed that each generated URL decoded to the intended query and evaluation timestamp.
- Converting both boundaries to UTC before subtraction is correct: Python ignores timezone adjustments when subtracting aware datetimes sharing the same tzinfo object. zoneinfo requires Python 3.9 or later and available system timezone data or the tzdata package. The existing warning about ambiguous or nonexistent civil midnights is appropriate.
- Confirmed that increase operates on counters, handles observed resets, and extrapolates, allowing fractional results. Applying it before sum preserves reset detection per original series. The limitations concerning sparse sampling, unseen resets, and exact accounting are sound.
- Range selectors exclude samples exactly at their left boundary and include samples at their right boundary. The post correctly presents daily increases as estimates, not exact event counts.
- Changing a date label creates a new time-series identity. Keeping calendar grouping in the reporting layer is reasonable guidance.
- Partial-day labeling and delayed reporting are appropriate. Requerying can reflect late samples only when the ingestion path accepts them; the post explicitly includes that condition. A partial-day query also needs a positive range and sufficient samples before increase can return a value.
- Linked documentation pages and relevant sections were checked, and the author profile resolves. No configuration snippets or deprecated APIs were found.
- Prometheus and promtool were not installed locally. PromQL syntax and reset semantics were verified against official documentation; no live Prometheus request, production-data validation, or process-restart integration test was performed.
