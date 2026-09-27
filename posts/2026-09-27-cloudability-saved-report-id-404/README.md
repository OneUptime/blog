# How to Diagnose 404 Errors When Looking Up Saved Cloudability Reports by ID

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, FinOps, Cost Management, Troubleshooting

Description: Diagnose Cloudability report lookup 404s by distinguishing saved definitions from queued report jobs and verifying endpoint, region, and caller visibility.

A numeric value copied from a Cloudability report URL is not enough to construct an API request. The product contains saved report definitions, asynchronous executions, dashboard objects, and other resources with different identifiers.

Before changing permissions or recreating the report, identify the resource you actually want. For a saved definition, begin with the documented saved-report collection. For generated rows, use a supported execution workflow.

## Separate the identifier namespaces

The cost-report documentation exposes `/reporting/reports/cost` for saved definitions and `/reporting/cost/run` for execution. Its enqueue workflow returns a job ID used with `/reporting/reports/:id/state` and `/reporting/reports/:id/results`.

The presence of `reports` in both path families does not make their identifiers interchangeable. The cited documentation does not establish a general saved-report lookup route simply by appending any saved ID to `/reporting/reports/`.

Create a diagnostic record with the ID's origin: saved collection response, enqueue response, browser URL, or copied configuration. Also record the regional API host and authenticated user. This often exposes the mistake before another request is sent.

## Find the saved object in its collection

The following example requires Python and `requests`. It retrieves the cost-report collection and selects an ID locally. Use the utilization collection for a utilization definition.

```python
import os
import requests

response = requests.get(
    "https://api.cloudability.com/v3/reporting/reports/cost",
    auth=(os.environ["CLOUDABILITY_API_KEY"], ""),
    timeout=(10, 90),
)
response.raise_for_status()
payload = response.json()
reports = payload if isinstance(payload, list) else payload.get("result")
if not isinstance(reports, list):
    raise ValueError("Unexpected saved-report collection response")
wanted = os.environ["CLOUDABILITY_SAVED_REPORT_ID"]
matches = [r for r in reports if str(r.get("id")) == wanted]
if len(matches) != 1:
    raise LookupError(f"Expected one visible definition, found {len(matches)}")
report = matches[0]
print({"id": report["id"], "title": report.get("title")})
```

Use the documented host for your region. The example uses the US endpoint and product-key Basic authentication; do not copy a Frontdoor public key into that credential slot.

A successful collection response proves authentication worked for that request. It does not prove the user can see every saved report in the organization.

## Investigate a missing definition

Compare the API identity with the browser identity used to find the report. Inspect ownership and sharing, confirm the report category, and verify that the browser object is actually a report rather than a dashboard widget.

If another authorized user can see it, review the intended sharing policy. Do not switch a production integration to an administrator key merely to suppress a 404. Have the report owner grant the appropriate access or use a definition already within the integration's approved scope.

If nobody can find the definition, check change history and whether it was recreated under a new ID. Titles are useful clues but are not stable keys.

## Run the query through the reporting contract

Once you have the definition, extract its dimensions, metrics, dates, filters, and view context. Translate these into the parameters documented for `/reporting/cost/run` or `/reporting/cost/enqueue`.

Do not send the entire saved object as arbitrary query parameters. Saved definitions include metadata and can use fields such as `sort_by` and `order`, while the execution endpoint documents a `sort` expression. Resolve measure objects to their API names and encode repeated filters using the endpoint's required format.

For an asynchronous execution, persist the returned job ID and use that same ID for state and results. If a job lookup fails, retain the original submission response and inspect host, identity, and path rather than substituting the saved ID.

## Escalate a precise failure

Capture the HTTP method, sanitized path, ID origin, timestamp, status, response body, and any request correlation identifier. Keep credentials out of logs. A concise reproduction using the documented collection or execution route gives support a much clearer starting point than a screenshot of a browser ID.

## Conclusion

A 404 is evidence that a particular lookup failed. Resolve the resource type, supported route, and caller scope before deciding the underlying report is missing.

## Official Documentation

- [IBM saved cost reports and asynchronous job endpoints](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)
- [IBM saved utilization reports](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-utilization-reports-end-point)
- [IBM regional hosts and API access](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-getting-started-cloudability-v3)
