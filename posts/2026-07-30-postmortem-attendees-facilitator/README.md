# Who Should Attend a Blameless Postmortem—and Who Should Facilitate It?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Blameless Postmortem, Facilitation, SRE, Psychological Safety

Description: Invite the people who hold evidence, context, impact, and action authority while assigning an impartial facilitator who protects the learning process.

---

A postmortem needs enough perspectives to reconstruct the incident and change the system. It does not need every person who watched the incident channel.

Too few participants create a tidy but incomplete story. Too many create an audience, make candor harder, and consume time from people who cannot add evidence or make a decision.

Choose attendance by role in the learning process, not seniority or curiosity.

## Separate Four Responsibilities

A small incident may let one person hold several roles, but name them explicitly:

| Role | Responsibility |
| --- | --- |
| Postmortem owner | Produces the draft, gathers evidence, coordinates review, and tracks document status |
| Facilitator | Runs the conversation, enforces norms, manages time, and surfaces disagreement |
| Scribe | Records corrections, decisions, unknowns, and action items |
| Action owners | Accept specific follow-up work and define completion evidence |

The postmortem owner often knows the incident well and may present most of the report. That does not automatically make them the best facilitator. Microsoft’s Well-Architected incident guidance recommends an impartial facilitator for a blameless review.

## Always Represent the Incident Response

Invite people who directly saw or shaped important parts of the incident:

- incident commander;
- primary technical responders;
- service or workload owners;
- the person who recorded incident state, if there was one;
- representatives from every materially involved response team.

They can explain what information existed at the time, which hypotheses were considered, and why actions were reasonable under pressure.

Do not invite only the person who made the triggering change. The incident also involved detection, safeguards, deployment, dependencies, communication, diagnosis, mitigation, and recovery.

PagerDuty’s published process includes the incident commander, involved service owners, key responders, engineering management, and product management, with other roles added by severity. Microsoft similarly recommends representation from each team involved by people who actually worked on the response.

## Add Missing Perspectives Deliberately

Depending on the incident, include:

### Customer or business impact

A support, product, customer liaison, or business representative can verify:

- who was affected;
- how users experienced the failure;
- contractual or regulatory implications;
- whether communication matched impact.

They should bring evidence, not turn the meeting into a demand for a culprit.

### Contributing systems

Invite a subject-matter expert when a dependency, platform, policy, or operational process materially contributed and the core group cannot explain it.

### Decision authority

Include an engineering or product leader when the meeting must commit capacity, change a cross-team process, or resolve ownership. Their role is to enable action, not interrogate individuals.

### Security, privacy, legal, or communications

For sensitive incidents, involve the appropriate functions under the organization’s incident and disclosure procedures. Decide in advance what can appear in the broad postmortem and what must remain in a restricted record.

## Use an Invitation Test

For each proposed attendee, ask whether they bring at least one of:

- direct evidence;
- decision context;
- customer-impact knowledge;
- expertise needed to test a causal explanation;
- authority to accept or fund a corrective action;
- a distinct learning need that justifies participation.

If not, offer the reviewed document, recording where appropriate, or a later learning session instead.

This produces a core working group and a broader learning audience:

```text
core review:
  reconstruct, analyze, decide

document reviewers:
  correct facts asynchronously

learning audience:
  read or discuss the completed result
```

Google SRE encourages broad sharing after review. Broad learning does not require turning the investigative meeting into an all-hands event.

## Keep the Core Group Small Enough to Work

There is no universal attendee count. The correct number is the smallest group that covers:

- response;
- affected services;
- impact;
- important dependencies;
- action authority.

For a contained service incident, that may be six people. A cross-region security event may require more. If the invite list grows, use representatives and gather specialist corrections asynchronously before the meeting.

Avoid:

- inviting every manager in the reporting chain;
- treating attendance as a status symbol;
- filling the room with observers;
- excluding a responder because their account is uncomfortable;
- asking one junior responder to face a room of leaders alone.

## Choose an Impartial Facilitator

The facilitator should:

- understand incident and postmortem practice;
- have enough technical fluency to follow the discussion;
- be independent enough to challenge every team;
- have no performance-management agenda for participants;
- be comfortable interrupting senior people;
- distinguish facts, inferences, and unknowns;
- redirect blame toward conditions and safeguards;
- manage time without prematurely closing uncertainty.

“Impartial” does not mean unfamiliar with the organization. It means the facilitator is not defending a favored narrative or deciding personnel consequences in the session.

Good options include:

- a trained facilitator from another service team;
- an SRE or incident-management lead not central to the event;
- a senior engineer from an adjacent domain;
- a rotating peer facilitator.

For a small, low-contention incident, the incident commander may facilitate, as in PagerDuty’s process. For a politically sensitive incident or one involving the commander’s own decisions, separate the roles.

## Identify Conflicts Before the Meeting

Use a different facilitator when:

- the proposed facilitator manages a person whose performance is being questioned;
- their team owns the disputed control;
- they made a central decision and need to provide evidence;
- there is an active personnel, legal, or security investigation;
- participants do not believe they can interrupt leadership safely;
- the facilitator has already published a conclusion.

Where misconduct or personnel concerns exist, handle them in the authorized process outside the learning review. The postmortem can still examine system conditions without adjudicating an employee case in public.

## Give Everyone Prework

Send a draft and working agreement before the meeting. Ask participants to:

- correct factual errors in advance;
- attach evidence for important timestamps and impact claims;
- label uncertainty;
- identify what went well;
- propose contributing conditions rather than a single culprit;
- suggest testable actions;
- declare sensitive information.

The meeting should resolve disagreements and improve analysis, not discover the basic timeline from memory.

PagerDuty’s published process recommends circulating content for review before the meeting. Google SRE also describes formal review for completeness, impact, depth of analysis, and action quality.

## State the Working Agreement

At the opening, the facilitator should say:

> We are here to understand the conditions that produced the outcome and improve the system. We will discuss actions factually, using the information available at the time. Personnel judgments are outside this meeting. Disagreement is welcome; blame and speculation about motives are not.

Other useful rules:

- one conversation at a time;
- evidence before certainty;
- facts, inferences, and unknowns are labeled;
- anyone may ask for a pause;
- action items need owners and verification;
- the scribe records unresolved disagreement.

## Give the Facilitator Practical Interventions

When someone asks, “Who did that?”:

> Which event are we trying to establish, and what evidence records it?

When someone says, “They should have known”:

> What information was available then, and how was the expected response made clear and safe?

When the room jumps to a fix:

> Which contributing condition does that action change, and how will we verify it?

When an expert dominates:

> I want to hear from the people who were operating the system at that point. What did you observe?

When facts remain disputed:

> We will record both interpretations and assign the evidence-gathering step rather than force agreement.

## Close with Explicit Ownership

Before ending, confirm:

- factual corrections;
- unresolved questions and evidence owners;
- accepted contributing factors;
- action item, owner, priority, due date, and completion evidence;
- document reviewer and publication audience;
- sensitive-information handling;
- follow-up review date.

Attendance is successful when the meeting contains the knowledge needed to learn and the authority needed to act, while responders can describe reality without facing a tribunal. An impartial facilitator makes that boundary real.

## Official Documentation

- [Microsoft Azure Well-Architected Framework: Incident management](https://learn.microsoft.com/en-us/azure/well-architected/design-guides/incident-management)
- [PagerDuty: Postmortem Process](https://response.pagerduty.com/after/post_mortem_process/)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
