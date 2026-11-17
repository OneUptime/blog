# How to Audit Sensitive Prompts in Logs, Traces, and Evaluation Datasets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Privacy, Observability, Security

Description: Audit prompt persistence across application telemetry, provider storage, and evaluation datasets using synthetic markers and explicit retention evidence.

A retention setting on your trace backend does not describe the lifetime of a prompt. The same input may be copied into a retry queue, an error attachment, an evaluation dataset, and a developer's exported incident bundle. An effective audit follows these copies and establishes how each one expires or is deleted.

Use synthetic content for the investigation. The goal is to discover persistence without distributing another real customer prompt.

## Build a copy inventory

Start with a data-flow walkthrough from request admission through evaluation. For each write, record the owner, destination, region, content fields, readers, retention rule, and deletion mechanism. Include temporary storage and derived copies.

| Destination | Question that exposes hidden persistence |
|---|---|
| Application logs | Does debug logging serialize the entire request? |
| Trace backend | Are input messages or retrieved documents captured? |
| Error reporting | Are frame locals, breadcrumbs, or attachments retained? |
| Queue and dead-letter queue | Is the original payload stored for retries? |
| Provider | Which endpoint and feature retain application state? |
| Evaluation dataset | Does adding a trace create a separate durable example? |
| Object storage and backups | Are versions and exported archives retained? |

Do not equate “excluded from training” with “not stored.” OpenAI distinguishes abuse-monitoring logs from application state, with retention affected by endpoint, feature, and approved controls. `store=false` is not a universal statement about all storage. Record the actual project configuration and relevant endpoint exceptions from the current documentation. [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data).

## Follow a synthetic marker

Generate an opaque marker such as `privacy-audit-<random-uuid>` and place it in a staging request. Put different suffixes in the user message, retrieved document, and tool result so you can identify which representation was copied. These markers are audit probes, not examples of real PII, and they should not be interpreted as a detector-accuracy benchmark.

Exercise success, timeout, retry, rejection, and cancellation paths. Allow asynchronous exporters to flush, then search authorized destinations using their APIs. Preserve evidence as destination, object identifier, timestamp, and marker-presence status. Avoid copying the full payload into your audit notes.

This runnable example demonstrates a tiny inventory check against synthetic exports:

```python
copies = [
    {"sink": "logs", "marker_found": False, "owner": "platform"},
    {"sink": "traces", "marker_found": True, "owner": "ai-runtime"},
    {"sink": "eval-dataset", "marker_found": True, "owner": "quality"},
]
approved_content_sinks = {"eval-dataset"}
unexpected = [
    row["sink"] for row in copies
    if row["marker_found"] and row["sink"] not in approved_content_sinks
]
assert unexpected == ["traces"]
print({"unexpected_content_sinks": unexpected})
```

The fixture does not connect to a service. Replace it with export adapters in your audit tooling and keep access narrowly scoped. An unavailable search or expired credential must produce `not_checked`, not `marker_absent`.

## Inspect evaluation copies explicitly

Evaluation data often survives longer than operational traces. For example, LangSmith documents indefinite dataset retention independently of trace retention. Adding inputs and outputs to a dataset therefore creates a separate lifecycle to manage. [LangSmith administration and data retention](https://docs.langchain.com/langsmith/administration-overview).

Record the source trace ID, dataset example ID, dataset version, export location, and approval basis. If a source prompt must be deleted, these identifiers help locate downstream copies. Do not assume deleting the trace also deletes dataset versions or local JSON exports.

Review automations that turn failures into examples. They may preferentially select unusual, lengthy, or sensitive requests. Require the same content policy at dataset ingestion that applies to telemetry, with an explicit review path for exceptional data.

## Prove deletion and expiry separately

For each destination, test the supported deletion workflow using the marker. Verify its disappearance through the ordinary query path and an authorized administrative path where available. Record whether the result means logical invisibility, physical deletion, or scheduled expiry.

Backups, object versions, legal holds, caches, and delayed exports need their own documented behavior. Do not promise immediate physical deletion when the service only guarantees eventual removal. A successful delete response proves the request was accepted; it does not independently prove every replica and archive has been removed.

For natural expiry, create a dated fixture and revisit it after the configured window plus expected processing delay. Check whether feedback, evaluations, or other interactions changed its retention classification. Use the provider's documented lifecycle rather than assuming a dashboard's disappearance is complete evidence.

## Turn the audit into an operational control

Publish an inventory with states such as `verified`, `not_checked`, `unexpected_copy`, and `deletion_pending`. Report the denominator: checking six of twelve destinations is partial coverage even if all six pass.

Repeat the probe after enabling a new SDK integration, changing a model endpoint, adding background jobs, or introducing an evaluation platform. Assign every unexpected copy a remediation owner and verify the fix with another marker. OpenTelemetry's guidance makes minimization and review of emitted telemetry an application responsibility; the inventory is how that responsibility becomes testable. [OpenTelemetry sensitive-data guidance](https://opentelemetry.io/docs/security/handling-sensitive-data/).
