# Auditing Incident Timestamps Before Calculating MTTR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Data Quality, Time Zones, Incident Timeline, SRE

Description: Detect missing, backfilled, duplicated, and clock-skewed incident events before timestamp defects become misleading recovery trends.

---

MTTR is a subtraction of timestamps, so timestamp quality is metric quality. A clean-looking average can be wrong because local times crossed daylight-saving transitions, a responder backfilled impact start, one source clock drifted, or missing restoration events selectively removed the hardest incidents. Audit the event data before calculating any aggregate.

## Preserve Four Forms of Time

For every source event, retain:

```text
source_time_text
source_time_zone_or_offset
occurred_at_utc
observed_at_utc
ingested_at_utc
recorded_at_utc
```

`occurred_at` represents the action or condition. `observed_at` records when a monitoring or workflow system saw it. `ingested_at` records arrival in the analytics pipeline. `recorded_at` records when a person entered or corrected it. These may legitimately differ.

Store normalized instants in UTC, but retain the original string and offset for audit. A zone name such as `Europe/London` contains daylight-saving rules; an abbreviation such as `BST` can be ambiguous outside local context. A local timestamp with no offset is incomplete evidence.

## Make Daylight-Saving Ambiguity Visible

When clocks fall back, a local time such as 01:30 may occur twice. When clocks move forward, some local times do not exist. Do not guess based on row order. Require the source's UTC offset or an unambiguous instant, and quarantine legacy values that cannot be resolved.

For display, convert from the stored UTC instant into the viewer's zone. For arithmetic, subtract instants, not formatted wall-clock strings. A recovery across a daylight-saving change can have a correct 90-minute elapsed duration even when the local clock labels appear only 30 minutes apart.

## Test Event Semantics, Not One Rigid Order

Some ordering constraints are universal:

- an impact window end must be later than its start;
- a source update cannot precede that source object's creation unless the source explicitly backdates it;
- an ingestion time materially before source occurrence needs investigation;
- a completed duration cannot be negative.

Other sequences are not errors. Impact often starts before detection; mitigation may start before formal declaration; restoration can occur before administrative resolution. Encode checks around your event definitions rather than assuming a single ticket workflow.

Example audit query:

```sql
SELECT
  incident_id,
  declared_at,
  impact_started_at,
  detected_at,
  restored_at,
  resolved_at,
  CASE
    WHEN impact_started_at IS NULL THEN 'missing_impact_start'
    WHEN restored_at < impact_started_at THEN 'negative_impact_duration'
    WHEN detected_at IS NULL THEN 'missing_detection'
    WHEN restored_at IS NULL THEN 'missing_restoration'
    WHEN resolved_at < detected_at THEN 'resolution_before_detection'
  END AS audit_failure
FROM incident_facts
WHERE declared_at >= :period_start
  AND declared_at < :period_end;
```

Select the audit cohort with a required record timestamp such as `declared_at`. Filtering on `impact_started_at` would remove incidents with missing impact starts before the audit could flag them. Keep warnings separate from hard failures. For example, a 30-day duration is suspicious but possible; it should enter review, not vanish automatically.

## Detect Backfills and Late Arrivals

A responder may learn at 11:00 that logs show impact began at 10:42. Record 10:42 as `occurred_at`, 11:00 as `recorded_at`, the evidence reference, author, reason, and prior value. Backfilling can improve customer-impact measurement, but silently overwriting the timestamp destroys lineage.

Measure end-to-end event lateness:

\[
L_{end\text{-}to\text{-}end}=ingested\_at-occurred\_at
\]

This includes the delay between occurrence and source observation as well as pipeline transport. To isolate pipeline latency when `observed_at` represents the source's recorded instant, calculate:

\[
L_{pipeline}=ingested\_at-observed\_at
\]

Plot both distributions by source. A sudden rise in pipeline latency can indicate webhook failure, API pagination gaps, queue lag, or rate limiting. Reconcile a trailing window after each reporting period, then freeze a snapshot at a declared as-of time.

Do not regenerate last month's executive number indefinitely without an annotation. Publish whether reports are preliminary, reconciled, or frozen.

## Look for Clock Skew

Cross-source comparisons assume synchronized clocks. Estimate skew using events observed by two systems, such as a deployment ID written by the deployment platform and received by the observability system. Large consistent offsets suggest source-clock or parsing problems.

Keep both values and correct at the source when possible. If analytics applies a skew correction, store the model, offset, confidence, affected interval, and uncorrected instant. Do not apply one global correction to hosts with different clocks.

Modern SaaS APIs generally return offset-bearing or UTC timestamps, but exported CSVs, human-entered fields, and copied chat text may not. Treat the API field as stronger timing evidence than a timestamp embedded in prose.

## Audit Missingness as a Cohort Problem

Count missing fields by service, severity, source, incident state, and period. Missing restoration timestamps are rarely random: long or complex incidents may be left open, and very short auto-resolved events may bypass a manual field. A completed-only mean can therefore be biased in either direction.

Show this funnel:

| Stage | Count |
| --- | ---: |
| Eligible incidents | 64 |
| Has impact start | 57 |
| Has restoration | 51 |
| Passes ordering checks | 49 |
| Included in duration aggregate | 49 |

Keep open incidents as right-censored records with current age. Do not substitute the report cutoff as their final restoration. Keep unknown timestamps as null; replacing them with declaration or resolution changes the definition.

## Find Duplicates and Conflicting Events

Webhook retries and API re-reads can duplicate lifecycle events. Deduplicate using the source system and immutable source event ID. If no ID exists, create a fingerprint from stable source fields, but retain collision diagnostics.

Two restoration events may represent different impact windows, a correction, or a duplicate. Do not simply take the minimum or maximum until an episode policy has classified them. Validate that merged windows no longer overlap and that every correction references the event it supersedes.

## Build an Audit Status, Not a Delete Filter

Give each incident a status such as:

```text
valid
valid_with_warning
needs_review
open_or_censored
excluded_by_policy
```

Attach reason codes and reviewer decisions. A dashboard can calculate the primary distribution from `valid` and approved warning rows while still showing everything excluded. Manual fixes should be reviewed and versioned.

Set automated tests for parsing, units, precision, and boundaries. Seconds interpreted as milliseconds can create dates decades away; truncated minute precision can make short incidents appear zero-length. Compare plausible duration ranges without declaring rare long incidents impossible.

OneUptime's incident state timeline records starts, ends, and duration for state transitions. Jira changelogs, PagerDuty log entries, Slack message timestamps, and observability events have their own semantics. Normalize them, but preserve the original evidence and never let a later tool timestamp retroactively become the customer-impact start without a documented rule.

## Official Documentation

- [Jira Cloud REST API v3 introduction and timestamps](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Slack conversations.history](https://api.slack.com/methods/conversations.history)
- [PagerDuty API reference](https://developer.pagerduty.com/api-reference/)
- [OneUptime incident states and timelines](https://oneuptime.com/docs/en/incidents/states-and-severities)
- [Prometheus querying basics and time](https://prometheus.io/docs/prometheus/latest/querying/basics/)

## Conclusion

Reliable MTTR starts with UTC instants, preserved source values, explicit occurrence and recording times, and visible missingness. Test semantic ordering, detect skew and late arrivals, deduplicate by source ID, and audit corrections. A trustworthy report shows how many incidents failed these checks instead of quietly deleting them.
