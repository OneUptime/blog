# How to Introduce Blameless Postmortems in a Culture That Still Asks “Who Broke It?”

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Blameless Postmortems, Incident Management, SRE, Organizational Culture, Psychological Safety

Description: Introduce blameless postmortems through explicit leadership behavior, a protected pilot, factual facilitation, and visible corrective action.

---

A new template will not make a blame-oriented organization blameless. People decide whether a review is safe by watching what leaders do after someone reveals an uncomfortable mistake.

Start small, make the rules explicit, facilitate firmly, and complete the corrective work. A successful first pilot provides evidence that candor leads to improvement rather than humiliation.

## Prepare Leadership Before the First Review

Meet with engineering and operational leaders and agree on the purpose:

> The postmortem is a learning process that reconstructs the incident, identifies contributing conditions, and produces improvements. It is not a forum for deciding discipline or rating individual performance.

Leaders must commit to:

- assuming good intent during the learning review;
- asking about information and conditions rather than character;
- not using candid postmortem participation as performance evidence;
- funding reasonable corrective actions;
- modeling uncertainty and admitting their own decisions;
- stopping blameful language in the room; and
- routing suspected policy or conduct matters to a separate fair process.

Do not promise absolute confidentiality if the document will be shared or if legal, regulatory, or security duties may apply. State access, retention, escalation, and redaction rules accurately.

Google's SRE guidance emphasizes active senior-management participation and leaders consistently modeling blameless behavior. Delegating culture change entirely to an SRE facilitator sends the opposite signal.

## Define Triggers Before Incidents

Publish objective criteria such as:

- user impact above a severity or duration threshold;
- data loss or integrity risk;
- security or privacy impact;
- rollback or emergency intervention;
- unusually long detection or recovery;
- monitoring failure;
- repeated incident pattern; or
- a high-potential near miss.

Allow any stakeholder to request a review. Predetermined triggers prevent managers from requiring postmortems only when a favored explanation or person is involved.

Use a lightweight review for lower-impact learning opportunities and a full review for major or complex events. The process should be proportionate, not reserved only for catastrophe.

## Build a Minimal Workflow

Assign:

- one postmortem owner;
- a neutral facilitator who was not the direct manager of key participants where possible;
- service and response participants;
- reviewers with relevant technical or operational context; and
- a leader who can prioritize actions.

Use a standard structure:

1. Summary and user impact
2. Detection and response
3. Factual timeline
4. Trigger and contributing factors
5. What went well
6. What made response harder
7. Where the organization got lucky
8. Corrective and mitigating actions
9. Open questions and evidence gaps

Begin the draft promptly after resolution. Gather logs, alerts, commands, deployment events, status updates, and responder notes before memory fades.

## Choose the First Pilot Carefully

Pick a meaningful incident with:

- enough evidence to reconstruct;
- multiple contributing conditions;
- participants willing to experiment;
- no active personnel dispute; and
- improvements the organization can realistically deliver.

Avoid choosing a trivial incident that cannot test the culture. Also avoid using the first pilot for an event already entangled in litigation, suspected malicious conduct, or a severe interpersonal conflict. Those conditions require additional expertise and safeguards.

Brief participants individually. Explain the process, ask what would make participation safe, and invite corrections to the draft timeline before the meeting.

## Open the Meeting With a Contract

Read a short statement:

> Everyone involved was trying to achieve a reasonable goal with the information and constraints available at the time. We will examine decisions precisely, without attacking people, so we can improve the system and response.

Set working rules:

- describe observable actions and timestamps;
- distinguish fact, inference, and unknown;
- let participants explain their own context;
- do not speculate about motive;
- discuss roles in the shared document unless identity matters;
- challenge ideas without ridicule; and
- pause if a conduct or legal issue needs a different forum.

Blameless does not mean avoiding disagreement. Participants can say that a decision increased impact while still asking why it was reasonable and why one action had such a large blast radius.

## Reframe “Who Broke It?”

Do not shame the person asking. Convert the question:

| Blame question | Learning question |
| --- | --- |
| Who deployed it? | What change triggered the behavior, and how did the release path assess it? |
| Why did they ignore the alert? | What did the alert show, where was it routed, and what else was the responder handling? |
| Who approved this? | What did the approval verify, and which risks were outside its scope? |
| Why didn't the on-call know? | What training, documentation, and escalation help were available at that moment? |
| Who owns the failure? | Which teams own the contributing conditions and resulting actions? |

If blame continues, the facilitator should intervene:

> We have recorded the action. The next question for this review is what made it possible and what control would reduce recurrence or impact.

Senior participants must be held to the same rule. A facilitator who only corrects junior staff teaches that hierarchy overrides safety.

## Produce Actions That Demonstrate the Difference

Weak actions make the review feel ceremonial:

- "be more careful";
- "retrain the engineer";
- "remind the team";
- "improve monitoring."

Strong actions alter conditions:

```text
Action: Block cross-region promotion when replication lag exceeds
the service threshold, with an emergency override that is logged.
Owner: Database Platform
Due: 2026-09-04
Verification: integration test plus game-day exercise
Contributing factor: unsafe promotion remained available during lag
```

Include an owner, deadline, priority, verifiable end state, and link to the finding. Track actions in the normal backlog. Atlassian's published process creates work items for actions and expects approvers to prioritize them.

Complete one visible action quickly after the pilot. People need to see that candor changes the system.

## Publish With Care

Share the reviewed document as broadly as its sensitivity permits. Remove end-user personal data, secrets, unnecessary employee names, and protected security detail. Do not sanitize the engineering lesson.

Invite asynchronous correction and record material revisions. Discuss the postmortem in a learning forum, not as a spectacle. Recognize clear analysis and effective incident response rather than celebrating an absence of mistakes.

## A 90-Day Introduction

**Weeks 1–2:** agree on leadership commitments, triggers, roles, access rules, and a template.

**Weeks 3–4:** train facilitators using a historical incident and practice reframing blameful questions.

**Month 2:** run two or three pilots, publish actions, and ask participants privately about safety and usefulness.

**Month 3:** revise the process, establish a review cadence, and report action completion and recurring system themes.

Measure process health:

- time from incident resolution to draft and publication;
- required postmortems completed;
- actions with owners and deadlines;
- overdue and verified actions;
- participant-reported safety;
- near-miss reporting; and
- repeated contributing factors.

Do not set a target for the number of postmortems or errors disclosed. That invites quota behavior.

## Respond Consistently When Tested

The real transition occurs when a respected engineer, a new hire, or a senior leader makes a consequential mistake. Apply the same learning process. If separate conduct review is warranted, apply a published standard consistently and continue investigating system conditions.

One retaliatory response can undo months of messaging. Conversely, a review that records difficult facts, treats participants fairly, and completes meaningful actions is a powerful cultural artifact.

People stop asking "who broke it?" when leaders repeatedly show that the more valuable questions are how the incident emerged, why defenses failed, and what the organization will change.

## Official Documentation

- [Google SRE Book: Postmortem Culture—Learning from Failure](https://sre.google/sre-book/postmortem-culture/)
- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [Atlassian Incident Management Handbook: Postmortems](https://www.atlassian.com/incident-management/handbook/postmortems)
- [Atlassian: How to run a blameless postmortem](https://www.atlassian.com/incident-management/postmortem/blameless)
