# Join User Feedback and Task Completion to the Right LLM Trace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, LLM

Description: Connect delayed ratings and task-completion events to the exact generated response using durable response IDs, authenticated lookup, and feedback provenance.

A user gives an answer a thumbs-down ten minutes after generation. The browser still has the conversation ID, but that conversation contains eight answers, two retries, and a regenerated response. Attaching the rating to the latest trace can blame the wrong model call.

Create a durable identity for each displayed response and retain its relationship to the generating trace. Feedback should refer to that response, not whichever execution happens to be current when the event arrives.

## Persist the Response-to-Trace Mapping

Before returning an answer, store an application response ID, conversation ID, tenant ownership, generating trace ID, relevant run or span ID, creation time, and configuration version. The response ID should remain stable when the same answer is reloaded in the UI.

A regenerated answer receives a new response ID. Preserve the relationship to the earlier answer if the product needs comparison, but never overwrite the original generation mapping.

Store identifiers as distinct types or fields. An OpenTelemetry trace ID, a span ID, and a LangSmith run UUID are not interchangeable. LangSmith models a trace as a hierarchy of runs and supports feedback on root or child runs. [LangSmith observability concepts](https://docs.langchain.com/langsmith/observability-concepts), [Attach feedback](https://docs.langchain.com/langsmith/attach-user-feedback).

## Accept Feedback Through an Authorized Lookup

The browser submits the opaque response ID and the feedback value. The server authenticates the user, loads the response record under the correct tenant, and resolves the telemetry identifiers. Do not trust a client-supplied arbitrary trace ID as permission to annotate a record.

A minimal event envelope might look like this:

```json
{
  "event_id": "feedback-event-271",
  "response_id": "response-846",
  "kind": "helpfulness",
  "value": 0,
  "source": "user",
  "rubric_version": "thumbs-v1"
}
```

This is an application event, not a tracing vendor's API payload. Enforce allowed values and deduplicate the event ID in your database. Store free-text comments separately with the content policy appropriate to user submissions.

For LangSmith, a server-side delivery function can translate the stored mapping into a feedback call:

```python
from langsmith import Client


def send_helpfulness(client: Client, response_record, feedback_record):
    return client.create_feedback(
        run_id=response_record["langsmith_run_id"],
        key="helpfulness",
        score=feedback_record["score"],
        feedback_id=feedback_record["feedback_uuid"],
        source_info={"rubric_version": "thumbs-v1"},
    )
```

The record's feedback UUID should be persisted before delivery. Keep credentials on the server. LangSmith also documents presigned feedback tokens for scoped client submission when that approach fits the application. Check the documented behavior for duplicate IDs and retries; do not assume creation is a universal upsert. [Log user feedback using the SDK](https://docs.langchain.com/langsmith/attach-user-feedback).

## Use an Outbox for Reliable Delivery

Write the feedback event and an outbox row in the same application transaction. A background worker sends the annotation and marks the outbox row delivered. This prevents a temporary telemetry outage from losing a user's rating or blocking the product interaction.

Make retry handling explicit. If the destination reports an existing feedback ID, reconcile that result with the persisted event rather than generating a new ID and duplicating the rating. Keep delivery failure metrics and a bounded retry policy.

The application database remains the source of truth for feedback. Trace retention or vendor outages should not erase the only record that a customer reported an incorrect answer.

## Model Task Completion as a Separate Signal

A thumbs-up measures user feedback, not necessarily task completion. A copied code snippet, closed ticket, successful workflow action, or accepted edit can provide another signal, but each has its own interpretation.

Attach task-completion events to the response or workflow that plausibly caused them. Record event time, ingestion time, signal source, and attribution rule version. A ticket closed by a human after several assistant suggestions should not automatically credit the last generated answer.

For delayed outcomes, retain the application mapping long enough to support attribution even when detailed spans expire. If several answers contributed, represent that relationship explicitly instead of choosing a single trace for convenience.

Do not modify an ended OpenTelemetry span and expect the original export to change. Store feedback as a separate event or backend annotation keyed to the trace and response identity. Correlation does not require keeping the original span open for days.

## Keep Feedback and Evaluation Provenance

Separate user ratings, reviewer labels, deterministic checks, and model-judge scores. Use explicit keys and rubric versions so a score of zero means the same thing within a series. Record evaluator failures as unavailable, not as a negative judgment about the answer.

A low feedback rate creates selection bias: users who click a rating may differ from users who stay silent. Report rated response count and eligible response count alongside the helpfulness ratio. Absence of feedback is not positive feedback.

For quality investigations, compare the exact displayed answer with the generation record. Caching, formatting, moderation, and streaming assembly can change what the user saw after the model returned.

## Test Ambiguous Cases

Create two responses in one conversation, rate the first after generating the second, and confirm the first run receives the annotation. Test regeneration, a cached answer, duplicate browser delivery, cross-tenant access, and feedback arriving after trace expiry.

Then simulate a telemetry outage while accepting feedback. The outbox should retain the event, preserve its ID through retries, and eventually annotate the intended run once the destination is available.

## Conclusion

Persist an immutable response-to-trace mapping and resolve feedback through authorized server-side lookup. Durable events, explicit attribution, and rubric provenance keep delayed user signals attached to the answer that produced them.

## Official Documentation

- [LangSmith observability concepts](https://docs.langchain.com/langsmith/observability-concepts)
- [LangSmith feedback SDK and presigned tokens](https://docs.langchain.com/langsmith/attach-user-feedback)
- [OpenTelemetry Python span lifecycle](https://opentelemetry.io/docs/languages/python/instrumentation/)
