# How to Retrieve Large Cloudability Reports with Asynchronous Enqueue

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, FinOps, Cost Management, Troubleshooting

Description: Retrieve large Cloudability reports through enqueue, state polling, and paginated results while preserving job IDs and publishing only complete exports.

Large cost exports can outlive an HTTP request timeout. Cloudability's asynchronous workflow separates report submission from result retrieval, allowing your worker to retain a job ID while the server builds the report.

This workflow has three distinct phases: enqueue a query, wait for its state to become `finished`, and retrieve all result pages. A successful submission is not a completed export.

## Submit a reproducible query

Start with the same parameters used by a working synchronous report. Keep dates fixed and make the view explicit so another operator can reconstruct its scope. The cost endpoint is `/reporting/cost/enqueue`; utilization reports have a separate `/reporting/util/enqueue` path.

The following Python example requires `requests`. It uses the US host and a Cloudability product API key. Replace the host for your commercial tenant's region and supply credentials through your normal secret injection mechanism. GovCloud requires Access Administration authentication with `apptio-opentoken` and `apptio-environmentid` headers instead of this product API key.

```python
import json
import os
import time
from pathlib import Path
import requests

base = "https://api.cloudability.com/v3"
session = requests.Session()
session.auth = (os.environ["CLOUDABILITY_API_KEY"], "")
params = {
    "start_date": "2026-08-01", "end_date": "2026-08-31",
    "dimensions": "date,vendor,region,resource_identifier",
    "metrics": "total_amortized_cost",
    "view_id": os.environ["CLOUDABILITY_VIEW_ID"],
}
response = session.get(
    f"{base}/reporting/cost/enqueue", params=params, timeout=(10, 120)
)
response.raise_for_status()
job_id = response.json()["id"]
Path("report-job.json").write_text(json.dumps({
    "id": job_id, "query": params, "base": base
}), encoding="utf-8")

deadline = time.monotonic() + 1800  # Soft 30-minute polling budget, checked between requests.
while time.monotonic() < deadline:
    response = session.get(
        f"{base}/reporting/reports/{job_id}/state", timeout=(10, 60)
    )
    response.raise_for_status()
    status = response.json()["status"]
    if status == "finished":
        break
    if status == "errored":
        raise RuntimeError(f"Report job {job_id} failed")
    if status not in {"enqueued", "running"}:
        raise RuntimeError(f"Unexpected report state: {status}")
    time.sleep(10)
else:
    raise TimeoutError(f"Polling budget expired for job {job_id}")

response = session.get(
    f"{base}/reporting/reports/{job_id}/results", timeout=(10, 120)
)
response.raise_for_status()
Path("first-result-page.json").write_text(response.text, encoding="utf-8")
```

The polling interval and deadline are local choices, not Cloudability service guarantees. The deadline is checked between requests; an in-flight request or sleep can overrun it, and Requests timeouts are not total wall-clock limits. The first result file is explicitly a page, not a complete financial dataset.

## Retain the identity of the job

Use the identifier returned by enqueue for the state and results URLs. A saved report's ID describes a saved definition and should not be substituted for this job ID.

If polling times out, retain the job record. An operator can resume checking its state rather than immediately submitting a duplicate expensive query. A transport timeout during enqueue is more ambiguous: the server may have accepted the request even though the client missed the response. Do not assume submission is idempotent.

Keep job files per run in production. A single fixed filename, used above for a manual example, is unsuitable for concurrent workers.

## Finish pagination before publication

The results endpoint returns the reporting object for the completed job. Inspect its pagination information and follow the documented next token using the same results resource. Keep the job ID unchanged throughout the traversal.

Enqueued utilization reports have their own documented page-size behavior, which differs from synchronous utilization requests. Avoid applying that number as a universal cost-report guarantee. The presence of a next token, rather than a guessed row count, determines whether another page is required.

Stage each page and checkpoint it. Stop on repeated tokens, repeated nonempty pages, malformed responses, or a local page limit. Reconcile the staged amount with an aggregate report before publishing the result. Retain the previous successful export if this run fails.

## Bound load and explain failures

Polling contributes to API traffic. Pace workers together when they share an organization and endpoint; avoid having every dashboard enqueue its own copy of an identical query. Implement bounded retries for transient errors and honor server retry guidance when supplied.

An `errored` report needs investigation, not an endless poll. Capture the sanitized query, state response, job ID, and timing for support. Authentication and query validation failures should stop the run promptly.

## Conclusion

Asynchronous reporting makes long queries manageable when the client preserves the job lifecycle. Persist the submission, poll to a known terminal state, retrieve every page, and publish only a reconciled snapshot.

## Official Documentation

- [IBM cost-report asynchronous workflow](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)
- [IBM utilization-report asynchronous workflow and pagination](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-utilization-reports-end-point)
- [IBM regional API hosts and authentication](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-getting-started-cloudability-v3)
