# How to Inventory Saved Cloudability Reports and Their Sharing Settings with the API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, FinOps, Cost Management, Troubleshooting

Description: Inventory saved Cloudability cost and utilization reports with their ownership, sharing, and action metadata while preserving the API user access boundary.

A report inventory answers a different question from a cost export. You want the saved definitions, owners, sharing flags, and available actions, rather than the financial rows returned by running a report.

Start by deciding whose inventory you need. A collection response describes the reports visible to the authenticated user. Treating a service account's list as a complete organization inventory can conceal reports that were never shared with that account.

## Retrieve the two report collections

IBM documents separate collections for saved cost reports and saved utilization reports: `/reporting/reports/cost` and `/reporting/reports/util`. Both describe reports owned by or shared with the calling user or organization. The reporting API also exposes query execution endpoints, but those do not inventory saved definitions.

The following example requires Python and `requests`. Supply a Cloudability product API key through your secret manager. Set the base URL to the documented regional host for your tenant; the example uses the US host.

```python
import json
import os
from pathlib import Path
import requests

base = "https://api.cloudability.com/v3"
session = requests.Session()
session.auth = (os.environ["CLOUDABILITY_API_KEY"], "")
inventory = []
for kind in ("cost", "util"):
    response = session.get(
        f"{base}/reporting/reports/{kind}", timeout=(10, 90)
    )
    response.raise_for_status()
    payload = response.json()
    # Endpoint examples use arrays; some API responses use a result envelope.
    reports = payload if isinstance(payload, list) else payload.get("result")
    if not isinstance(reports, list):
        raise ValueError(f"Unexpected {kind} collection response")
    Path(f"saved-{kind}-reports.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    for report in reports:
        inventory.append({
            "kind": kind,
            "id": report["id"],
            "title": report.get("title"),
            "owned_by_user": report.get("owned_by_user"),
            "shared_with_organization": report.get("shared_with_organization"),
            "shared": report.get("shared"),
            "shares": report.get("shares"),
            "permission": report.get("permission"),
        })
Path("report-inventory.json").write_text(
    json.dumps(inventory, indent=2), encoding="utf-8"
)
```

Retaining raw responses makes the inventory auditable when the summary schema changes. These files can contain internal report names and sharing metadata, so store them with the same access restrictions as other administrative exports.

## Interpret sharing without inventing permissions

The cost-report example includes `owned_by_user`, `shared_with_organization`, `shared`, `shares`, and `permission.actions`. Preserve these fields separately. They describe different aspects of visibility and capability; one boolean is not a complete authorization model.

For example, a report might be visible organization-wide while the caller has only a read action. That does not grant the caller permission to change its filters or subscribers. Missing sharing fields should remain unknown in your inventory, rather than becoming `false` through a default value.

Use the original report ID and report kind as the technical key. Titles can be renamed or reused. Record the tenant, regional host, authenticated identity, and extraction time in a separate run record without storing the credential.

## Check completeness with known examples

Before scheduling an audit, create a small acceptance set from reports you can already inspect: one owned report, one directly shared report, one organization-shared report, and one report deliberately inaccessible to the integration identity. Confirm the first three appear as expected and the last remains outside the inventory.

If a report is missing, compare the browser user with the API key owner, verify the report category, and review sharing in the UI. Avoid broadening the service account's access merely to make an unexplained row appear. An administrator can perform a separately authorized comparison when the scope requires it.

Do not apply the cost-result pagination token loop to these collections merely because both paths contain `reporting`. Follow the collection's current contract and investigate any pagination metadata the server actually returns before declaring the inventory complete.

## Turn snapshots into a useful review

Compare snapshots by report kind and ID. Surface newly organization-shared reports, removed reports, ownership changes, and changed permitted actions. A disappearance is an observation, not proof of deletion: sharing or caller permissions may have changed.

Review the saved dimensions, metrics, and filters in the retained definition when a sharing change exposes a report to a larger audience. A familiar title does not prove that its contents are still suitable for that audience.

## Conclusion

A reliable saved-report inventory preserves both definitions and access context. Retrieve the documented collections, retain the sharing fields independently, and verify visibility with known reports before using the result as an organization-wide audit.

## Official Documentation

- [IBM cost-report collection and schema](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)
- [IBM utilization-report collection](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-utilization-reports-end-point)
- [IBM API authentication and response conventions](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-getting-started-cloudability-v3)
