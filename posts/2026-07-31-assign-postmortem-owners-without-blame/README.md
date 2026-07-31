# Assigning Owners and Deadlines Without Reintroducing Blame

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Postmortem Actions, Accountability, Blameless Postmortems, SRE

Description: Assign clear delivery ownership and risk-based deadlines to corrective work without implying that the owner caused the incident.

---

Blameless does not mean ownerless.

A corrective action without one accountable owner is less likely to move. A deadline with no relationship to risk or capacity becomes theater. The practice works when ownership means “responsible for getting this improvement to an accepted end state,” not “the person being punished for the incident.”

Google’s SRE Workbook recommends a single point of contact for postmortem follow-up and clear owners for action items. AWS’s Correction of Error guidance calls for each action to have a priority, responsible person, and due date.

## Name the Kind of Ownership

Several roles are often collapsed into “owner”:

- **postmortem owner:** coordinates the document, review, and follow-up;
- **service owner:** accountable for the service’s ongoing operation;
- **action owner:** drives one corrective action to completion;
- **dependency owner:** delivers a required change in another system;
- **risk authority or sponsor:** resolves priority conflicts or accepts residual risk;
- **reviewer:** checks that acceptance evidence meets the agreed criteria.

Use the full label in the tracker. “Owner: Priya” is ambiguous; “Action owner: Payments platform lead” is clear.

The person who triggered an event should not automatically receive every follow-up. Assign work to the role with authority, context, and capacity to change the relevant system.

## Write the Action Before Selecting the Owner

Weak:

> Jordan — fix monitoring by Friday.

Stronger:

> Add and end-to-end test a regional checkout-success page that fires within the approved detection target, routes to the active checkout rotation, and links the mitigation runbook.

Once scope and acceptance are clear, ask which team controls:

- instrumentation;
- rule deployment;
- routing;
- runbook;
- production verification.

If no one controls the complete outcome, select one coordinating owner and record dependency owners rather than assigning the ticket to a committee.

## Select Owners by Control, Not Proximity

A useful owner:

- can make or coordinate the required change;
- understands the risk or can obtain the expertise;
- has a manager who can allocate capacity;
- can gather acceptance evidence;
- knows when to escalate blockers.

Avoid these shortcuts:

- assigning the last person who touched the system;
- assigning the postmortem author every action;
- assigning the most junior responder as a “learning opportunity”;
- assigning a whole team with no point of contact;
- assigning someone absent from the decision without confirming acceptance.

The responder closest to the incident may be an excellent collaborator. That does not make them the default accountable owner.

## Confirm Ownership Explicitly

At the review, record:

```text
Action owner: deployment-platform lead
Collaborators: service runtime, security engineering
Dependency owner: inventory API lead
Accepting reviewer: production engineering lead
Sponsor: VP Engineering
```

Ask the proposed owner:

- Is the scope understandable?
- Do you control the required systems?
- Which dependencies exist?
- What capacity is required?
- Is the due date feasible given the risk?
- Who should accept the result?

Silence in a meeting is not acceptance. Update the tracker and have the owner acknowledge it.

## Set Deadlines from Risk and Work

A due date should reflect:

- incident severity and recurrence likelihood;
- current exposure;
- whether a temporary control exists;
- implementation and rollout risk;
- dependencies;
- test requirements;
- planned capacity.

Do not choose dates solely because “two weeks sounds urgent.” AWS mentions an internal service level as an example, not a universal rule. Define your own response targets.

A useful staged plan might be:

| Stage | Outcome | Date basis |
| --- | --- | --- |
| Immediate containment | Disable unsafe global operation. | Before restoring routine use |
| Durable guard | Validate scope and cap affected regions. | Current high-risk work window |
| Structural change | Replace legacy global workflow. | Approved reliability plan |
| Effectiveness review | Exercise the control in a game day. | After production rollout |

One distant deadline hides the period of exposure. Stages make risk reduction visible.

## Keep the Language About Work

Prefer:

- “Action owner”
- “Delivery target”
- “Acceptance criteria”
- “Dependency”
- “Escalation”
- “Residual risk”

Avoid:

- “Responsible engineer” when it could mean responsible for the incident;
- “Jordan must fix what they broke”;
- “Owner failed to deliver” without blocker and capacity context;
- “Retrain Sam” as a corrective action;
- assigning dates as a disciplinary signal.

Accountability is factual: what outcome was agreed, who drives it, what evidence is required, and when a decision is due.

## Give Owners an Escalation Path

An owner cannot resolve every cross-team or product tradeoff personally. Define:

```text
If blocked for 3 business days:
  action owner records the dependency and impact
  dependency owner confirms a delivery date
  sponsor decides priority if dates conflict

If the due date is at risk:
  owner proposes containment, rescope, or a new date
  risk authority accepts or rejects residual exposure
```

The exact duration is an example. The essential point is to escalate early enough to change the outcome.

Do not silently move a due date. Retain the old date, reason, decision maker, interim control, and new commitment.

## Separate Delivery Review from Performance Review

Follow-up reviews should ask:

- Is the action still the right control?
- What evidence is complete?
- Which dependency is blocked?
- Has risk changed?
- Does scope need to be split?
- Who can make the required priority decision?

If a manager needs to address an individual performance issue, use the authorized personnel process. Do not turn the action tracker into a public performance scorecard.

This separation lets teams discuss real delivery problems—underestimated work, missing ownership boundaries, competing priorities—without treating every delay as moral failure.

## Close on Evidence, Not an Owner’s Assertion

The owner attaches:

- code, configuration, or process change;
- deployment scope;
- automated test results;
- drill or failure-injection evidence where appropriate;
- dashboard or alert behavior;
- updated runbook;
- residual-risk statement.

The accepting reviewer checks the criteria. For example:

```text
Acceptance:
[x] routine workflow rejects an empty target
[x] operations over one region require the audited emergency path
[x] tests cover both controls
[x] production permissions expose only the intended paths
[x] game day demonstrates safe rejection and escalation
```

“Merged” and “documented” are implementation milestones, not always proof that the action controls the incident path.

## Handle Missed Deadlines Constructively

When a deadline passes:

1. verify current exposure;
2. inspect the blocker and original estimate;
3. decide whether containment is needed;
4. remove the blocker, change capacity, or rescope;
5. have the authorized risk owner approve any new date;
6. record the decision;
7. look for systemic patterns across overdue actions.

Repeated overdue reliability work may indicate a planning or ownership-system problem. Assigning harsher dates to individual engineers does not fix that.

## A Complete Ownership Record

```text
Action:
Reject deployment targets larger than one region in the routine workflow.

Factor addressed:
INC-731 crossed all regional fault domains through one operation.

Action owner:
Deployment platform lead

Dependency owners:
Inventory API lead; identity platform lead

Sponsor:
Infrastructure director

Milestones:
Unsafe path disabled before routine deployments resume.
Guard and tests deployed by the approved high-risk-work date.
Game-day verification within one week of rollout.

Acceptance:
Empty and oversized targets are rejected; emergency override is
separate and audited; production exercise confirms both paths.

Escalation:
Sponsor resolves dependency conflicts within the infrastructure plan.
```

This is strong accountability. It says nothing about who deserves blame.

## Official Documentation

- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [AWS: Why you should develop a Correction of Error](https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/)
- [PagerDuty Incident Response: Postmortem Process](https://response.pagerduty.com/after/post_mortem_process/)
- [Microsoft Azure Well-Architected Framework: Incident Management](https://learn.microsoft.com/en-us/azure/well-architected/design-guides/incident-management)
