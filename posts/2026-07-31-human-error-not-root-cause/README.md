# Why “Human Error” Is Not a Root Cause—and What to Investigate Instead

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Root Cause Analysis, Human Factors, Blameless Postmortems, SRE

Description: Treat human error as the beginning of an investigation into system conditions, controls, and tradeoffs rather than its final conclusion.

---

“Human error” describes an action or outcome, but it does not explain why the system allowed that action to create an incident.

An operator entered a wrong value. An approver missed a risk. An on-call responder chose a mitigation that made the failure worse. Those facts belong in the postmortem. Stopping there does not tell you what to change.

AWS’s Correction of Error guidance is explicit: when “human error” appears as a root cause, ask why the error was possible and which checking or fail-safe mechanism was absent. OSHA similarly advises investigators to look beyond carelessness or failure to follow a procedure and identify the equipment, process, training, and program conditions that contributed.

## Start with the Observable Action

Replace the label with a neutral, testable description:

| Weak conclusion | Investigable fact |
| --- | --- |
| Human error caused a bad deploy. | The production deployment was started with package `2.7.4`, which had passed staging tests for a different configuration. |
| The on-call missed the alert. | The alert remained unacknowledged for 18 minutes after routing to an expired schedule override. |
| An engineer deleted the database by mistake. | The administration command accepted the production database identifier without a preview or secondary confirmation. |
| The approver was careless. | The approval screen did not display the target account, affected row estimate, or rollback status. |

The second column is not softer. It is more precise and leads to questions that engineering and management can answer.

## Reconstruct the Conditions Around the Action

Investigate the work as it was actually performed, not as a policy document imagines it.

### Information

- What did the interface, alert, dashboard, or runbook show?
- Was relevant information missing, stale, delayed, or contradictory?
- Did labels distinguish production from staging?
- Was the eventual failure mode knowable at that time?

### Tools and controls

- Did the tool validate inputs?
- Did it preview scope and impact?
- Were destructive defaults safe?
- Could one operation cross a large fault-domain boundary?
- Was there an independent guard, canary, rate limit, or automatic rollback?

### Procedure

- Was the documented procedure current and available?
- Did it match the observed system state?
- Was it tested recently?
- Did normal work require bypassing it?
- Were exceptions frequent enough to have become the real process?

### Work environment

- What time pressure, interruptions, handoffs, or competing incidents existed?
- Was staffing appropriate for the task?
- Were access and expertise available?
- Did incentives favor speed or feature delivery over verification?

### Detection and recovery

- Why did the action become customer impact before detection?
- Why did containment not limit the blast radius?
- Could responders reverse the action safely?
- Which signals or recovery paths were missing?

These questions move analysis from “Who did it?” to “What made this action possible, plausible, and consequential?”

## Follow More Than One Why

Consider a configuration incident:

```text
Event:
A zero was omitted from a connection limit.

Why was the value accepted?
The configuration parser accepted any positive integer.

Why did review not catch the magnitude?
The diff showed a raw number without units, previous value, or projected effect.

Why did the change affect every region?
The rollout job used a global target by default.

Why did impact continue for 24 minutes?
No alert measured rejected connections at the customer-facing boundary.
```

There is no need to choose one line as the sole root cause. Validation, review ergonomics, rollout scope, and detection all contributed. Each exposes a different control opportunity.

## Examine Why the Decision Made Sense Locally

People usually act using incomplete information while trying to achieve a legitimate goal. Capture that local context:

- The rollback path was known to risk data incompatibility.
- The runbook recommended a restart for the visible symptom.
- The dashboard grouped two regions under a shared label.
- Previous alerts of the same type had been harmless.
- The responder had authority to mitigate but not to change traffic policy.

This does not declare every decision correct. It explains the decision well enough to improve the surrounding system.

Google SRE’s blameless-postmortem guidance assumes people acted with good intent based on the information available. That assumption helps investigators find misleading signals, unsafe interfaces, and organizational constraints that a blame-first review misses.

## Look for Failed or Missing Barriers

Ask what should have prevented one imperfect action from becoming an outage:

- schema or range validation;
- typed units;
- environment-specific credentials;
- a dry-run or impact preview;
- peer review that exposes operational scope;
- canary deployment;
- maximum-change limits;
- rate limiting;
- circuit breakers;
- automated rollback;
- tested backups;
- customer-symptom alerting.

Do not respond by adding approval layers automatically. A manual checkpoint that presents the same poor information may add latency without reducing risk. Prefer controls that make the safe path easy and make hazardous scope visible.

## Distinguish Skill Gaps from System Design

Training can be appropriate when:

- a task legitimately requires specialized knowledge;
- the required behavior is stable and can be practiced;
- the training includes a competency check;
- people are given time and tools to follow it.

Training is weak as the only action when a machine can cheaply reject an invalid value, limit scope, or recover automatically.

If an operator was not trained, continue:

- How was authorization granted?
- How was competency checked?
- Why could an unverified action reach production?
- Was the procedure understandable and current?
- What protected the system while experience was developing?

“Retrain the engineer” often leaves the same trap for the next person.

## Convert Findings into System Actions

Tie every action to a supported contributing condition:

| Contributing condition | Stronger action | Verification |
| --- | --- | --- |
| Target environment was visually ambiguous. | Display account, region, and environment in the confirmation prompt and require an environment-specific token. | Usability test shows operators correctly identify all test targets. |
| Tool accepted an unsafe global scope. | Reject operations over the approved host limit unless a separate audited workflow is used. | Integration test proves the standard workflow rejects an oversized target. |
| Alert routed to an expired override. | Validate schedule overrides and page the owning team before an override expires. | End-to-end routing test reaches the active rotation. |
| Runbook prescribed the wrong recovery for this state. | Add state checks and branch-specific mitigation steps. | Game-day participants select the safe branch from representative telemetry. |

Actions should improve prevention, detection, mitigation, or recovery. They should have an owner, priority, tracked work item, and verifiable end state.

## Blameless Does Not Mean Evidence-Free

Record actions accurately. Preserve audit evidence. Assign decision and follow-up ownership. Evaluate whether controls and authorization worked.

If evidence suggests intentional abuse, fraud, harassment, sabotage, or another conduct issue, use the organization’s authorized investigation process. That process can assess intent and consequences with the confidentiality and expertise it requires.

Do not quietly turn the postmortem into that process. Mixing the two discourages candid operational accounts and still fails to provide a proper personnel investigation.

## Use a Better Closing Test

Before accepting the analysis, ask:

1. If a different competent person entered the same situation, could the event recur?
2. Which information or control would have changed the decision?
3. Which barrier should have limited the consequence?
4. Does every conclusion have evidence?
5. Do the actions change the system, or merely instruct people to be more careful?
6. Can the team test that the new controls work?

If “human error” is still the last box in the analysis, the investigation has probably stopped at the point where useful learning begins.

## Official Documentation

- [AWS: Why you should develop a Correction of Error](https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/)
- [OSHA: Incident Investigation](https://www.osha.gov/incident-investigation)
- [OSHA: Hazard Identification and Assessment](https://www.osha.gov/safety-management/hazard-identification)
- [UK Health and Safety Executive: Human factors in accident investigations](https://www.hse.gov.uk/humanfactors/assets/docs/core2.pdf)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
