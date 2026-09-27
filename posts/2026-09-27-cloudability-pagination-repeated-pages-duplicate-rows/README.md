# How to Stop Repeated Pages and Duplicate Rows in Cloudability API Exports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, FinOps, Cost Management, Troubleshooting

Description: Stop looping Cloudability exports by replacing pagination tokens, keeping query parameters fixed, and failing before duplicate or partial results are published.

A Cloudability export that keeps growing while cycling through the same rows is often a pagination state problem. Increasing the row limit hides the symptom temporarily. It does not fix a client that sends an old token, appends multiple tokens, or restarts the first page after a retry.

The cost-report endpoint documents a `pagination.next` value and a `token` query parameter. Use that endpoint-specific contract; generic V3 offset examples and internal browser URLs are not interchangeable with it.

## Freeze the report definition

Choose fixed dates while diagnosing the export. Hold the view, dimensions, metric, filters, sort, and allocation setting constant for all pages. A token belongs to that report traversal, not to an arbitrary later query.

Keep query parameters in a structured object. String concatenation such as `url += '&token=' + next_token` can produce multiple token parameters. A server or proxy might select the first one, returning the same page indefinitely.

Do not interpret `limit=0` as unlimited output. IBM documents a larger automatic page size for that setting. The server can still return a next token.

## Make the loop fail visibly

This Python example uses `requests` and the cost-report response shape shown in the endpoint documentation. It stages rows in memory for clarity; a large export should use per-page durable staging with the same checks.

```python
import hashlib
import json
import os
from pathlib import Path
import requests

session = requests.Session()
session.auth = (os.environ["CLOUDABILITY_API_KEY"], "")
endpoint = "https://api.cloudability.com/v3/reporting/cost/run"
query = {
    "start_date": "2026-08-01", "end_date": "2026-08-31",
    "dimensions": "date,vendor,region,resource_identifier",
    "metrics": "total_amortized_cost",
    "sort": "dateASC,vendorASC,regionASC,resource_identifierASC",
    "view_id": os.environ["CLOUDABILITY_VIEW_ID"],
}
token = None
seen_tokens, seen_pages = set(), set()
rows = []
for page_number in range(1, 10001):
    params = {**query, **({"token": token} if token else {})}
    response = session.get(endpoint, params=params, timeout=(10, 120))
    response.raise_for_status()
    payload = response.json()
    page = payload.get("results")
    if not isinstance(page, list):
        raise ValueError("Expected top-level results array; inspect response")
    digest = hashlib.sha256(json.dumps(
        page, sort_keys=True, separators=(",", ":")
    ).encode()).hexdigest()
    if page and digest in seen_pages:
        raise RuntimeError("Repeated nonempty page; export not published")
    seen_pages.add(digest)
    rows.extend(page)
    next_token = (payload.get("pagination") or {}).get("next")
    if not next_token:
        break
    if not isinstance(next_token, str) or next_token in seen_tokens:
        raise RuntimeError("Invalid or repeated next token")
    seen_tokens.add(next_token)
    token = next_token
else:
    raise RuntimeError("Page budget exhausted")
Path("cost-rows.json.tmp").write_text(json.dumps(rows), encoding="utf-8")
Path("cost-rows.json.tmp").replace("cost-rows.json")
```

The repeated-page check deliberately stops on suspicious output instead of removing rows. Review a flagged case against the complete grouping key before deciding whether rows are duplicates.

## Retry the current request without replaying a commit

A production worker should record the token used, returned token, page checksum, and staged row count. Commit a page and its checkpoint together. If the response arrived but the process crashed before checkpointing, repeating that request must replace the same staging page rather than append it again.

For HTTP 429 or transient failures, use bounded backoff and preserve the current token. Do not restart the first page and append it to an existing dataset. If the traversal cannot be resumed, discard that incomplete run and start a new snapshot.

The example fails immediately on HTTP errors; this makes failures obvious during diagnosis rather than claiming to provide a complete retry framework.

## Reconcile the output

Verify that all requested dimensions participate in the uniqueness key. Two rows with the same resource ID may differ by day, account, region, or cost category. Removing duplicates based only on resource ID can erase valid spend.

Compare a complete export with a separate low-cardinality report using the same metric and scope. Check totals with decimal arithmetic. Do not sum aggregate totals repeated in each page's metadata.

## Conclusion

Treat pagination as a state machine. Replace the token, keep the query fixed, detect cycles, and publish only after reaching a terminal page and reconciling the result.

## Official Documentation

- [IBM cost-report pagination](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)
- [Python requests through structured query parameters](https://requests.readthedocs.io/en/latest/user/quickstart/#passing-parameters-in-urls)
