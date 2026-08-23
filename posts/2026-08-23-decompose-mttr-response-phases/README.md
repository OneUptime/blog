# Decomposing MTTR into Actionable Response Phases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Incident Response, MTTA, SRE, Incident Analytics

Description: Break recovery into detection, acknowledgment, assembly, diagnosis, and mitigation milestones while accounting for parallel work and handoffs.

---

A 70-minute recovery duration does not say whether the delay came from monitoring, paging, access, diagnosis, decision-making, or mitigation execution. Decomposing the timeline turns an outcome metric into a map of response constraints. The decomposition must respect parallel work: not every labeled phase can be added as if responders worked in a single sequence.

## Define Observable Milestones

Use event definitions that can be audited:

| Event | Operational definition |
| --- | --- |
| Impact start | Defined SLI or service condition first fails |
| Detection | Monitoring or a person first identifies the condition |
| Page | Notification provider accepts or sends the page |
| Acknowledgment | A responder explicitly accepts ownership |
| Assembly | Required incident roles are active and have joined the response |
| Diagnosis achieved | Responders identify a tested recovery path or sufficiently narrow hypothesis |
| Mitigation start | The selected harm-reduction action begins |
| Mitigation effective | Evidence shows harm has materially reduced |
| Restoration | The service meets its scoped SLI and stability condition |

`Diagnosis achieved` needs care because understanding develops gradually. Define it as the timestamp of a recorded decision to execute a specific recovery action, with the evidence or incident-log entry attached. Do not reconstruct it from memory merely to fill a field.

## Calculate Boundary Durations

Useful elapsed intervals include:

\[
T_{detect}=t_{detected}-t_{impact}
\]

\[
T_{ack}=t_{acknowledged}-t_{page}
\]

\[
T_{assemble}=t_{assembled}-t_{acknowledged}
\]

\[
T_{decision}=t_{recovery\ decision}-t_{acknowledged}
\]

\[
T_{execute}=t_{mitigation\ effective}-t_{mitigation\ start}
\]

\[
T_{stabilize}=t_{restored}-t_{mitigation\ effective}
\]

Detection delay plus the elapsed period from detection to restoration can reconstruct impact-to-restoration when boundaries align. Acknowledgment, assembly, and diagnosis often overlap, so summing each independently can exceed total recovery time.

## Distinguish Milestone Elapsed Time from Exclusive Phases

For management reporting, milestone elapsed times are robust: time from impact to detection, impact to acknowledgment, impact to effective mitigation, and impact to restoration. They answer how far the response had progressed by each point.

For exclusive decomposition, build non-overlapping intervals from ordered boundary events and assign each interval to the dominant blocking state. If one engineer diagnoses while another obtains access, causality is not simply the sum of both work durations. A postmortem can identify the critical path, such as waiting for database credentials, without pretending parallel diagnosis did not happen.

Represent responder activities separately:

```text
activity_id, incident_id, activity_type,
started_at, ended_at, actor_role, blocking, evidence_uri
```

This supports a Gantt-style review and calculation of responder-hours, while milestone clocks remain stable.

## Worked Timeline

| Event | UTC | Elapsed from impact |
| --- | ---: | ---: |
| Impact starts | 10:00 | 0 min |
| Alert detects | 10:04 | 4 min |
| Page sent | 10:05 | 5 min |
| Acknowledged | 10:08 | 8 min |
| Database specialist joins | 10:15 | 15 min |
| Rollback chosen | 10:29 | 29 min |
| Rollback starts | 10:31 | 31 min |
| Harm materially reduced | 10:39 | 39 min |
| SLI stable | 10:47 | 47 min |

Detection delay is four minutes, page-to-acknowledgment is three, acknowledgment-to-required assembly is seven, action execution is eight, and stabilization is eight. The 21 minutes from acknowledgment to rollback decision includes assembly and parallel diagnosis; it should not be added to a separate overlapping diagnosis interval.

## Collect Events from Systems of Record

Use observability for impact and SLI recovery, PagerDuty log entries for trigger and acknowledgment, incident-command automation for role assembly and decisions, deployment or runbook logs for mitigation execution, and a state timeline for formal lifecycle changes.

Slack messages can support a decision timestamp when a bot writes a structured marker, but free-form conversation is not a reliable state machine. Jira closure is evidence of workflow completion, not detection or service restoration.

Store occurrence, observation, ingestion, source event ID, and corrections. Backfilled impact starts should not overwrite real-time detection timestamps.

## Aggregate Each Phase Responsibly

For each milestone interval publish count, median, p75 or p90, maximum, and missing-field coverage. Segment by service, severity, failure mode, alert source, and time of day only when sample size supports it. Keep the full incident distribution and named outliers.

Do not calculate a phase duration when either boundary is missing by substituting incident declaration or closure. This changes the phase definition and biases comparisons. Show the missing count and fix instrumentation.

For open incidents, milestone observations that have already occurred are valid, but final restoration remains censored. Keep open-event operational views separate from completed recovery distributions.

## Map Delays to Interventions

Different tails suggest different investments:

- Long detection: improve SLIs, coverage, or burn-rate alerting.
- Long page-to-acknowledgment: review on-call routing, notification delivery, and staffing.
- Long assembly: preassign roles, clarify escalation, and automate incident channels.
- Long decision interval: improve telemetry, ownership, dependency maps, and diagnostic runbooks.
- Long execution: build safe rollback, failover, feature controls, or access paths.
- Long stabilization: address propagation, backlog, data repair, and verification design.

Test changes against comparable incident cohorts. A new runbook cannot plausibly explain lower detection delay if it only begins after acknowledgment.

Use phase data for system improvement, not individual ranking. Google SRE's incident-management guidance establishes clear roles and a coordinated response, while its postmortem guidance is explicitly blameless.

## Official Documentation

- [Google SRE Workbook: Incident Response](https://sre.google/workbook/incident-response/)
- [Google SRE Book: Managing Incidents](https://sre.google/sre-book/managing-incidents/)
- [Google SRE Book: Emergency Response](https://sre.google/sre-book/emergency-response/)
- [PagerDuty API reference](https://developer.pagerduty.com/api-reference/)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)

## Conclusion

Decompose recovery into evidence-backed milestones and distinguish elapsed milestones from overlapping responder activities. That prevents double counting and directs investment toward detection, paging, assembly, diagnosis, execution, or stabilization. The decomposition should explain the system, not grade the person carrying the pager.
