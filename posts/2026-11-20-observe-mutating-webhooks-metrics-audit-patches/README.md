# Observe Mutating Webhooks with Metrics and Audit Evidence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Observability, Prometheus

Description: Separate slow calls, explicit denials, fail-open errors, and actual mutations using API server metrics, focused audit records, and safe webhook logs.

A webhook dashboard showing HTTP 200 responses does not tell you whether the webhook changed an object, whether Kubernetes accepted its response, or whether the overall API request succeeded. An admission denial can itself be carried inside a successful HTTP response. Another admission component can reject the request later.

Use three evidence sources together: API server metrics describe aggregate outcomes, audit records explain particular admission sequences, and webhook logs describe the handler's own work. Each sees a different boundary.

This article uses metric names and audit behavior from **Kubernetes v1.35.0**. PromQL examples use standard Prometheus query functions; the local syntax check uses the **Prometheus v0.305.0 Go module**. Access to control-plane metrics and audit records depends on your platform and permissions.

## Start from the API server's view

The API server can observe connection failures, rejected admission responses, and time spent calling the webhook even when the handler has no corresponding log entry. Scrape every relevant API server through your platform's supported, authenticated monitoring path. Do not assume a managed control plane exposes every metric or audit setting to tenants.

For this release, the webhook duration histogram is stable, while the rejection and fail-open counters below are alpha metrics. Confirm their availability after upgrades and compare against the actual scraped series. Their names and labels are defined in the [v1.35.0 admission metrics source](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/admission/metrics/metrics.go).

The queries assume one cluster and use `injector.example.com` as the webhook entry name. Replace it with your `webhooks[].name`, not the containing configuration's name. If your monitoring system combines clusters, add its actual cluster label filter to every selector and preserve cluster identity in aggregations.

Estimate the 99th percentile call duration in seconds over five minutes:

```promql
histogram_quantile(
  0.99,
  sum by (le, name) (
    rate(apiserver_admission_webhook_admission_duration_seconds_bucket{
      type="admit", name="injector.example.com"
    }[5m])
  )
)
```

`type="admit"` selects mutating admission. Keep `le`, the bucket-boundary label, when aggregating a classic histogram. Apply `rate` before summing so counter resets are handled per series. The result is an estimate shaped by the histogram's buckets; sparse traffic can make a percentile unhelpful. These behaviors are covered by the [Prometheus function reference](https://prometheus.io/docs/prometheus/latest/querying/functions/).

Do not average independently calculated percentiles across API servers. Aggregate the bucket rates first, as shown. Also inspect volume and per-instance behavior so a cluster-wide view does not hide an isolated control-plane problem.

## Separate denials from infrastructure errors

This query groups rejection rates by reason:

```promql
sum by (name, error_type) (
  rate(apiserver_admission_webhook_rejection_count{
    type="admit", name="injector.example.com"
  }[5m])
)
```

`error_type="no_error"` means a webhook rejection without a calling error, such as an explicit policy denial. It does not mean the API request succeeded. `calling_webhook_error` identifies a failure calling the webhook that caused rejection; `apiserver_internal_error` is a different internal error category.

When the policy permits a call failure to be ignored, the request may continue instead of incrementing a rejection series. Watch fail-open events separately:

```promql
sum by (name) (
  increase(apiserver_admission_webhook_fail_open_count{
    type="admit", name="injector.example.com"
  }[10m])
)
```

An increase indicates a recorded fail-open event, not proof that the entire API request eventually succeeded. A zero rejection rate is therefore not enough to conclude that all required mutations occurred. The [mutating dispatcher](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/admission/plugin/webhook/mutating/dispatcher.go) shows how these outcomes are recorded.

An empty query result is not automatically zero. Check scrape health, metric availability, exact labels, and whether that series has ever been created. Do not hide missing telemetry by immediately converting every absent series to a healthy value.

## Use audit annotations to identify actual mutation

Kubernetes can attach mutation details to API audit events. At Metadata audit level or higher, a mutation annotation identifies the configuration, webhook, and whether that invocation changed the object. Keys include the invocation round and index, such as `mutation.webhook.admission.k8s.io/round_0_index_0`.

At Request audit level or higher, patch annotations can contain the actual JSON Patch. Their prefix is `patch.webhook.admission.k8s.io/`. The annotation value is itself a JSON-encoded string inside the event's annotations map. See [webhook monitoring and audit annotations](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#monitoring-admission-webhooks).

A mutation annotation with `mutated: false` does not establish that no call was attempted or that the request was allowed. It says that invocation did not change the object. Inspect the event's response status and surrounding evidence.

Audit policy rules use first-match behavior. If you add a narrow diagnostic rule, place it deliberately within the existing policy rather than replacing the policy or assuming a later rule will override an earlier match. Start with Metadata for normal diagnosis. Request-level records include request bodies and patch values, which can expose credentials or sensitive workload configuration. Follow the [audit policy and backend documentation](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/) for scope, stages, retention, and access controls.

## Summarize without printing patch values

If you already have an authorized JSON-lines audit export, this Python 3.11 script produces a compact mutation summary. Save it as `summarize_mutations.py` and run `python3 summarize_mutations.py audit.jsonl`. It reads a local file and prints selected fields; it does not query the cluster.

```python
import json
import sys

PREFIX = "mutation.webhook.admission.k8s.io/"

with open(sys.argv[1], encoding="utf-8") as source:
    for line in source:
        if not line.strip():
            continue
        event = json.loads(line)
        if event.get("stage") != "ResponseComplete":
            continue
        for key, encoded in event.get("annotations", {}).items():
            if not key.startswith(PREFIX):
                continue
            detail = json.loads(encoded)
            print(json.dumps({
                "auditID": event.get("auditID"),
                "invocation": key.removeprefix(PREFIX),
                "configuration": detail.get("configuration"),
                "webhook": detail.get("webhook"),
                "mutated": detail.get("mutated"),
                "responseCode": event.get("responseStatus", {}).get("code"),
            }, sort_keys=True))
```

The output includes no request body or patch values. It deliberately selects ResponseComplete to avoid listing the same request at multiple audit stages. If your audit policy omits that stage, adjust the investigation to the stages it actually records; an empty output is not proof of no mutation.

The helper assumes valid audit JSON and JSON-encoded mutation annotations. A malformed line fails visibly rather than being silently discarded. Keep the original export protected even when the derived summary is small.

## Correlate handler work without conflating identifiers

In webhook logs, record the AdmissionRequest UID, operation, delivered kind and version, decision, patch-operation count, and handler duration. Avoid logging the entire object by default. The UID identifies the webhook request/response round trip, as defined in the [AdmissionRequest type](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/api/admission/v1/types.go).

Do not assume that UID equals the audit event's `auditID`. Use each within its own context and correlate with the webhook name, object reference, timing, and an intentionally recorded safe correlation mechanism where available. An object name alone may be reused and is not a unique request identifier.

Reinvocation can produce multiple webhook calls for one admission process. Counts of calls are therefore not automatically counts of distinct user API writes. Audit round information helps explain repeated mutations without assuming a retry bug.

The three PromQL expressions were parsed locally, and the summarizer was exercised with synthetic audit fixtures, including multiple rounds and unrelated annotations. No live Prometheus data or cluster audit stream was queried. Verify the dashboards with a known canary request, an explicit denial, and a controlled staging failure before relying on them during an incident.
