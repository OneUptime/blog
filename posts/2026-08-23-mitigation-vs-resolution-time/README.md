# Tracking Mitigation Time Separately from Permanent Resolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Mitigation, Incident Response, Remediation, SRE

Description: Separate fast harm reduction and service restoration from root-cause remediation so one MTTR number does not hide unfinished risk.

---

During an incident, the right first action is often a reversible workaround: roll back a release, disable a feature, shed load, fail over, or block a harmful operation. That can end customer impact long before the defect is understood and permanently corrected. Measuring mitigation and permanent resolution separately rewards rapid safety while preserving accountability for residual risk.

## Define Four Different Endpoints

Use explicit milestones:

| Milestone | Meaning |
| --- | --- |
| Mitigated | Immediate harm has been materially reduced or stopped |
| Service restored | The scoped user-facing service condition satisfies its SLI and stability rule |
| Permanently resolved | The accepted corrective change removes the incident's known trigger or unsafe temporary condition |
| Follow-up complete | Required preventive, testing, documentation, and governance actions are done |

These milestones may coincide, but usually do not. A failover can restore the SLI while the primary remains broken. A rollback can restore service while the forward version still contains the defect. A permanent code fix can ship before every postmortem action is complete.

## Calculate Named Durations

For incident \(i\), retain:

\[
T_{mitigate}=t_{mitigated}-t_{impact\ start}
\]

\[
T_{restore}=t_{restored}-t_{impact\ start}
\]

\[
T_{permanent}=t_{permanent\ resolution}-t_{impact\ start}
\]

\[
T_{residual}=t_{permanent\ resolution}-t_{restored}
\]

Call each by name. `MTTR` alone is ambiguous: some teams use its final R for repair, recovery, restore, or resolve.

If mitigation occurs before impact fully ends, that is expected. The difference between mitigation and restoration can measure propagation delay, cache expiry, failover convergence, or backlog drain.

## Make Mitigation Verifiable

A responder action is not automatically an effective mitigation. Record:

```text
mitigation_action_started_at
mitigation_action_completed_at
mitigation_effect_observed_at
mitigation_evidence
affected_scope_before
affected_scope_after
```

Stop the mitigation clock at the first sustained evidence that the declared harm threshold was reduced, not when someone typed a command. If a rollback completes at 10:12 but the error ratio falls at 10:16, both times are useful; the effect time is the stronger operational endpoint.

Define the threshold in advance. `Materially reduced` might mean irreversible writes are blocked and at least 90 percent of eligible requests succeed. The full restoration rule might require 99.9 percent plus acceptable latency for ten minutes.

## Track Temporary Risk as a First-Class State

When service is restored through a workaround, create a linked remediation record with:

- workaround and rollback procedure;
- owner and due date;
- remaining failure modes and blast radius;
- reduced capacity, redundancy, or security controls;
- monitoring required while temporary state remains;
- evidence needed for permanent-resolution approval.

Do not keep the incident operationally active solely to keep remediation visible. That inflates customer recovery time and encourages premature closure. Close the impact clock when the service definition is met, while a separate durable work item tracks residual risk.

Conversely, do not mark permanent resolution merely because the ticket moved to Done. Require evidence such as a deployed fix, validated configuration, rebuilt redundancy, completed data repair, or accepted architectural control.

## Worked Example

A database schema change causes write failures at 09:00. Monitoring detects the issue at 09:03. Responders disable writes for the affected feature at 09:10, stopping corrupt attempts. They roll back at 09:18, the SLI stabilizes at 09:25, and a corrected migration with a regression test deploys two days later.

The useful measures are:

| Measure | Duration |
| --- | ---: |
| Impact to mitigation | 10 minutes |
| Impact to service restoration | 25 minutes |
| Degraded tail after mitigation | 15 minutes |
| Impact to permanent resolution | About 2 days |

Calling the event a 25-minute permanent repair would hide two days of exposure. Calling it a two-day customer recovery would hide the successful rollback.

## Model the Lifecycle Without Forcing It into One Status

An incident system can retain state transitions, while linked remediation work has its own workflow:

```text
incident: declared -> acknowledged -> mitigated -> restored -> resolved
remediation: proposed -> accepted -> implementing -> verified -> complete
```

OneUptime records incident state timelines and separates description, root cause, remediation, runbooks, and postmortem information. Jira changelogs can provide transition evidence for linked remediation issues. Keep cross-system IDs so the residual interval is auditable.

A remediation may address several incidents, and one incident may need several corrective actions. Use a many-to-many link rather than pretending there is always one permanent-fix ticket.

## Report Both Speed and Durability

For incident-response improvement, publish:

- median and p90 impact-to-mitigation;
- median and p90 impact-to-restoration;
- percentage restored through rollback, failover, or feature disablement;
- number and age of open temporary remediations;
- recurrence while the same workaround remained in place;
- follow-up completion rate by risk class.

A falling mitigation time with a growing residual-risk backlog is not a complete improvement. Neither is a pristine remediation queue paired with slow user recovery.

Google SRE postmortem guidance treats incident response, contributing causes, and preventive action as related but distinct work. It emphasizes effective follow-up rather than blaming responders. Use the measures to improve authority, rollback safety, observability, and engineering controls.

## Official Documentation

- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Google SRE Workbook: Incident Response](https://sre.google/workbook/incident-response/)
- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)
- [OneUptime incident states and timelines](https://oneuptime.com/docs/en/incidents/states-and-severities)

## Conclusion

Fast mitigation and durable repair are both valuable, but they answer different questions. Record when harm was reduced, when the SLI was restored, when temporary risk ended, and when follow-up finished. Separate clocks let teams move quickly during the incident without losing the work required to prevent recurrence.
