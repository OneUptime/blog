# How to Manage Cloudability Business Mappings as Code with the REST API and Match-Expression DSL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, REST API, Automation, FinOps, Cost Management

Description: Version Cloudability Business Mapping definitions, validate ordered DSL rules, and deploy reviewed changes through the REST API with backup and read-back checks.

Business Mappings encode ownership decisions that affect reports and chargeback. Keeping them only in a web form makes it difficult to review a change, reproduce an older definition, or explain why a team suddenly received more cost.

Manage the desired definition as a versioned JSON document. Use the REST API to compare it with the deployed mapping, apply the reviewed change, and read back the result. Treat historical data reprocessing as a separate rollout step.

## Store intent separately from deployment identity

A Business Dimension definition includes a name, kind, default, and ordered statements. Each statement has a matching expression and a value expression. Cloudability exposes these objects through `/business-mappings`. [Business Mappings API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-business-mappings-end-point)

This original example maps a small team taxonomy:

```json
{
  "name": "Service Owner",
  "kind": "BUSINESS_DIMENSION",
  "defaultValue": "Unallocated",
  "statements": [
    {
      "matchExpression": "TAG['service'] IN ('payments', 'checkout')",
      "valueExpression": "'Commerce'"
    },
    {
      "matchExpression": "DIMENSION['vendor_account_identifier'] == '444455556666'",
      "valueExpression": "'Research'"
    }
  ]
}
```

Save it as `service-owner.json`. Keep the deployed mapping's index in environment-specific configuration rather than assuming that development and production use the same index.

The first rule deliberately overrides the account fallback. Review that order as part of the policy. Preserve array order when formatting JSON or generating definitions from a table.

## Validate both JSON and policy behavior

A JSON parser catches malformed syntax:

```bash
python3 -m json.tool service-owner.json > /dev/null
```

It does not validate Cloudability expressions. The DSL uses typed lookups such as `TAG[...]` and `DIMENSION[...]`; literal result strings belong inside expression quotes. Text comparisons are case-insensitive. Regular-expression `FIND` uses Java pattern syntax and searches for a match, so whole-value patterns need anchors. [Business Mapping expression language](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=point-business-mapping-expression-language)

For this definition, review at least four cases: a Payments item in the research account, a non-Commerce item in that account, an item in another account, and a missing service tag. The expected results are Commerce, Research, Unallocated, and an account-dependent fallback respectively.

Add fixtures when a defect is found. Keep their expected owner labels independent of the code that generates the mapping, so the test can expose an incorrect generator.

Use a sandbox mapping or controlled nonproduction scope to verify expressions against Cloudability. Do not claim that a local evaluator proves every DSL behavior unless it implements and tests the relevant semantics.

## Export the deployed definition before writing

Use the correct API host for your region and supply the API key through your secret manager. The following Python example uses the `requests` package, exports the current collection, and selects one existing mapping by its deployment index:

```python
import json
import os
from pathlib import Path

import requests

api_base = "https://api.cloudability.com/v3"
mapping_index = int(os.environ["CLOUDABILITY_MAPPING_INDEX"])

session = requests.Session()
session.auth = (os.environ["CLOUDABILITY_API_KEY"], "")

response = session.get(f"{api_base}/business-mappings", timeout=(10, 60))
response.raise_for_status()
snapshot = response.json()
Path("mappings-before.json").write_text(
    json.dumps(snapshot, indent=2), encoding="utf-8"
)

matches = [
    item for item in snapshot["result"]
    if int(item["index"]) == mapping_index
]
if len(matches) != 1:
    raise RuntimeError("Expected exactly one deployed mapping")

current = matches[0]
desired = json.loads(Path("service-owner.json").read_text(encoding="utf-8"))
if current["name"] != desired["name"] or current.get("isReadOnly"):
    raise RuntimeError("Mapping identity or editability check failed")
```

Use a timestamped backup filename in a recurring job so subsequent runs do not overwrite the previous evidence. Mapping definitions can contain internal account and organizational information; store them appropriately.

IBM's maintained mapping utility retrieves the collection, uses the returned `index` for updates, and checks read-only mappings. [IBM Apptio-Tools mapping updater](https://github.com/IBM/Apptio-Tools/blob/main/cloudability/business-mapping-update/update_mappings_from_csv.py)

## Compare and apply the complete desired definition

Review the fields you own, including defaults and statements. Ignore server-generated metadata when comparing desired state, but do not ignore a changed default merely because the statements are identical.

Serialize changes through one deployment job to reduce conflicting edits. Immediately before applying, retrieve the mapping again and abort if it differs from the reviewed snapshot. This comparison reduces accidental overwrites, although it is not an atomic concurrency guarantee.

After review, continue the example with:

```python
updated = session.put(
    f"{api_base}/business-mappings/{mapping_index}",
    json=desired,
    timeout=(10, 60),
)
updated.raise_for_status()
```

That update path is used by IBM's published updater. Creating a genuinely new mapping uses POST on the collection; do not repeat POST on every deployment or infer an existing mapping's index from list position. [IBM mapping updater](https://github.com/IBM/Apptio-Tools/blob/main/cloudability/business-mapping-update/update_mappings_from_csv.py), [Business Mappings API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-business-mappings-end-point)

If the write times out, read the mapping before retrying. The server may have applied it even though the client did not receive the response.

## Verify configuration and processed results

Retrieve the collection again and compare the selected mapping's owned fields with the desired document. Record the commit, deployment index, applying identity, and read-back result.

Then verify representative processed items and aggregate ownership totals. A successful API write proves the definition was accepted; it does not prove historical reports were rebuilt. IBM documents current-month application separately from historical reprocessing. [Business Mapping processing](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=spend-business-mapping)

Rollback means restoring the previous reviewed definition to the same mapping and verifying it again. If historical data already adopted the faulty definition, plan the corresponding corrective reprocess and refresh external exports.

This workflow gives allocation rules the same useful controls as other configuration: explicit ownership, meaningful diffs, tested examples, a known deployment target, and evidence that the intended result reached reporting.
