# Why Does an OpenSearch Per-Document Monitor Omit Source Fields? Fixing Trigger Context and Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Alerting, Logging, Troubleshooting

Description: Use the document-level alert context and nested sample-document loop so OpenSearch notifications can render allow-listed fields from matching documents.

---

A per-document monitor does not expose matching documents through the same context as a query-level monitor. For document-level actions, newly created alerts are in `ctx.alerts`, and each alert can contain `sample_documents`. The original JSON payload is under each sample document's `_source`.

Templates that look in `ctx.results.0.hits.hits` or `ctx.alert._source` can therefore trigger successfully while rendering blank source fields.

## Understand the document-level context

The important shape is:

```text
ctx.alerts[]
  associated_queries[]
  sample_documents[]
    _index
    _id
    _score
    _source
```

`ctx.alerts` contains newly created document alerts for that execution. It is not a permanent list of every currently active alert. OpenSearch also stores findings separately in `.opensearch-alerting-finding*`.

## Use nested Mustache sections

Given documents with this shape:

```json
{
  "@timestamp": "2026-09-02T11:02:00Z",
  "service": {"name": "checkout"},
  "log": {"level": "ERROR"},
  "message": "authorization failed",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"
}
```

use a message template that enters both arrays:

```mustache
Monitor: {{ctx.monitor.name}}
Trigger: {{ctx.trigger.name}}
Window: {{ctx.periodStart}} to {{ctx.periodEnd}}

{{#ctx.alerts}}
Matched rules:
{{#associated_queries}}
- {{name}} ({{id}}) tags={{tags}}
{{/associated_queries}}

Sample documents:
{{#sample_documents}}
- {{_source.@timestamp}} {{_source.service.name}} {{_source.log.level}}
  {{_source.message}}
  trace={{_source.trace_id}}
  index={{_index}} id={{_id}}
{{/sample_documents}}
{{/ctx.alerts}}
```

The leading dots are not needed inside a Mustache section; the current context is already one alert or sample document.

Test one field at a time. Begin with `_index` and `_id`, then add `_source.message`, then nested paths. If metadata renders but `_source` does not, the loop is correct and the issue is source availability or permissions.

## Verify source is actually available

Search for a known matching document with the monitor creator's identity:

```http
GET logs-prod-*/_search
{
  "query": {
    "ids": {
      "values": ["DOCUMENT_ID"]
    }
  }
}
```

Check these conditions:

- `_source` is enabled in the index mapping.
- Field-level security permits the desired fields.
- The monitor creator can read the concrete rollover index containing the document.
- The mapping represents `service.name` as a nested object path rather than a differently named field.
- The source field exists on the matching document, not only on a newer schema version.

OpenSearch monitors use the permissions of the user who created them. Reassigning the notification channel or giving the recipient broader permissions does not expand the monitor's source access.

## Confirm the action execution scope

Document-level monitors can produce many alerts. Configure the action for the intended per-alert behavior and test volume carefully. The message context for per-document alerts is `ctx.alerts`; query-level `ctx.alert` and bucket-level `ctx.newAlerts` are different objects.

Use the Alerting API dry run on the saved monitor:

```http
POST _plugins/_alerting/monitors/MONITOR_ID/_execute?dryrun=true
```

Inspect the execution response and `ctx.error` before enabling a notification. A dry run avoids sending actions, but run it against a safe time window because the monitor query still consumes cluster resources.

## Avoid the common non-fixes

- **Changing brackets to dots only:** Mustache needs dot notation, but the correct root is still `ctx.alerts`.
- **Dumping `{{ctx}}`:** useful briefly in a secure test channel, but noisy and likely to expose sensitive fields.
- **Reading the findings system index directly in a template:** templates use the supplied execution context; they do not issue arbitrary secondary searches.
- **Increasing sample volume indefinitely:** this creates large messages and disclosure risk. Link to Discover for full investigation.
- **Editing alerting system indexes:** use Alerting and Findings APIs; component-owned indexes are not an application database.

## When fields are intentionally omitted

Treat notifications as a lower-trust boundary. Include an allow-list such as timestamp, service, severity, a short message, trace ID, and document ID. Put the investigation link behind OpenSearch authentication so responders retrieve the complete document under their own permissions.

If a sample field can contain arbitrary user text, remember that Mustache does not automatically make it safe for every destination format. An intermediary is the right place to perform JSON encoding, truncation, and redaction for a webhook.

## Official References

- [OpenSearch alerting triggers and sample documents](https://docs.opensearch.org/latest/observing-your-data/alerting/triggers/)
- [OpenSearch per-document monitors](https://docs.opensearch.org/latest/observing-your-data/alerting/per-document-monitors/)
- [OpenSearch Alerting API and findings search](https://docs.opensearch.org/latest/observing-your-data/alerting/api/)
- [OpenSearch alerting security](https://docs.opensearch.org/latest/observing-your-data/alerting/security/)
