# A Practical Blameless Postmortem Agenda for a 60-Minute Review

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Blameless Postmortems, Agenda, Facilitation, SRE

Description: Run a focused 60-minute postmortem that validates evidence, examines contributing conditions, and leaves with owned, testable actions.

---

Sixty minutes is enough to review a well-prepared incident. It is not enough to discover the incident from scratch, debate every log line, perform a complete architecture review, and invent a backlog.

The meeting works when a draft timeline, impact statement, evidence links, and initial contributing factors already exist. Use the hour to correct the record, examine the most important conditions, and decide what changes.

## Preconditions

Before scheduling the review, the postmortem owner should provide:

- a short summary;
- quantified impact and affected period;
- evidence-backed timeline in one time zone;
- responders and involved systems;
- initial contributing factors;
- what worked well;
- known unknowns;
- proposed action items;
- links to restricted evidence where access permits.

Circulate the draft early enough for factual review. PagerDuty’s published process recommends review before the meeting and says the timeline should be the initial focus. Google SRE also treats formal review as essential to completeness and action quality.

Name:

- facilitator;
- postmortem owner;
- scribe;
- decision-maker for priority conflicts.

If the basic impact or timeline is still unknown, hold a smaller evidence session first rather than spending the learning review on log archaeology.

## The 60-Minute Agenda

### 0–5 minutes: Open and establish safety

The facilitator states:

- purpose: learn and reduce recurrence or impact;
- scope of the incident;
- blameless working agreement;
- difference between fact, inference, and unknown;
- personnel issues are handled elsewhere;
- expected output;
- timeboxes.

Opening script:

> We will describe actions accurately and evaluate the conditions around them. We are not assigning personal fault. Disagreement is useful; unsupported certainty is not. By the end, we need an agreed factual record, explicit unknowns, and a small set of owned actions.

Confirm that the right teams are represented and that someone can make priority decisions.

### 5–12 minutes: Confirm impact and boundaries

Review:

- start and end of user impact;
- affected users, regions, services, or business processes;
- severity;
- data, security, contractual, or regulatory impact;
- how impact was measured;
- recovery criterion.

Ask:

- Does the impact statement reflect user experience?
- What is measured, estimated, or unknown?
- Did impact begin before detection?
- Are secondary effects included?

Do not begin causal analysis until the group agrees on the outcome being explained.

### 12–22 minutes: Walk the critical timeline

Review only decision-relevant events:

- latent condition or triggering change;
- first user impact;
- detection;
- declaration and escalation;
- key hypotheses and decisions;
- mitigation attempts;
- recovery;
- verification.

For each contested event:

- cite the source;
- preserve the original timestamp;
- record clock uncertainty;
- separate what responders knew then from what was learned later.

AWS recommends that a correction-of-error timeline begin with the trigger, not merely notification, use consistent time zones, and link supporting data.

Do not read every timeline row aloud. Highlight turning points and disagreements.

### 22–37 minutes: Examine contributing conditions

Start with the direct mechanism, then widen:

- technical failure and dependencies;
- deployment and change controls;
- observability and alerting;
- interface and automation behavior;
- capacity and resilience;
- documentation and training;
- ownership and handoffs;
- organizational priorities and tradeoffs;
- conditions that limited blast radius or accelerated recovery.

Use questions such as:

- What made this failure possible?
- What made the impact this large or long?
- Which defenses were missing, weak, bypassed, or successful?
- What information did responders have at each decision?
- Where else can the same conditions exist?
- Why was the observed action locally reasonable?

Avoid stopping at “human error,” “bad deploy,” or “missing test.” Ask why the system permitted one action or omission to produce the outcome.

Keep a visible list:

```text
supported contributing factor
needs more evidence
disproved
out of scope for this review
```

### 37–45 minutes: Review response and learning

Discuss:

- what worked well;
- what delayed detection, diagnosis, communication, mitigation, or verification;
- effective improvisations that should become supported capability;
- confusing roles or handoffs;
- near misses and lucky breaks;
- customer communication.

Recognizing effective action is part of learning. It shows which controls and behaviors should be preserved.

Google SRE’s postmortem philosophy treats the exercise as a learning opportunity, not punishment, and emphasizes preventive actions.

### 45–55 minutes: Select corrective actions

For each proposed action, require:

- the contributing condition it addresses;
- exact change;
- owner;
- priority and due date;
- completion evidence;
- effectiveness check;
- possible side effects.

Use:

```text
Action:
Owner:
Due:
Condition addressed:
Done when:
Effective when:
```

Prefer a small number of high-value actions over a long wish list. Include prevention, detection, mitigation, and response improvements as appropriate.

Reject:

- “be more careful”;
- “improve monitoring”;
- “add tests”;
- “update docs”;
- “team to investigate” without scope and due date.

AWS guidance describes action items as the main output and recommends a responsible person, priority, due date, and specific achievable work.

### 55–60 minutes: Confirm and close

The scribe reads back:

- corrected facts;
- unresolved questions and owners;
- accepted contributing factors;
- selected actions and owners;
- publication and access classification;
- review and effectiveness dates.

Ask each action owner to accept or reject ownership explicitly. Confirm who will approve the final document.

Close by thanking responders for surfacing evidence, not for defending a flawless narrative.

## Facilitation Rules That Protect the Agenda

Use a visible parking lot for:

- deep design discussions;
- unrelated technical debt;
- policy questions needing another authority;
- personnel or conduct matters;
- evidence collection that cannot finish in the room.

Timebox dominant voices and ask responders closest to each event first. When a senior leader supplies an interpretation, ask what evidence supports it and invite correction.

If a factual disagreement affects the causal analysis, do not vote. Record both hypotheses and assign an evidence owner.

## When to Change the Agenda

### Complex multi-team incident

Use the hour for impact, common timeline, cross-team factors, and ownership boundaries. Delegate subsystem deep dives to smaller follow-ups.

### Security or privacy incident

Use approved access and disclosure rules. Maintain a broadly shareable learning document and restricted evidence where necessary. Do not expose sensitive customer or security data to satisfy meeting completeness.

### Emotionally difficult incident

Schedule breaks, use a trained facilitator, and allow participants to provide corrections asynchronously. A deadline is not permission to force disclosure.

### Major unresolved mechanism

Create an investigation action and hold a second review. Do not label speculation as a root cause to finish on time.

### Small, well-understood incident

Finish early. A 60-minute slot is a ceiling, not a quota.

## Meeting Output Checklist

At the end, you should have:

- agreed impact and scope;
- corrected critical timeline;
- evidence links;
- supported contributing factors;
- response strengths and gaps;
- explicit unknowns;
- a few owned, testable actions;
- final review and sharing plan.

You should not have:

- an individual declared at fault;
- a forced single-cause story;
- dozens of unprioritized tasks;
- unsupported financial or customer claims;
- confidential data copied into a broad document;
- “monitor more” as the final lesson.

A successful 60-minute postmortem is not measured by how quickly the room agrees. It is measured by whether the record becomes more accurate, the system becomes more understandable, and the organization commits to changes it can verify.

## Official Documentation

- [PagerDuty: Postmortem Process](https://response.pagerduty.com/after/post_mortem_process/)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [AWS: Why you should develop a Correction of Error](https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/)
- [Microsoft Azure Well-Architected Framework: Incident management](https://learn.microsoft.com/en-us/azure/well-architected/design-guides/incident-management)
