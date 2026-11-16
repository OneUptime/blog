# How to Reconcile Azure OpenAI Realtime Token Telemetry with Billing Meters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, OpenAI, Token Usage, Cost Optimization

Description: Reconcile Azure Realtime response usage with modality-specific billing meters without double-counting cached tokens or conversation history.

Realtime voice applications produce several plausible totals: microphone seconds, transcript tokens, generated audio, response usage, and Azure billing quantities. These measure different things. Comparing the sum of `total_tokens` directly with an invoice amount cannot explain a discrepancy.

Build a reconciliation pipeline that preserves raw response usage, maps it to the correct meters, and compares settled billing periods. Treat the result as an accounting investigation rather than adjusting token counts until the numbers happen to agree.

## Establish the API contract for your deployment

Record the Azure resource ID, deployment name, underlying model version, region, and API version or endpoint form. A deployment alias can point to a different model later, so retain the mapping as it existed when the response ran.

Microsoft's [Realtime API reference](https://learn.microsoft.com/en-us/azure/foundry/openai/realtime-audio-reference) points to the OpenAI specification while documenting Azure differences. Use that schema for response events, but use Azure's applicable billing meters and agreement prices for money. OpenAI public API rates are not evidence of your Azure rate.

The [Realtime `response.done` reference](https://developers.openai.com/api/reference/resources/realtime/server-events#response.done) includes response status and usage. Input usage can contain previous conversation turns, and cached tokens are included within input tokens. A response terminal event also does not mean the response succeeded: preserve completed, cancelled, failed, and incomplete outcomes.

## Keep an immutable response ledger

Ingest each terminal response once, keyed by resource, session, and response ID. Store the event ID for transport deduplication, the original usage object for later reprocessing, and a normalized record for analysis:

```json
{
  "resource_id": "azure-resource-identifier",
  "session_id": "session-42",
  "response_id": "resp_123",
  "deployment": "voice-production",
  "model_version": "captured-at-request-time",
  "observed_at": "2026-11-16T10:00:00Z",
  "status": "completed",
  "usage_schema": "realtime-response-v1",
  "input_tokens": 1200,
  "input_text_tokens": 300,
  "input_audio_tokens": 900,
  "cached_text_tokens": 100,
  "cached_audio_tokens": 400,
  "output_text_tokens": 40,
  "output_audio_tokens": 160
}
```

These normalized field names are application-defined. Map them from the documented `input_token_details`, `cached_tokens_details`, and `output_token_details` structures for your API. Preserve missing fields as unknown instead of silently assuming zero.

Do not discard cancelled responses: work may already have occurred before interruption. Likewise, a lost WebSocket connection does not prove no usage happened. Track sessions with missing terminal telemetry as a separate completeness problem.

## Partition quantities without counting them twice

For a deployment with text and audio input meters, derive uncached quantities by subtracting cached quantities of the same modality. In the example above, the partitions are 200 uncached text, 100 cached text, 500 uncached audio, and 400 cached audio tokens.

Their sum is 1,200. Adding `input_tokens` to those four partitions would count the same input twice. Adding every response's `total_tokens` and then adding output tokens again creates a similar error.

A small application helper makes the subtraction rule explicit:

```python
def partition_input(total_by_modality, cached_by_modality):
    result = {}
    for modality, total in total_by_modality.items():
        cached = cached_by_modality.get(modality)
        if total is None or cached is None:
            result[modality] = None
            continue
        if not 0 <= cached <= total:
            raise ValueError(f"Invalid cached count for {modality}")
        result[modality] = {"uncached": total - cached, "cached": cached}
    return result

assert partition_input({"audio": 900}, {"audio": 400}) == {
    "audio": {"uncached": 500, "cached": 400}
}
```

Extend the mapping for image or other reported modalities when applicable. Preserve the total and check the partition against it; a residual can reveal an incomplete mapping rather than a billing error.

## Join meters before prices

Build an explicit table mapping deployment/model version, modality, direction, cache status, and effective date to Azure meter ID and unit. Normalize quantities to that meter's unit before multiplying by a rate. Keep rate source, currency, pricing date, and any negotiated terms alongside the result.

Reconcile separate services separately. Input transcription, other model calls, application hosting, and storage should not be forced into the response token equation merely because they belong to the same voice feature. Use the actual cost export to identify which charges exist.

Microsoft's [Foundry cost guide](https://learn.microsoft.com/en-us/azure/foundry/concepts/manage-costs) emphasizes consistent scope and reporting delays. Its [Cost Management data guidance](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data) also explains that costs remain estimated before invoicing. Compare the same resource, meter, currency, and usage period after allowing data to settle.

## Classify the remaining difference

Report telemetry-derived quantity, billed quantity, estimated cost, billed cost, and residual separately. Investigate duplicated events, missing sessions, conversation-history reuse, wrong deployment mapping, unrecognized modalities, delayed exports, and rate changes in that order.

For a reproducible test, isolate one deployment and run a short known session with no unrelated traffic. Preserve every event and the matching export rows. Expand to normal traffic only after the meter mapping works. A reconciled system explains each difference and leaves genuinely unresolved usage visible; it does not manufacture precision from an incomplete stream.
