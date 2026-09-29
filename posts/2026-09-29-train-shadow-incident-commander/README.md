# How to Train a Shadow Incident Commander with Drills, Handoffs, and Reviews

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Incident Management, SRE

Description: Develop incident commanders through structured observation, realistic drills, explicit handoffs, supervised command, and evidence-based readiness reviews.

A strong engineer does not automatically become an effective incident commander. Command requires tracking several workstreams, making decisions with incomplete evidence, and protecting responders from conflicting requests. Those skills need deliberate practice before the candidate carries an unfamiliar production incident alone.

PagerDuty's training guidance includes shadowing, exercise participation, and reverse shadowing with an experienced commander available to take over. Google's SRE onboarding guidance favors contained realistic practice over learning entirely through live emergencies. The progression below adapts those ideas into a local training program; the example stage gates are proposed criteria, not vendor certification requirements. [PagerDuty: Incident Commander](https://docs.pagerduty.com/ops-guides/incident-response-guide/incident-commander), [Google SRE: Accelerating SREs to On-Call](https://sre.google/sre-book/accelerating-sre-on-call/)

## Define the Role the Candidate Is Learning

Write down the commander's responsibilities in your organization. Include incident declaration, severity review, assignment of roles, coordination of changes, escalation, communication checkpoints, handoff, and recovery verification.

Separate command from technical execution. A candidate who solves the database problem while every other workstream loses direction has not demonstrated command readiness. They may contribute technical context, but an operations owner should execute changes and report results.

Ensure the candidate can find the service map, severity policy, escalation contacts, fallback communication method, and incident record. Deep expertise in every subsystem is unnecessary; recognizing when to request an expert is essential.

## Stage One: Observe with a Structured Worksheet

Give the shadow a learning task, not merely an invitation to the call. Ask them to record:

```text
Decision point:
Evidence available at that moment:
Known customer impact and uncertainty:
Options raised:
Risk or tradeoff discussed:
Owner assigned:
Expected report time:
Signal that would change the decision:
```

The active commander retains authority. The shadow should save ordinary training questions for debrief and use the established interrupt path for safety concerns. This avoids creating an unofficial second commander during a real response.

Afterward, compare the worksheet with the commander's reasoning. Focus on what was knowable at the time, not on whether the eventual diagnosis makes an earlier decision look obvious.

## Stage Two: Practice Short Decision Drills

Use a facilitator and a small set of realistic artifacts: a customer report, a dashboard excerpt, a deployment event, and an unavailable specialist. Reveal information in stages so the candidate must revise their assessment.

Example drill:

| Inject | Skill to observe |
| --- | --- |
| One region fails while the global average is healthy | Establish scope before making broad claims |
| Two teams propose conflicting mitigations | Identify interference and assign one coordination owner |
| Provider acknowledges a ticket without an ETA | Continue internal mitigation and communication planning |
| Initial hypothesis is contradicted | Update the plan without hiding the earlier decision |
| Senior stakeholder asks for an unsupported promise | Communicate uncertainty and a useful checkpoint |

Let the candidate request information that is not in the prepared packet. The facilitator can answer, defer, or mark it unavailable, as a real incident would. A drill should exercise judgment rather than memorization of a hidden answer.

## Make Handoffs a Separate Exercise

Handoffs are easy to overlook when training focuses on the exciting first minutes. Give the candidate an incident already forty minutes old, with partial recovery, a pending change, and several discarded hypotheses.

Ask for a brief transfer containing:

```text
Current impact and confidence
Commander and active role owners
Mitigations in place and their rollback conditions
Changes currently executing
Open hypotheses and investigations already ruled out
Pending decisions, blockers, and report times
Customer message already published and next deadline
Evidence needed to confirm recovery
```

The incoming commander should repeat the important commitments and announce the transfer. Test whether the outgoing commander remains accountable until that acknowledgment. Merely editing a name in a document leaves a gap in authority.

## Stage Three: Reverse Shadow with an Explicit Contract

Choose an appropriate production opportunity under your organization's training policy. The candidate leads; the mentor observes and remains available. State their roles in the incident channel so responders know whose direction to follow.

Agree on takeover triggers before the incident. Examples include loss of situational awareness, an uncoordinated high-impact change, repeated missed communication commitments, or complexity beyond the candidate's prepared scope. An actual safety concern overrides the exercise goal.

The mentor should avoid coaching every sentence. If the response remains safe, let the candidate make and evaluate reasonable choices. When intervention is necessary, make it visible: identify the new commander and preserve the outstanding work. A silent takeover teaches little and confuses the response.

## Review Decisions, Not Personality

Use observable criteria:

| Capability | Evidence |
| --- | --- |
| Establishes ownership | Every active task has an acknowledged owner |
| Maintains shared state | Summary matches current impact and active changes |
| Manages uncertainty | Hypotheses remain distinct from confirmed facts |
| Keeps work moving | Checkpoints produce results or explicit re-planning |
| Coordinates risk | Mutations have scope, verification, and stop conditions |
| Transfers command | Incoming owner acknowledges pending commitments |

Evaluate each as demonstrated, demonstrated with prompting, or not yet demonstrated. Preserve short examples and specific next practice. Avoid treating loudness, seniority, or fast speech as proxies for control.

Review a decision that succeeded and one that failed. A good process can produce an unfavorable result under uncertainty; an unsafe guess can occasionally work. The review should distinguish those cases.

## Set a Readiness Gate and Keep Learning

Require evidence across several scenarios, including an ambiguous incident, a handoff, and a changing diagnosis. Use more than one reviewer when feasible. Record the scope in which the candidate is ready and the backup arrangement for unusual incidents.

Do not graduate someone solely because a quiet shadow shift ended. If no meaningful incident occurred, use additional drills. Revisit readiness after long gaps or material process changes, and retain mentoring as a normal support mechanism.

## Conclusion

Train command as a set of observable coordination skills. Structured shadowing builds awareness, scenario drills create safe practice, and reverse shadowing tests execution with a clear fallback. Decision reviews and handoff exercises turn experience into evidence that the next commander can keep the response organized under uncertainty.
