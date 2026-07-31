# What to Do When the Same Incident Happens After a Previous Postmortem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Recurring Incidents, Postmortem Actions, Reliability, SRE

Description: Treat a repeated incident as evidence to recheck the earlier analysis, action delivery, control effectiveness, and reliability priorities.

---

A repeated incident does not automatically prove that the first postmortem was useless. It does prove that the organization’s current controls did not prevent the observed impact.

The earlier action may still be open. It may have been deployed only to some paths. It may have reduced the blast radius without eliminating the failure. The new incident may share a symptom while having a different cause. Or the previous analysis may simply have been wrong.

Respond to the live incident first. Then use the repetition as new evidence, not as a reason to find someone to blame.

## Stabilize Before Debating the Old Postmortem

During active response:

- declare and staff the incident using the normal severity process;
- restore service with the safest available mitigation;
- link the prior incident and postmortem in the incident record;
- check whether prior runbooks or containment controls apply;
- preserve new logs, metrics, changes, decisions, and timestamps;
- do not assume the old root-cause statement is correct;
- do not delay mitigation to prove that the incidents match.

The previous document is a useful hypothesis source. It is not a substitute for current evidence.

## Decide Whether “Same” Is Actually the Same

Compare a failure signature:

| Dimension | Previous incident | New incident |
| --- | --- | --- |
| Customer symptom | Which journey and error? | Same measurement and scope? |
| Trigger | Which state change began the path? | Same event or only similar timing? |
| Preconditions | Which capacity, configuration, or dependency state existed? | Which are present now? |
| Amplifiers | Retries, load, shared fate, queue growth? | Same amplification? |
| Failed barriers | Which prevention, detection, containment, or recovery control failed? | Did the same barrier fail? |
| Blast radius | Tenants, regions, services? | Smaller, equal, or larger? |
| Detection | Which signal fired first and when? | Did earlier monitoring improve? |
| Mitigation | What restored service? | Did the prior runbook or automation help? |

Classify the relationship:

- **direct recurrence:** substantially the same causal path;
- **bypass recurrence:** the same unsafe condition reached through another path;
- **regression:** a previous control disappeared or stopped working;
- **partial recurrence:** the action reduced impact but did not eliminate the event;
- **related pattern:** different trigger, shared deeper condition;
- **similar symptom:** outward behavior matches, causal path differs.

This prevents a familiar dashboard shape from prematurely deciding the analysis.

## Audit Every Relevant Previous Action

For each action, ask:

```text
Was it accepted as committed work?
Was it complete before the new incident?
Was it deployed in the affected scope?
Was its acceptance test representative?
Did the incident exercise the control?
Did the control engage?
Did it behave as designed?
Was its design sufficient for this path?
Was a bypass or dependency missed?
```

Use deployment records, configuration, tests, audit events, and incident telemetry. Do not rely only on a ticket’s “Done” state.

Possible findings include:

### The action was still open

The incident exposes delivery and prioritization risk. Review why the work remained open, what capacity decision was made, and whether interim controls were adequate.

### The action was marked complete but not fully deployed

Reopen it. Identify scope and rollout verification gaps. Add a check that makes partial deployment visible.

### The action worked but addressed only one factor

Record the benefit—for example, one region affected instead of all regions—then address the remaining prevention, amplification, or recovery path.

### The action had a bypass

Map every entry point and authorization path. Do not patch only the newly discovered route if the same unsafe semantic remains elsewhere.

### The action did not control the failure

Revisit the causal claim and test assumptions. Replace the action rather than defending it because effort was already spent.

### The incidents only looked alike

Keep them linked by symptom or service, but build the new analysis from its own evidence.

## Reopen the Analysis, Not Just the Tickets

Create a combined causal view:

- facts common to both incidents;
- conditions unique to each;
- controls added after the first;
- which controls engaged;
- which paths remained;
- factors affecting blast radius and duration;
- unresolved hypotheses.

Google’s SRE Workbook advises teams facing mirrored incidents to ask whether actions are taking too long, feature velocity is outranking reliability, the right actions were captured, the service needs refactoring, or short-term patches are masking a larger problem.

Invite collaborators from both incidents. People who saw only one event may otherwise assume its details are universal.

## Treat Repetition as a Reliability Planning Signal

A direct recurrence should trigger a priority review, not another pile of ordinary backlog items.

Decide:

- whether unsafe change or operation should pause;
- which short-term containment is required;
- which permanent control receives funded capacity;
- whether the service’s error-budget policy changes feature delivery;
- which cross-team dependency needs sponsorship;
- who can accept residual risk;
- when effectiveness will be retested.

If the same architectural condition appears across incidents, create one service-level reliability plan with milestones. Keep incident-specific actions linked, but do not make five teams independently patch the same platform weakness.

## Improve the Control Portfolio

Repeated incidents often reveal overreliance on one kind of control.

If the prior action only detected the failure, add prevention or containment. If it only prevented one trigger, add recovery for other paths.

| Layer | Example control |
| --- | --- |
| Prevent | Reject unsafe deployment scope. |
| Detect | Page on customer-success objective burn. |
| Contain | Enforce regional and tenant fault boundaries. |
| Mitigate | Provide tested load shedding and rollback. |
| Recover | Restore state through an exercised procedure. |
| Verify | Regularly inject a bounded representative failure. |

No single action needs to guarantee that no incident will ever recur. The portfolio should reduce likelihood, severity, and time to recovery.

## Examine Why the Prior Verification Passed

If a completed control failed, compare its test to production:

- Was the test load representative?
- Did staging use the same limits and permissions?
- Did the test cover empty, stale, and partial data?
- Did it include dependency failure?
- Was the action tested across every region?
- Did the test assert customer outcome or only an internal response?
- Could configuration drift disable the control?
- Was a fail-open path left untested?

Update regression tests and game days. Retain the new incident as a test case where data handling permits.

## Preserve Blamelessness

Avoid:

- “The owner failed to prevent this.”
- “The team ignored the last postmortem.”
- “We already fixed this.”
- “This proves nobody reads action items.”

Use:

- “The action remained unscheduled after the previous review; the capacity decision is recorded here.”
- “The control was deployed in two regions but not the affected third region.”
- “The test covered a single API path; this incident used the legacy workflow.”
- “The alert reduced detection by nine minutes, but the containment gap remained.”

This language still establishes accountability. It directs attention to delivery, scope, assumptions, and controls.

## Communicate the Recurrence Honestly

Internally, state:

- whether the incidents are confirmed to share a path;
- which previous actions were open or complete;
- what those actions changed;
- why impact still occurred;
- the new containment and permanent plan.

If communicating externally, coordinate with the appropriate customer, legal, security, or communications owners. Do not claim that a permanent fix had eliminated a failure mode if the earlier action was only mitigative.

## Close the Loop with a Recurrence Review

Require:

```text
[ ] Incident relationship classified with evidence.
[ ] Previous actions audited beyond ticket status.
[ ] Benefits from controls are measured.
[ ] Bypasses, regressions, and incomplete rollout are identified.
[ ] Combined causal analysis is reviewed by both incident groups.
[ ] Reliability priority and capacity decision are explicit.
[ ] Short-term containment and permanent work have owners.
[ ] Verification replays the newly observed path.
[ ] Related postmortems and actions cross-link each other.
[ ] Residual risk has a named decision owner and review date.
```

The second incident is not only a recurrence. It is a real-world test of the first postmortem’s analysis and controls. Use the result to update both.

## Official Documentation

- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Microsoft Azure Well-Architected Framework: Incident Management](https://learn.microsoft.com/en-us/azure/well-architected/design-guides/incident-management)
- [AWS: Why you should develop a Correction of Error](https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/)
- [PagerDuty Incident Response: After an Incident](https://response.pagerduty.com/after/after_an_incident/)
