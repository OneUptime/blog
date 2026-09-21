# How to Prove Data Residency with Cloud Evidence and Data-Flow Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, AWS Config, Compliance Monitoring, Data Flow, Security

Description: Combine scoped cloud inventories, explicit unknown states, and synthetic data-flow tests to produce repeatable evidence for regional data controls.

---

A screenshot of a database's region is evidence about one resource at one moment. It cannot establish where backups, telemetry, exports, or vendor integrations send the same data.

Build a repeatable evidence process that joins declared requirements, observed configuration, and exercised data paths. Its conclusion should be bounded: which systems and paths passed, when they were checked, and what remains unknown.

## Turn the boundary into a machine-readable policy

Maintain an approved location set per data class and service. Include accounts, projects, backup destinations, vendor products, and exceptions with expiry dates.

For an internal evidence pipeline, a small normalized record might look like this:

```json
{
  "resource_id": "opaque-orders-db-reference",
  "kind": "database",
  "observed_region": "eu-west-2",
  "allowed_regions": ["eu-west-2"],
  "observed_at": "2026-09-21T08:00:00Z",
  "collector_status": "ok",
  "owner": "orders-platform"
}
```

This is an internal record format, not a cloud-provider schema. Keep identifiers opaque when evidence must leave the workload region. Names, tags, and free-form configuration fields can themselves contain sensitive information.

## Collect configuration with a coverage statement

Inventory primary stores, replicas, snapshots, transaction-log archives, queues, object-processing jobs, keys, and exporter endpoints. Record which accounts and regions were queried and whether every paginated response completed.

AWS Config supports [queries over current configuration state](https://docs.aws.amazon.com/config/latest/developerguide/querying-AWS-resources.html), but only for supported, recorded resources. A resource absent from query results is not necessarily absent from the account.

Aggregators can centralize evidence from multiple accounts and regions. That also moves configuration data: AWS describes authorizing this replication when [creating an aggregator](https://docs.aws.amazon.com/config/latest/developerguide/aggregated-create.html). Check the evidence store's location and contents before selecting a global aggregation design.

Use direct service APIs for gaps such as replication destinations or current backup-copy behavior. Preserve raw evidence in the approved region and produce a smaller signed or access-controlled report if broader distribution is allowed.

## Make unknown a first-class result

A failed permission check must not become a passing test. This evaluator operates on the internal record above:

```python
from datetime import datetime, timedelta, timezone

def evaluate(record, now, max_age=timedelta(hours=24)):
    if record.get("collector_status") != "ok":
        return "unknown"
    try:
        observed = datetime.fromisoformat(
            record["observed_at"].replace("Z", "+00:00")
        )
        if observed.tzinfo is None:
            return "unknown"
        if observed > now or now - observed > max_age:
            return "unknown"
        allowed = record["allowed_regions"]
        if (
            not isinstance(allowed, list)
            or not allowed
            or any(not isinstance(value, str) or not value for value in allowed)
        ):
            return "unknown"
        region = record["observed_region"]
        if not isinstance(region, str) or not region:
            return "unknown"
    except (KeyError, ValueError, TypeError, AttributeError):
        return "unknown"
    return "pass" if region in allowed else "fail"

now = datetime.now(timezone.utc)
```

A pass means only that this observed region matches this record's allowlist and freshness policy. It does not prove downstream destinations, legal sufficiency, or the authenticity of untrusted input. Control who can edit the policy and who can produce observations.

Maintain separate results for resource placement, replication placement, processing endpoints, and evidence freshness. This lets an owner distinguish a real boundary violation from broken collection.

## Exercise the paths that configuration cannot reveal

Use synthetic customer records containing unique test markers. Trace one through API ingestion, asynchronous processing, error handling, backups, support tooling, analytics, and deletion.

Test negative cases too: a disallowed destination in a proposed change, an unavailable regional endpoint, a retry queue overflow, and a recovery runbook requesting an unapproved location. Confirm that a failure does not activate a global fallback.

Never use real customer records merely to make the test realistic. Keep payload captures and test logs in approved storage; otherwise the evidence process becomes a new export path.

## Compare observations with intended changes

Run checks before deployment and after the system has converged. Infrastructure plans describe intent, while service APIs show what exists. Also monitor changes made through consoles, emergency scripts, or vendor settings.

For AWS, the [RequestedRegion condition documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-requestedregion) explains why an API endpoint region does not constrain every downstream effect. Validate destination fields and actual copies as well as the region in which a request was made.

Attach failures to a resource owner and a remediation deadline. Expired exceptions should return to a failing or unresolved state automatically instead of remaining silently approved.

The evidence package should contain policy version, scope, timestamps, collector failures, configuration findings, synthetic test results, and open exceptions. That is a repeatable argument about measured controls. It avoids claiming universal proof from a dashboard that only knows about a subset of the data path.
