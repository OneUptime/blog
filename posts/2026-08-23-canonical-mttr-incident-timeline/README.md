# Building a Canonical MTTR Timeline Across Incident Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, PagerDuty, Jira, Slack, Observability, Incident Timeline

Description: Normalize PagerDuty, Jira, Slack, and observability events into an auditable timeline without confusing workflow timestamps with service impact.

---

PagerDuty knows when an incident changed status. Jira knows when fields and workflow states changed. Slack knows when messages were posted. Observability systems know when measured service behavior changed. A canonical MTTR timeline preserves all of these facts without pretending they have equal meaning.

This is a design for continuous warehouse ingestion, versioned source-to-canonical mappings, and repeatable derivation of MTTR facts. For a one-off forensic workflow that collects evidence and reconstructs a postmortem chronology, see [Reconstruct an Incident Timeline from Alerts, Logs, and Deployments](../2026-07-30-reconstruct-incident-timeline/README.md).

## Create a Source-Neutral Event Schema

Use an append-only event table:

```text
canonical_event_id
incident_id
source_system
source_object_id
source_event_id
event_type
occurred_at
observed_at
ingested_at
actor_type
actor_id
payload_uri
payload_hash
confidence
mapping_policy_version
mapping_status
supersedes_event_id
```

`occurred_at` is when the represented action or condition happened. `observed_at` is when the source noticed or recorded it. `ingested_at` is when the warehouse received it. Keeping all three makes detection delay and pipeline delay measurable and prevents a backfilled timestamp from masquerading as a real-time observation.

`mapping_policy_version` identifies the transformation contract, while `mapping_status` distinguishes candidate, approved, and rejected interpretations. Derive governed MTTR facts only from approved mappings for the selected version.

Use `(source_system, source_event_id)` as an idempotency key. Preserve the raw payload in access-controlled storage and hash it so transformations are auditable. Do not update old events in place; add a correction that supersedes the prior interpretation.

## Map Source Events Without Losing Semantics

### PagerDuty

The REST API exposes incidents and per-incident log entries. Ingest triggered, acknowledged, reassigned, escalated, and resolved events with their source IDs and timestamps. A PagerDuty resolution is an incident-workflow fact. It can support `resolved_at`, but it is not proof of `restored_at` unless your measurement policy explicitly equates them and validates that assumption.

### Jira

Jira Cloud REST API v3 provides issue changelogs. Ingest status, severity, assignee, and relevant custom-field changes. Use the changelog history creation time for the transition, not the issue's latest `updated` timestamp. Workflow transitions are valuable for permanent-resolution and follow-up clocks; they rarely establish the first moment of customer impact.

### Slack

Slack's `conversations.history` returns messages whose `ts` identifies the message in a conversation. Capture explicit structured markers, such as bot messages containing an incident ID and action type. A person writing `service looks good` is evidence for review, not a machine-verifiable restoration event.

Slack history retrieval is paginated and bounded by token scopes and conversation access. Save the channel ID, message timestamp, thread timestamp, edited timestamp when present, and a permalink or stable reference. Edits must not silently rewrite the earlier event interpretation.

### Observability

Ingest alert state, SLI breach, deployment, feature-flag, rollback, and health events from their primary systems. For recovery, derive a scoped SLI condition plus a stability window. Keep the first healthy observation and the time at which the stability condition completed.

## Use a Controlled Canonical Vocabulary

Do not force every source value directly into an MTTR column. Normalize into event types such as:

```text
impact_started
detected
incident_declared
acknowledged
responder_assembled
mitigation_started
mitigation_completed
candidate_restoration
restoration_confirmed
incident_resolved
ticket_closed
incident_reopened
```

Keep the source-specific subtype beside it. Mapping rules must be versioned. For example, PagerDuty `acknowledged` can map to canonical `acknowledged`, while a Jira transition to Done should map to `ticket_closed`, not `restoration_confirmed`.

## Correlate Objects Explicitly

Build a bridge table rather than matching titles:

```text
incident_id, source_system, source_object_id,
relationship_type, linked_at, linked_by, confidence
```

Propagate a canonical incident ID into PagerDuty custom details, Jira fields, Slack channel topics or bot metadata, deployment annotations, and observability labels. When that is impossible, use a reviewed correlation based on service, time overlap, change ID, and responders. Title similarity alone creates false joins.

One source object may link to multiple canonical incidents, and one canonical incident may contain many alerts. Store relationship types such as `triggered`, `tracks`, `discussion_for`, and `evidence_for` rather than assuming one-to-one identity.

## Establish Evidence Precedence

When sources disagree, apply a documented precedence by event type:

- Use SLI or customer-impact telemetry for impact start and restoration when coverage is adequate.
- Use paging system log entries for page, acknowledgment, escalation, and assignment.
- Use deployment and feature-flag systems for change execution.
- Use incident-command markers for declared mitigation decisions.
- Use Jira workflow for permanent-fix and administrative completion.
- Use Slack as supporting context unless a bot writes a structured event from the system of record.

Precedence is not about one tool being generally better. It matches evidence to the fact the tool directly observes.

## Derive Clocks in a Separate Layer

After ingestion and normalization, build a versioned incident fact:

```sql
WITH active_events AS (
  SELECT e.*
  FROM canonical_incident_events AS e
  WHERE e.mapping_policy_version = :mapping_version
    AND e.mapping_status = 'approved'
    AND NOT EXISTS (
      SELECT 1
      FROM canonical_incident_events AS replacement
      WHERE replacement.supersedes_event_id = e.canonical_event_id
        AND replacement.mapping_policy_version = :mapping_version
        AND replacement.mapping_status = 'approved'
    )
)
SELECT
  incident_id,
  MIN(occurred_at) FILTER (WHERE event_type = 'impact_started')
    AS impact_started_at,
  MIN(occurred_at) FILTER (WHERE event_type = 'detected')
    AS detected_at,
  MIN(occurred_at) FILTER (WHERE event_type = 'acknowledged')
    AS acknowledged_at,
  MIN(occurred_at) FILTER (WHERE event_type = 'mitigation_completed')
    AS mitigated_at,
  MAX(occurred_at) FILTER (WHERE event_type = 'restoration_confirmed')
    AS restored_at
FROM active_events
GROUP BY incident_id;
```

The correct choice may be more complex for multiple impact windows; the example illustrates separation between raw events and derived clocks. Store which canonical event IDs produced each fact.

## Audit Time and Data Quality

Normalize instants to UTC while retaining the source offset and original text. Reject impossible sequences, but allow legitimate delayed detection in which impact predates declaration. Flag source clock skew, late arrivals, missing pagination, revoked Slack access, Jira changelog truncation, and duplicated webhooks.

At report cutoff, rerun a reconciliation window so late source events arrive. Freeze a report snapshot with its query and mapping versions. Historical results can then be reproduced even after mappings improve.

OneUptime provides incident state timelines and an append-only incident feed, and its API can expose incident records. These are useful inputs when OneUptime is part of the stack; apply the same source-specific mapping discipline.

## Official Documentation

- [PagerDuty API reference](https://developer.pagerduty.com/api-reference/)
- [Jira Cloud issue REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)
- [Slack conversations.history](https://api.slack.com/methods/conversations.history)
- [Slack message event](https://api.slack.com/events/message)
- [OneUptime API reference](https://oneuptime.com/docs/en/api-reference/api-reference)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)

## Conclusion

A continuously maintained canonical timeline should preserve source meaning, provenance, and multiple notions of time. Correlate objects with explicit IDs, apply versioned and reviewable source mappings, retain superseding corrections, and derive MTTR facts in a separate reproducible layer. The result supports repeatable reporting across tools without turning a one-off postmortem chronology, chat message, or closed ticket into an ungoverned recovery clock.
