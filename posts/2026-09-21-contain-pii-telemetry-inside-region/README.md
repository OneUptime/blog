# How to Keep PII in Logs, Traces, Metrics, and Error Reports Within a Region

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, OpenTelemetry, Data Privacy, Observability, Security

Description: Build regional telemetry paths, control direct SDK exports, and test every signal and failure route before allowing sanitized observability data to leave a boundary.

---

Removing email addresses from span attributes is useful, but it does not establish a regional telemetry boundary. An error SDK can send an exception directly to a global endpoint, a Collector can spill raw data to disk, and an alert can paste a customer identifier into an external ticket.

The practical design is to classify the complete telemetry path, keep sensitive processing inside the approved region, and release only an explicitly approved output.

## Map each signal independently

Trace a synthetic request through logs, traces, metrics, error reports, profiles, browser telemetry, and alert notifications. Record ingestion endpoints, processing locations, retry queues, persistent storage, replicas, and human access paths.

Inspect application configuration as well as the infrastructure diagram. Auto-instrumentation, crash reporters, agent diagnostics, and browser SDKs can bypass a regional Collector entirely. A regional hostname must be backed by a documented service commitment; DNS geography alone cannot demonstrate where processing or storage happens.

OpenTelemetry's [sensitive-data guidance](https://opentelemetry.io/docs/security/handling-sensitive-data/) describes minimizing and processing sensitive information. Apply those techniques inside the boundary, before any approved external export.

## Use a regional collection boundary

A useful deployment has three distinct responsibilities:

| Component | Responsibility | Failure behavior |
| --- | --- | --- |
| Application or regional agent | Avoid collecting unnecessary sensitive fields | Drop optional diagnostics |
| Regional Collector and backend | Process and retain authorized detailed telemetry | Buffer only in approved storage |
| Export gate | Release an approved, reduced representation | Stop release on policy failure |

Do not fall back to an overseas endpoint when the regional backend is unavailable. Limit queue size and retention, and decide which signals may be dropped. Check Collector self-logs and dead-letter storage: processing failures can expose the original record.

If an internal backend needs detailed records while an external system receives aggregates, make that an explicit branch with different permissions and tests. A single exporter added to the wrong pipeline can defeat the intended split.

## Redact structure and content

Attributes are only one surface. Audit span names, events, status descriptions, log bodies, resource attributes, metric labels, exemplar identifiers, exception messages, stack-local variables, attachments, and replay data. A field allowlist must constrain allowed values too: a permitted `http.route` containing a literal email address is still a leak.

The Collector provides processors for filtering and transforming signals, described in [transforming telemetry](https://opentelemetry.io/docs/collector/transforming-telemetry/). Verify component availability and behavior in the exact deployed distribution. Test malformed data and processor errors instead of assuming a setting named "ignore" provides a release boundary.

For a deliberately limited application metric, map input into a closed vocabulary before recording it:

```python
ALLOWED_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
ALLOWED_ROUTES = {"/orders", "/orders/{id}", "/health"}

def public_dimensions(method, route, status):
    return {
        "method": method if method in ALLOWED_METHODS else "OTHER",
        "route": route if route in ALLOWED_ROUTES else "OTHER",
        "status_class": (
            str(status // 100) + "xx"
            if type(status) is int and 100 <= status <= 599
            else "OTHER"
        ),
    }
```

This function controls these three labels only. It is not a sanitizer for an entire telemetry record. Place its use before metric aggregation so removed dimensions do not accidentally merge already aggregated streams with conflicting identities. Publish only the explicitly approved metric families.

## Test ordinary and exceptional paths

Create synthetic markers that cannot be confused with real customer data. Put different markers in a URL query, a request header, a nested log body, an exception, a span event, and an error-report attachment.

Search approved regional storage to confirm the test exercised the expected collection path. Inspect every external destination to confirm the release policy held. Test success, validation failure, timeout, retry, process crash, and backend outage.

Add an adversarial route value such as `/orders/customer@example.invalid`. The example function should map it to `OTHER`. Verify that neither its original value nor an unreviewed hash appears in the exported record. Stable hashed identifiers can still permit linking and should not be assumed anonymous.

## Control the routes around the Collector

Restrict direct outbound SDK traffic with the network and workload controls appropriate to the platform. Maintain an inventory of exporter endpoints and SDK ingestion keys. Review changes to that inventory in code review, including build-time browser configuration.

Finally, inspect alert templates, chat integrations, support bundles, and dashboards opened from outside the boundary. Regional storage does not by itself settle remote-access requirements; Microsoft's [documented remote-access transfer scenarios](https://learn.microsoft.com/en-us/privacy/eudb/eu-data-boundary-transfers-for-all-services) illustrate why access needs its own review.

Keep the evidence specific: tested signals, deployed versions, approved destinations, and observed failure behavior. A successful test proves the exercised paths at that time; repeat it when instrumentation, exporters, or routing changes.
