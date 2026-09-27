# How to Resolve Cloudability Business Metric Creation Errors Caused by the Wrong API Endpoint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, FinOps, Cost Management, Troubleshooting

Description: Fix Cloudability Business Metric creation failures by distinguishing metric and dimension routes, validating expressions, and checking the returned mapping index.

A Business Metric is not created through the same route and schema as a Business Dimension. Sending a plausible JSON object to a nearby endpoint can return a 404, a validation error, or an object of the wrong kind.

Start by deciding whether the calculation belongs in an ingestion-time Business Metric or a query-time Calculated Metric. That choice determines the API family and the meaning of the result.

## Identify the intended metric type

Business Metrics evaluate conditional rules against billing line items. Calculated Metrics apply arithmetic to aggregated report results. A surcharge that varies by vendor may need line-item conditions; a ratio of aggregated totals belongs in a query-time calculation.

IBM's Business Metrics guide documents these routes:

| Action | Documented path |
| --- | --- |
| List Business Metrics | `/v3/business-mappings/metrics/` |
| Create a Business Metric | `/v3/internal/business-mappings/metrics/` |
| Update an existing metric | `/v3/internal/business-mappings/{index}/metrics/` |

The `internal` segment is present in IBM's published creation and update examples. Treat it as an endpoint-specific documented exception, not permission to discover or depend on arbitrary internal browser APIs. Confirm the current contract before deployment because this interface can evolve.

## Validate the body independently

Save an original example as `metric.json`:

```json
{
  "name": "Research Account Cost",
  "numberFormat": "number",
  "defaultValueExpression": "0",
  "statements": [
    {
      "matchExpression": "DIMENSION['vendor_account_identifier'] == '111122223333'",
      "valueExpression": "METRIC['unblended_cost']"
    }
  ]
}
```

Replace the account value with a real account in a nonproduction test scope. The name is deliberately specific so that an operator does not mistake the metric for organization-wide spend. Confirm `vendor_account_identifier` and the selected metric in your tenant's reporting metadata.

```bash
python3 -m json.tool metric.json > /dev/null
```

JSON parsing only checks syntax. It does not validate Cloudability's expression language, selected measures, feature access, or metric capacity. Review one matching item and one nonmatching item before applying the definition.

## Submit once and read the result

The following Python example requires `requests` and a Cloudability product API key with the required permissions. Select the correct regional host.

```python
import json
import os
from pathlib import Path
import requests

body = json.loads(Path("metric.json").read_text())
response = requests.post(
    "https://api.cloudability.com/v3/internal/business-mappings/metrics/",
    auth=(os.environ["CLOUDABILITY_API_KEY"], ""),
    json=body,
    timeout=(10, 90),
)
response.raise_for_status()
created = response.json()["result"]
if created.get("kind") != "BUSINESS_METRIC":
    raise ValueError("Unexpected object kind; inspect response")
print({"name": created["name"], "index": created["index"]})
```

Do not automatically repeat a POST after a transport timeout. First list the metrics and look for the new definition; the original request may have succeeded. Persist the returned index rather than assuming a particular slot was allocated.

## Diagnose errors by layer

A 404 should prompt comparison of the exact method and path with the creation reference. A 401 points to authentication. A permission failure needs a role and feature-access review. A body validation failure needs the response's actual error details: unknown measure, malformed expression, invalid format, duplicate definition, or an applicable metric limit.

Keep request and response examples sanitized. The response may expose mapping logic, account identifiers, and organizational structure even when it contains no secret.

After creation, read the metric back and inspect its rules. The guide uses `defaultValueExpression` in requests while response examples use `defaultValue`; do not blindly submit an entire response object as an update body.

## Verify when the result becomes useful

Business Metric changes affect ingestion processing. Historical periods may need reprocessing before a comparison reflects the new rules. A successfully created definition and an unchanged old report are therefore not contradictory.

For a test account with 100 units of selected cost and a second account with 40, the example should attribute 100 to the research metric, not 140. Test the default path too, and review rule ordering when adding more statements.

## Conclusion

Choose the right metric family, use its documented method and route, and validate both the definition and resulting values. A successful HTTP response is the start of verification, not proof that the financial calculation is correct.

## Official Documentation

- [IBM Business Metric API examples](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=mapping-business-metrics-in-cloudability)
- [IBM Business Mapping structure](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=point-structure-business-mapping)
- [IBM Calculated Metrics](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=spend-calculated-metrics)
