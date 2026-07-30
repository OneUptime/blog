# Reconstruct an Incident Timeline from Alerts, Logs, and Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Postmortem, Timeline, Slack, Observability, Deployment

Description: Reconstruct a defensible incident timeline by preserving source evidence, normalizing clocks, and separating observed events from later interpretation.

---

An incident timeline is not a transcript of the incident channel. It is an evidence-backed sequence that explains when impact began, what the system did, what responders could observe, which decisions followed, and how recovery was verified.

Slack, alerts, logs, traces, deployment systems, ticketing tools, and cloud audit records each preserve a different clock and viewpoint. The work is to reconcile them without creating false precision.

## Define Scope Before Collecting Data

Start with provisional boundaries:

- service and environments involved;
- earliest plausible contributing change;
- first possible user impact;
- detection;
- incident declaration;
- mitigation and recovery;
- post-recovery verification;
- relevant time zone, usually UTC.

Collect beyond the visible outage. AWS recommends beginning a correction-of-error timeline with the trigger, such as a bad deployment, rather than the notification.

Write the questions the timeline must answer:

- When did user impact actually begin and end?
- Which change or condition preceded it?
- When could the problem first have been detected?
- What did responders know before each decision?
- Which actions changed system state?
- What evidence proves recovery?

## Preserve Sources Before They Expire

Create an evidence inventory:

| Source | What it can establish | Common limitation |
| --- | --- | --- |
| Incident channel | Human observations, decisions, coordination | Edits, deletions, threads, shorthand, retention |
| Alert system | Firing, acknowledgment, routing, resolution | Alert time is not necessarily impact start |
| Logs | Component events and errors | Ingestion delay, sampling, clock skew |
| Traces | Request path and latency | Sampling and missing propagation |
| Metrics | Impact shape and recovery | Aggregation and scrape resolution |
| Deployment system | release, commit, environment, status | A successful job does not prove healthy behavior |
| Configuration or audit log | actor, request, object change | Control-plane time may differ from effect time |
| Status page and tickets | communication and user reports | Report time follows experience |
| Call recording or incident document | reasoning and role transitions | Access, transcription, and retention |

Save permitted evidence under the organization’s retention, privacy, and security rules. Do not copy secrets, customer data, or restricted messages into a broadly readable postmortem.

Slack’s official export documentation says export scope depends on plan and approval, retention affects what is available, and JSON exports can preserve timestamps and some edit history. Use authorized export or API access only; do not bypass workspace governance.

## Build an Evidence Ledger First

Before writing narrative, create rows like:

```text
event_id
source_system
source_record_id
original_timestamp
original_timezone
normalized_timestamp_utc
clock_uncertainty
observed_event
actor_or_component
evidence_link
confidence
notes
```

Keep the original timestamp. Normalization should add a field, not overwrite evidence.

Use stable source identifiers so another reviewer can reproduce the row. Preserve saved log queries and dashboard windows because live views may change as retention and late data change.

## Normalize Time Carefully

Common timestamp problems:

- local time without offset;
- daylight-saving transition;
- host clock skew;
- client time versus server receive time;
- log event time versus ingestion time;
- alert evaluation interval;
- dashboard aggregation;
- truncated seconds;
- asynchronous queue delay.

Convert to UTC while retaining the original representation:

```text
original:   2026-10-25 01:14:07 Europe/London
normalized: [requires explicit offset because the clock repeats]
```

Never guess the offset in an ambiguous daylight-saving hour. Use source metadata or label the uncertainty.

Estimate clock offsets using shared correlation points:

- request or trace ID seen in two systems;
- deployment ID in audit and workflow logs;
- message ID included in an alert;
- server receive time;
- database transaction record.

If a host appears 43 seconds behind a trusted clock, document the finding and uncertainty. Do not silently “fix” the raw log.

## Reconstruct Each Source

### Slack or another incident channel

Extract:

- first report;
- hypotheses;
- incident declaration;
- role assignments;
- decisions;
- commands or changes requested;
- verification statements;
- stakeholder updates.

Distinguish message send time from the time of the event being described:

```text
14:17 message: "Errors started about ten minutes ago."

observed:
  responder reported at 14:17

inferred:
  impact may have begun near 14:07
```

The 14:07 estimate needs metrics or logs before it becomes a factual impact boundary.

Slack exports show messages in send order with timestamps; edit and deletion visibility depends on export options and retention. Note when the record is incomplete.

### Alerts

Capture:

- underlying condition window;
- evaluation time;
- pending duration;
- firing time;
- notification delivery;
- acknowledgment;
- resolution.

An alert that fired at 14:12 after a five-minute `for` period does not show impact began at 14:12.

### Logs, metrics, and traces

Use saved queries and record:

- event time field selected;
- time window;
- filters;
- aggregation;
- sampling;
- known ingestion lag;
- result or snapshot.

Prefer a request, trace, job, workflow, deployment, or incident identifier for correlation. Do not infer a causal link from two lines occurring close together without additional evidence.

### Deployments and configuration

Record:

- commit and artifact;
- target environment;
- deployment start and completion;
- progressive rollout stages;
- health checks;
- rollback or roll-forward;
- feature-flag and configuration changes;
- approver or automation identity where relevant.

GitHub’s deployment history, for example, can expose environments, commits, workflow logs, deployment URLs, pull requests or branches where available, and deployment status. Other systems need an equivalent evidence set.

“Deployment succeeded” normally means the delivery system completed its criteria; it does not prove no incident followed.

### Tickets and user reports

Record when the user experienced the problem if stated, separately from ticket creation. Deduplicate related tickets and protect customer identity.

## Merge and Deduplicate

Sort normalized evidence, then collapse records that describe the same event:

```text
deployment controller: rollout completed
GitHub deployment: status success
Slack bot: deployment succeeded
```

These may be three observations of one logical event. Preserve multiple evidence links in one timeline row rather than counting three actions.

Use two levels:

1. **Evidence ledger:** detailed, reviewable source observations.
2. **Postmortem timeline:** critical events that explain impact and decisions.

The final timeline should not contain every log line.

## Separate Fact from Interpretation

Use explicit language:

| Type | Example |
| --- | --- |
| Fact | At 14:03:12 UTC, deployment `d-1842` shifted 10% of traffic to version `abc123` |
| Fact | At 14:04 UTC, the five-minute error-rate window began exceeding 8% |
| Inference | The new version likely caused the error increase |
| Supported conclusion | Requests routed to `abc123` failed while the control version remained healthy |
| Unknown | Why the canary check did not stop promotion |

Chronology supports hypotheses; it does not establish causality on its own.

## Include Information Available at the Time

For each major decision, add:

- observation available;
- current hypothesis;
- action selected;
- alternatives considered if recorded;
- outcome.

Example:

| Time UTC | Event | Information available then | Evidence |
| --- | --- | --- | --- |
| 14:12 | Incident declared | Checkout error alert firing; deployment had completed nine minutes earlier | Alert `A-77`, deployment `d-1842` |
| 14:16 | Rollback initiated | Errors concentrated on new version; database health normal | Trace query, incident message |
| 14:21 | Traffic restored | Error SLI returned below threshold for three windows | SLI dashboard |

This prevents hindsight knowledge from making earlier choices look irrational.

## Resolve Gaps Without Filling Them with Memory

When evidence is missing:

- interview responders separately;
- ask for approximate ranges rather than exact seconds;
- compare independent accounts;
- label recollection;
- retain competing versions;
- create an investigation action if the gap affects analysis.

Use:

> Between 14:22 and 14:31 UTC, the exact start of the configuration reload is unknown. Audit logs show completion at 14:31; two responders recall initiating it shortly after 14:25.

Do not choose 14:26 because it makes the story tidy.

## Validate the Timeline

Ask:

- Does it begin with the earliest relevant trigger or condition?
- Are user impact and internal detection separate?
- Is one time zone used consistently?
- Are original timestamps preserved?
- Does each critical row link to evidence?
- Are aggregation, sampling, and clock limits known?
- Are Slack statements treated as observations, not automatically system facts?
- Are major decisions shown with contemporaneous information?
- Is recovery proven by user-relevant evidence?
- Are facts, inferences, and unknowns labeled?
- Can an uninvolved reviewer reproduce key claims?

Google’s example postmortem recommends building from the incident-state timeline and supplementing it with logs, graphs, messaging records, and other relevant evidence. PagerDuty likewise recommends data links for key timestamps.

## Improve the Next Incident

Timeline reconstruction often reveals instrumentation actions:

- synchronize clocks;
- propagate trace and deployment identifiers;
- post structured deployment and flag events to incident tooling;
- preserve incident-channel and call records under policy;
- automate incident role and decision capture;
- link alerts to saved queries;
- record user-impact start independently of alert time;
- make recovery verification explicit.

A defensible timeline does not pretend every second is known. It preserves sources, makes clock assumptions visible, and reconstructs what the system and responders did with enough evidence that another person can challenge and learn from it.

## Official Documentation

- [AWS: Why you should develop a Correction of Error](https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/)
- [Google SRE: Example Postmortem](https://sre.google/sre-book/example-postmortem/)
- [PagerDuty: Postmortem Process](https://response.pagerduty.com/after/post_mortem_process/)
- [Slack: How to read Slack data exports](https://slack.com/help/articles/220556107-How-to-read-Slack-data-exports)
- [GitHub Docs: Viewing deployment history](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/view-deployment-history)
