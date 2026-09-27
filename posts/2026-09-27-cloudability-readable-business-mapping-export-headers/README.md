# How to Export Cloudability Mapping Headers with useDimensionNames

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, API, Cost Reporting, Automation

Description: Use Cloudability useDimensionNames exports for readable mapping headers while preserving stable query identifiers and a controlled downstream schema migration.

A CSV column named `category12` is difficult for a finance analyst to interpret without a lookup table. Cloudability supports readable Business Mapping names in exported data, and API clients can opt in using `useDimensionNames=true`.

Treat the change as an output-schema decision. A friendly header helps people, but a renamed Business Dimension can also break a downstream script that treats that header as a permanent identifier.

## Understand what changes

IBM's February 2026 release introduced friendly names for Business Metrics, Business Dimensions, Account Groups, and Tags & Labels in UI CSV exports. Existing API exports keep their previous default behavior unless the client opts in. [Readable export-name announcement](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-whats-new-in)

The flag does not mean display names replace identifiers in your query. Continue selecting documented measure IDs in `dimensions` and `metrics`. Discover those IDs from `/reporting/cost/measures` or a verified saved report definition instead of guessing that every tenant assigns Team the same category number.

For a controlled trial, choose one Business Dimension with a small known set of values and a completed period. Preserve the same View, cost basis, allocation setting, and filters between exports.

## Use the documented generation option

IBM shows `useDimensionNames` on the asynchronous cost-report generation request. Enqueue the report, poll its state, and retrieve the completed results. [Cost reporting API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)

The following example uses the `requests` package and deliberately targets a small report. Set the API base for your region, including `/v3`; set the mapping ID and View to values verified in your environment.

```python
import os
import time
from pathlib import Path
import requests

base = os.environ["CLOUDABILITY_API_BASE"].rstrip("/")
session = requests.Session()
session.auth = (os.environ["CLOUDABILITY_API_KEY"], "")

params = {
    "start_date": "2026-08-01",
    "end_date": "2026-08-31",
    "dimensions": os.environ["CLOUDABILITY_MAPPING_DIMENSION"],
    "metrics": "total_amortized_cost",
    "view_id": os.environ["CLOUDABILITY_VIEW_ID"],
    "useDimensionNames": "true",
}

response = session.get(
    f"{base}/reporting/cost/enqueue", params=params, timeout=(10, 60)
)
response.raise_for_status()
job_id = int(response.json()["id"])

deadline = time.monotonic() + 600
while True:
    state_response = session.get(
        f"{base}/reporting/reports/{job_id}/state", timeout=(10, 60)
    )
    state_response.raise_for_status()
    state = state_response.json()["status"]
    if state == "finished":
        break
    if state == "errored":
        raise RuntimeError(f"Report {job_id} failed")
    if state not in {"enqueued", "running"}:
        raise RuntimeError(f"Unexpected report state: {state}")
    if time.monotonic() >= deadline:
        raise TimeoutError(f"Report {job_id} still pending; resume polling later")
    time.sleep(10)

result = session.get(
    f"{base}/reporting/reports/{job_id}/results",
    headers={"Accept": "text/csv"},
    timeout=(10, 120),
)
result.raise_for_status()
if "csv" not in result.headers.get("Content-Type", "").lower():
    raise RuntimeError("Expected CSV; inspect the response before publishing it")
Path("costs-readable.csv").write_bytes(result.content)
```

The timeout stops this client from polling forever; it does not cancel a server-side report. Preserve the job ID if you need to resume. Store the exported billing data in an appropriate working directory.

## Inspect headers with a CSV parser

Avoid splitting the first line on commas because a valid display name can contain punctuation. A small inspection script is enough:

```python
import csv
from pathlib import Path

with Path("costs-readable.csv").open(newline="", encoding="utf-8-sig") as stream:
    headers = next(csv.reader(stream))

if len(headers) != len(set(headers)):
    raise ValueError("Duplicate headers require an explicit downstream mapping")
print(headers)
```

This check is an integration safeguard, not a claim that Cloudability necessarily emits duplicate names. It prevents a dictionary-based consumer from silently overwriting one column if a collision occurs.

The example is not a general large-report exporter. Confirm row completeness and follow the endpoint's pagination contract before expanding to resource-level or high-cardinality data. Friendly column names do not remove pagination limits.

## Compare before switching production consumers

Generate the same bounded report with the flag false and true. Compare row counts, grouping values, and numeric amounts after mapping the headers. The intended difference is presentation, so unexplained cost changes deserve investigation into scope, freshness, or query settings.

Create an explicit schema record containing internal measure ID, exported label, and expected type. Test a planned Business Dimension rename against your downstream jobs. A script that keys on `Team` should fail clearly if the approved output becomes `Accountable Team`, rather than quietly producing an empty column.

For machine-to-machine pipelines, stable identifiers may remain the better contract. Apply readable labels in the final presentation layer when that gives you both maintainability and clarity.

## Conclusion

Opt into readable headers on a controlled report first, then validate the resulting CSV and downstream schema. Keep query IDs and display labels separate so clearer exports do not turn routine organizational renames into hidden data failures.
