# Cloudability API Totals Do Not Match the UI: Debugging Default Views and `view_id=0`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, FinOps, Cost Management, Troubleshooting

Description: Diagnose Cloudability API and UI cost differences by making the API user's view explicit and matching metric, dates, allocations, and report scope.

A successful Cloudability API response can contain a smaller total than the dashboard because it is answering a narrower question. The API key belongs to a user, and that user's default view affects requests that omit an explicit reporting view.

The fastest diagnosis is a controlled comparison: hold the query constant, change only the view, and then inspect the remaining report settings.

## Understand the default

IBM documents that API requests respect the user's default view. For cost reporting, `view_id` chooses a view; an unrestricted user can set `view_id=0` to remove the view. Restricted users remain limited to the views they can access. Zero is not a permission bypass. [About the Cloudability API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-about-cloudability)

The reporting parameter is spelled `view_id`. Do not substitute `viewId` merely because another endpoint uses that spelling. Endpoint-specific request parameters matter.

Record these identities before changing the query:

| Context | What to record |
| --- | --- |
| Browser | Signed-in user and selected view |
| API | Key owner and that user's default view |
| Report | Explicit view ID, if supplied |
| Authorization | Whether the API user can access the intended scope |

A service account configured for one business unit should not be expected to reproduce an administrator's organization-wide dashboard by default.

## Choose a small, reproducible report

Use a fixed completed date range, one metric, and the `vendor` dimension. Cloudability's cost reporting endpoint documents `total_amortized_cost` as a metric example and exposes available measures at `/reporting/cost/measures`. Confirm the desired metric in that endpoint or your report definition. [Cost reporting API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)

The following Python example uses the `requests` package and a key supplied through the environment. It targets the US API host; use the documented host for your organization's region.

```python
import os
from pathlib import Path

import requests

base_url = "https://api.cloudability.com/v3"
session = requests.Session()
session.auth = (os.environ["CLOUDABILITY_API_KEY"], "")

common = {
    "start_date": "2026-08-01",
    "end_date": "2026-08-31",
    "dimensions": "vendor",
    "metrics": "total_amortized_cost",
}

def capture(label, extra):
    response = session.get(
        f"{base_url}/reporting/cost/run",
        params={**common, **extra},
        timeout=(10, 120),
    )
    response.raise_for_status()
    Path(f"{label}.json").write_text(response.text, encoding="utf-8")

capture("default-view", {})

# Set this to the actual view ID selected in the UI.
capture("explicit-view", {"view_id": os.environ["CLOUDABILITY_VIEW_ID"]})
```

The output files contain billing data, so store them in an appropriate working directory. The code does not print the credential.

If the API user is unrestricted and the intended comparison is all data, run a third capture:

```python
capture("all-data", {"view_id": "0"})
```

Run this in the same script after the earlier definitions. An authorization failure is a useful result; resolve the intended account access rather than silently switching to a more privileged key.

## Interpret the three-way comparison

If the explicit view matches the UI but the omitted view does not, the default view explains the difference. Make the intended view an explicit configuration value for the integration.

If all-data matches the organization dashboard, while the explicit business-unit view is smaller, both results may be correct. Rename the downstream dataset to reflect its scope and preserve the distinction.

If none match, stop changing views and compare the rest of the report contract:

- Exact cost metric, including adjusted versus unadjusted and amortized versus cash.
- Fixed dates and their interpretation in the response metadata.
- Vendor, account, tag, and transaction-type filters.
- Currency and any custom pricing configuration.
- Data extraction time and processing freshness.

Avoid relative dates during the investigation. Two requests executed across midnight can resolve “last seven days” differently even when their text is identical.

## Check allocations and row completeness

The cost reporting API includes `applyAllocations` to control whether post-allocation information is included. Match that setting to the report being compared. Also inspect response metadata and aggregate values instead of relying only on the visible rows. [Cost reporting API parameters](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)

A dashboard displaying a top-ten table may show only part of the data while presenting an aggregate elsewhere. Conversely, a client that requests a row limit and sums only that response can mistake a partial table for a complete total.

Begin with vendor-level aggregation to keep row counts small. Only add account and resource detail after the aggregate comparison succeeds. This keeps pagination and grouping bugs from obscuring a simpler scope issue.

## Make the fix durable

Store the view ID, metric identifier, date policy, allocation setting, and regional API host beside the extraction job. Include them in non-secret run metadata so an operator can reconstruct what was requested.

Do not treat changing a user's default view as an invisible personal preference when that user also owns production API jobs. It can change the meaning of requests that omitted an explicit view.

The useful acceptance check is a known-period report with an agreed scope and total. Once the API and UI match that contract, expand the integration to its normal dimensions and refresh schedule while retaining the same comparison as an operational control.
