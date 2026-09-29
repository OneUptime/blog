# How to Assign and Revise Incident Severity When Impact Is Uncertain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Incident Management, SRE, Reliability

Description: Assign a provisional incident severity from observed impact and credible uncertainty, then revise it with evidence, named ownership, and a preserved decision history.

An alert says checkout is failing, but the regional dashboard is delayed and support has only two reports. Waiting for a precise customer count leaves responders without a response level. Calling the entire service down turns an uncertainty into an unsupported fact.

Use a provisional severity with an explicit statement of what is known, what remains unknown, and when the decision will be reviewed. Severity selects the response needed now; the incident record preserves how that decision changed.

PagerDuty's published process recommends treating an ambiguous severity as the higher plausible level and reviewing afterward. Its specific levels belong to its organization. The workflow below is a proposed adaptation for teams that need to reassess severity as evidence arrives. [PagerDuty severity guidance](https://response.pagerduty.com/before/severity_levels/)

## Separate Impact from Confidence

An incident assessment should have independent fields:

```text
Observed impact: checkout submission fails in eu-west checkout cell 3
Known affected scope: synthetic journey plus two customer reports
Unknown scope: other cells; aggregate dashboard delayed by six minutes
Credible wider impact: all customers assigned to cell 3
Current severity: SEV-2, provisional under our impact matrix
Confidence in scope: low
Decision owner: incident commander
Next scope review: 14:15 UTC
```

Low confidence does not mean low severity. One verified report of an irreversible failure can demand an urgent response. Conversely, a low-confidence hypothesis that every region is affected should not be communicated as a confirmed global outage.

Keep severity separate from the response phase. An incident can remain severe while a mitigation is being verified. It can also be well understood and still highly damaging.

## Use a Short Decision Sequence

Before an incident, define severity against the customer journeys and failure modes that matter to your organization. Include data integrity, duration, affected cohorts, critical deadlines, and the availability of a usable workaround. Avoid a universal rule that a single customer's outage is always minor.

During triage, apply that matrix in this order:

1. Identify direct observations and their sources.
2. Determine the worst impact already supported by those observations.
3. List plausible additional scope and the specific reason it is plausible.
4. Choose the response level that covers that credible uncertainty.
5. Assign someone to test the highest-value unknown.

“Other regions might also be affected because the failing identity dependency is global” is actionable uncertainty. “Anything might be down” is not a scope assessment.

Set a short initial review interval, such as ten minutes, as a local operating choice. Also review immediately when strong new evidence changes the response required; do not wait for the timer.

## State the Response the Severity Activates

A severity label is useful only when it changes behavior. Maintain a local mapping such as:

| Response requirement | Example for a major incident |
| --- | --- |
| Staffing | Commander and relevant operations responder |
| Customer communication | Initial impact statement and scheduled updates |
| Scope investigation | Named owner for regions and affected journeys |
| Change coordination | Record every mitigation and its outcome |
| Escalation | Backup route if required expertise does not acknowledge |

The table is a template, not a vendor-mandated policy. Response times and participants should come from your own coverage and service commitments.

Google's incident response guidance emphasizes explicit command, defined roles, and a working record. Those practices let severity changes become coordinated actions instead of competing opinions in chat. [Google incident response](https://sre.google/workbook/incident-response/)

## Upgrade Immediately; Downgrade Deliberately

Suppose the initial issue appears confined to cell 3. At 14:12, payment reconciliation shows orders being accepted twice. That new failure mode can justify escalation regardless of the number of reports. Record both the severity change and the new operational requirement, such as engaging the payment specialist.

A downgrade needs positive evidence that the higher response is no longer required. “No new tickets” is weak evidence if traffic is low or customers have stopped trying. Healthy new transactions do not settle the consequences of earlier duplicate orders; assess that remaining impact separately.

For a separate incident where wider checkout impact was suspected but never confirmed, a reassessment might read:

```text
14:24 UTC - SEV-2 -> SEV-3, approved by current commander
Evidence: all four checkout cells tested; failures limited to one
noncritical export workflow; checkout transaction SLIs remain healthy
Remaining impact: exports delayed for one bounded tenant cohort
Response change: release checkout specialist; retain export owner
Communication: next update still due 14:30 UTC
Re-escalate if: checkout fails, cohort expands, or export deadline slips
```

Require the receiving response owner to accept continuing work before releasing responders. Downgrading severity should never leave an active customer problem unowned.

## Preserve the History Without Oscillation

Keep the initial, current, and highest severity as distinct concepts when reporting. Retain each transition's timestamp, decision owner, supporting evidence, and response change. Overwriting the initial label erases what responders knew at the time.

To reduce repeated upgrades and downgrades, define recovery evidence appropriate to the failure mode. Examples include sustained successful transactions, a drained backlog, or verification across every affected region. An arbitrary global five-minute window is unsuitable for a batch system with an hourly deadline.

If telemetry is unavailable, say so. Keep the response that uncertainty warrants and use independent observations. Do not downgrade solely because the monitoring system stopped producing failures.

## Test the Policy with Ambiguous Scenarios

Walk responders through a single-customer data integrity report, a low-traffic regional outage, and an unavailable dashboard during a possible global failure. Ask them to choose a provisional level and name the evidence that would change it.

Disagreement exposes missing policy definitions before production pressure makes them expensive. Record which decisions were reasonable with the information available, rather than judging every initial severity against the final blast radius.

## Conclusion

A useful initial severity is defensible and revisable. Pair observed impact with explicit uncertainty, activate a concrete response, and preserve evidence-backed transitions. That gives the team permission to act early while keeping customers and responders aligned as the scope becomes clearer.
