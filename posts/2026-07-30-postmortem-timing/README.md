# When Should You Hold a Postmortem? Choosing a Deadline While Evidence Is Fresh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Blameless Postmortems, SRE, Incident Timeline, Reliability

Description: Separate immediate evidence capture from the review meeting and choose a risk-based deadline that preserves facts without exhausting responders.

---

Start preserving evidence during the incident, begin the write-up promptly after resolution, and normally hold the review within a few business days. Do not force exhausted responders into a meeting while service is still unstable, and do not wait for every uncertainty to disappear.

There is no universal deadline for every incident. A useful policy uses two clocks:

1. **Evidence and draft clock:** begins immediately.
2. **Review meeting clock:** begins after the incident is stable and key participants can prepare.

## Capture Facts Before the Meeting

Evidence freshness is not primarily a scheduling problem. A meeting three days later can use excellent evidence if the response preserved it; a meeting the next morning can still rely on guesswork if logs and decisions were lost.

During response, maintain:

- incident role and handoff log;
- timestamped decisions and hypotheses;
- alert and dashboard links;
- deployment, configuration, and feature-flag events;
- commands or automation session records where policy permits;
- status and stakeholder communications;
- mitigation and recovery actions;
- relevant log and trace retention holds; and
- open questions.

Use a common clock, normally UTC, and retain original timestamps and time-zone metadata. Do not edit the live response log into a polished causal narrative.

NIST's current incident-response guidance recommends recording investigative actions and preserving the integrity and provenance of records. Security, privacy, safety, and regulated incidents may require formal evidence handling and restricted access; coordinate with the appropriate specialists.

## Begin the Draft Promptly After Resolution

Google's incident-management guidance says the write-up is started immediately after resolution. Atlassian's published process creates the postmortem issue during or shortly after resolution.

Create the document and assign an owner as part of incident closure. Populate objective sections automatically:

- incident identifier and severity;
- start, detection, mitigation, and resolution times;
- affected services and declared impact;
- participants and response roles;
- event timeline from source systems;
- communication links; and
- existing follow-up work.

Automation reduces responder toil, but the generated timeline is evidence, not analysis. Participants must still check clock skew, duplicate events, missing context, and the difference between an event being emitted and someone observing it.

## Choose a Default Meeting Deadline

A practical internal policy is:

| Review type | Suggested meeting target |
| --- | --- |
| Major or high-potential incident | Within 2–3 business days after stability |
| Moderate or lightweight review | Within 5 business days |
| Complex specialist investigation | Preliminary learning review within 5 business days; follow-up when evidence permits |

These are recommended operating targets, not requirements from the cited sources. Choose values that fit your staffing, service criticality, and legal obligations.

Set a separate publication target, such as two business days after the review. Publication may require approval or redaction, but urgent corrective actions should enter the backlog before the final prose is perfect.

## Define When the Clock Starts

"Resolved" can be ambiguous. Start the review deadline when:

- customer impact has ended or reached an accepted stable state;
- immediate containment is complete;
- incident command agrees the response has moved out of active stabilization; and
- remaining work can proceed through normal change management.

If the incident reopens, pause and reset the review clock when stable again. Keep the original event chain linked rather than creating a misleading clean break.

For a long-running security investigation, restored service may precede confidence about scope. Hold a restricted preliminary review of response and known control gaps, clearly label hypotheses, and schedule an addendum.

## Give Responders Recovery Time

An incident that ends after an overnight response should not automatically produce a 09:00 review. Exhaustion reduces recall, patience, and psychological safety.

The postmortem owner should:

- wait until essential responders have completed handoff and rest;
- gather written context asynchronously;
- schedule around time zones;
- allow participants to correct the draft timeline before the meeting; and
- use a delegate or written statement if someone is unavailable.

Fresh evidence matters; forcing the meeting onto depleted people is not the only way to preserve it. A well-maintained incident log and prompt draft provide room for humane scheduling.

## Do Not Wait for Perfect Root Cause

Complex incidents rarely have one final root cause. Waiting weeks for certainty creates stale memory and delays obvious improvements.

At the first review, separate:

```text
Confirmed fact
Supported inference
Open hypothesis
Unknown
```

Create immediate actions for established gaps, such as missing detection or unsafe access. Assign investigation actions for open questions. Publish an addendum when new evidence changes the analysis.

Do not freeze a speculative explanation into the document merely to meet a deadline. Timely can still mean honest about uncertainty.

## Use a Preparation Checklist

Twenty-four hours before the meeting, the owner should confirm:

- impact statement has evidence;
- timeline sources are linked;
- key participants reviewed their decisions in context;
- sensitive data is access-controlled;
- factual conflicts and clock issues are marked;
- previous related incidents and actions are linked;
- preliminary contributing factors are hypotheses, not verdicts;
- a neutral facilitator is assigned; and
- the meeting has a decision maker able to prioritize actions.

If the checklist is incomplete, decide whether a short delay will materially improve the review. Record the reason and new date. Do not postpone simply because the document is not polished.

## Handle Different Incident Classes

### Customer-Facing Reliability Incident

Capture the operational timeline immediately, review within a few business days, and ship detection or mitigation actions quickly. Customer communication review can run in parallel.

### Security or Privacy Incident

Follow the incident-response plan, evidence-handling rules, disclosure duties, and counsel or privacy guidance. Maintain a restricted factual record and derive a separate shareable engineering lesson when possible.

### Safety-Critical Event

Do not let an engineering postmortem interfere with mandated reporting or investigation. Preserve evidence and use qualified safety processes.

### Recurring Low-Severity Incident

Batching several events into a thematic review may be more useful than separate meetings. Preserve each event's evidence and set a calendar deadline so batching does not become indefinite deferral.

### Near Miss

Review while the path and lucky conditions remain clear. Because service may never have been declared incident-affected, explicitly record when the near miss was discovered and who owns the review.

## Measure Timeliness Without Creating Theater

Track:

```text
draft latency = draft_created_at - stable_at
meeting latency = review_held_at - stable_at
publication latency = published_at - stable_at
```

Also track quality:

- timeline completeness;
- actions with owners, deadlines, and verification;
- overdue actions;
- participant-reported safety and usefulness;
- recurring factors; and
- material corrections after publication.

A same-day document with no useful analysis is not better than a careful review on day three. Conversely, a detailed postmortem published months later cannot protect the organization during the delay. Google’s SRE Workbook warns that delayed publication allows details to be forgotten and incidents to recur.

## A Practical Policy

Write the rule in plain language:

> The incident commander preserves the live record during response. At stability, the closing workflow assigns a postmortem owner and creates the draft. Major reviews are normally held within three business days and other required reviews within five. The owner may adjust the meeting for responder recovery, evidence handling, or specialist investigation, recording the reason and a new date. Confirmed urgent actions do not wait for publication.

This policy balances evidence freshness, responder health, and investigative honesty. The calendar matters, but the durable habit matters more: capture now, draft promptly, review soon, and continue learning as facts mature.

## Official Documentation

- [Google SRE: Incident Management Guide](https://sre.google/resources/practices-and-processes/incident-management-guide/)
- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [Atlassian Incident Management Handbook: Postmortems](https://www.atlassian.com/incident-management/handbook/postmortems)
- [NIST SP 800-61 Rev. 3: Incident Response Recommendations](https://csrc.nist.gov/pubs/sp/800/61/r3/final)
