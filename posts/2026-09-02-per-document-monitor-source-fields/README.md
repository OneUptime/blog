# Why Does an OpenSearch Per-Document Monitor Omit Source Fields? Fixing Trigger Context and Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Alerting, Logging, Troubleshooting

Description: Use the document-level alert context and nested sample-document loop so OpenSearch notifications can render allow-listed fields from matching documents.

---

A per-document monitor does not expose matching documents through the same context as a query-level monitor. For document-level actions, newly created alerts are in `ctx.alerts`, and each alert can contain `sample_documents`. Retrieved source fields are under each sample document's `_source`. The `associated_queries` and `sample_documents` fields require OpenSearch 2.13 or later.

Templates that look in `ctx.results.0.hits.hits` or `ctx.alert._source` can therefore trigger successfully while rendering blank source fields.

## Understand the document-level context

The important shape is:

```text
ctx.alerts[]
  associated_queries[]
  sample_documents[]
    _index
    _id
    _source
```

`ctx.alerts` contains newly created document alerts for that execution. It is not a permanent list of every currently active alert. By default, OpenSearch also stores findings separately in `.opensearch-alerting-finding*`.

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

You do not repeat the outer path inside a Mustache section; the current context is already one alert or sample document.

Test one field at a time. Begin with `_index` and `_id`, then add `_source.message`, then nested paths. If metadata renders but `_source` does not, the loop is correct; check source retrieval and permissions next.

## Verify source is actually available

Retrieve a known matching document from its concrete index using an identity with the same effective permissions captured from the user who created or last modified the saved monitor:

```http
GET logs-prod-000123/_mget
{
  "ids": ["DOCUMENT_ID"]
}
```

Check these conditions:

- `_source` is retrievable, either because it is stored or because derived source is enabled, and mapping-level `_source` includes or excludes retain the desired fields.
- Field-level security permits the desired fields.
- The monitor's effective permissions include multi-get access to the concrete rollover index containing the document.
- The returned `_source` contains a `service` object with a `name` member; Mustache dots traverse objects rather than addressing a literal key named `service.name`.
- The source field exists on the matching document, not only on a newer schema version.
- Documents indexed with custom routing are affected by [an open Alerting retrieval bug through OpenSearch 3.8](https://github.com/opensearch-project/alerting/issues/2149) because the follow-up multi-get omits the routing value; template changes do not fix that case.

OpenSearch monitors use the permissions captured from the user who created or last modified them. A recipient's permissions do not expand source access; editing the monitor, including changing its channel, can change the effective permissions to those of the editor.

## Confirm the action execution scope

Document-level monitors can produce many alerts. Choose per-alert or per-execution action scope deliberately and test volume carefully. A per-alert action normally receives a one-element `ctx.alerts`, while a per-execution action can receive several. Query-level `ctx.alert` and bucket-level `ctx.newAlerts` are different objects.

Use the Alerting API dry run on the saved monitor:

```http
POST _plugins/_alerting/monitors/MONITOR_ID/_execute?dryrun=true
```

Inspect the response's top-level and per-trigger `error` fields, and `input_results.error` when present, before enabling a notification. Inside a template, the corresponding context variable is `ctx.error`. A dry run does not send action messages, but run it against a safe time window because the monitor query still consumes cluster resources.

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
- [OpenSearch source metadata field](https://docs.opensearch.org/latest/mappings/metadata-fields/source/)
- [OpenSearch Multi-get Documents API](https://docs.opensearch.org/latest/api-reference/document-apis/multi-get/)
