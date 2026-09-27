# How to Diagnose Invalid Query Parameters in Cloudability Cost APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, FinOps, Cost Management, Troubleshooting

Description: Isolate failing Cloudability cost-report parameters with a minimal query, measure discovery, correctly encoded filters, and one-change-at-a-time comparisons.

A large reporting URL can fail because of one misspelled measure or one parameter copied from a different API family. Repeatedly changing dates, credentials, filters, and metrics together makes the failure harder to explain.

Reduce the request to a known-small query. Then rebuild the desired report one feature at a time, preserving the first request that changes the result from success to failure.

## Start with the cost-report contract

The cost-report endpoint requires dates, dimensions, and metrics. Its documented parameter names include `start_date`, `end_date`, `dimensions`, `metrics`, `filters`, `sort`, and `view_id`.

Other V3 endpoint examples use conventions such as singular `filter` and prefixed sort directions. Do not transfer those conventions to cost reporting. Likewise, a browser network request can use internal parameters that the public endpoint does not document.

Here is a small Python request using `requests` and a Cloudability API key for a commercial environment. Select the documented API host for your region and an authorized view ID. GovCloud requires Access Administration `apptio-opentoken` authentication instead of a Cloudability API key.

```python
import os
import requests

session = requests.Session()
session.auth = (os.environ["CLOUDABILITY_API_KEY"], "")
base = "https://api.cloudability.com/v3"
params = [
    ("start_date", "2026-08-01"),
    ("end_date", "2026-08-02"),
    ("dimensions", "vendor"),
    ("metrics", "total_amortized_cost"),
    ("view_id", os.environ["CLOUDABILITY_VIEW_ID"]),
]
response = session.get(
    f"{base}/reporting/cost/run", params=params, timeout=(10, 90)
)
print("HTTP status:", response.status_code)
response.raise_for_status()
```

Use a short completed period that has data in your tenant. An empty successful result is a different outcome from a malformed request.

## Discover names instead of guessing

Query `/reporting/cost/measures` to inspect the current dimension and metric names. Labels intended for a human reader can differ from the identifiers used in a URL. A mapped tag called Owner may have a tenant-specific reporting name.

Also retrieve `/reporting/cost/filters` when checking operators. Use one simple filter before adding a compound set. Confirm the measure exists for the requested reporting mode, especially when cost sharing is enabled.

The measures endpoint documents `apply_allocations`, while the report execution endpoint documents `applyAllocations`. These are the spellings documented in their respective references; copying one across endpoints can undermine the diagnosis.

## Encode filters once and preserve repetition

For cost reports, pass multiple filters as repeated `filters` parameters. A Python dictionary cannot contain two distinct entries with the same key, so a list of pairs is useful:

```python
params.extend([
    ("filters", "transaction_type==usage"),
    ("filters", "region=@us-east-"),
    ("sort", "total_amortized_costDESC"),
])
response = session.get(
    f"{base}/reporting/cost/run", params=params, timeout=(10, 90)
)
response.raise_for_status()
```

Run this after the first example. The HTTP library performs URL encoding. Do not pre-encode the comparator and then ask the library to encode it again. During diagnosis, inspect the prepared query with sensitive account and tag values redacted.

## Find the first failing addition

Add dimensions individually, then metrics, then filters, then sort and allocation options. Keep a simple request matrix containing the change, HTTP status, elapsed time, and sanitized error text. If a report has many independent filters, a binary search over filter subsets can narrow the cause faster after the baseline succeeds.

IBM documents limits on the number of dimensions and metrics for cost reports. Count the requested measures before blaming a server error on data volume. A valid query with many distinct resource values can still be expensive, which is a reason to reduce scope or use enqueue, not to invent alternate parameter names.

Stop retries on a reproducible validation failure. Preserve the successful baseline and smallest failing variation for support, including any request identifier supplied in the response.

## Conclusion

A minimal request turns an opaque API failure into a specific parameter problem. Use endpoint-specific names, discover tenant measures, encode once, and make every added feature prove itself before expanding the report.

## Official Documentation

- [IBM cost-report parameters and discovery endpoints](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)
- [IBM general V3 conventions](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-getting-started-cloudability-v3)
- [Requests query parameter encoding](https://requests.readthedocs.io/en/latest/user/quickstart/#passing-parameters-in-urls)
