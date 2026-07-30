# What Belongs in a Blameless Postmortem Template? Impact, Timeline, Factors, and Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Blameless Postmortem, Template, Root Cause Analysis, SRE

Description: Use a postmortem template that preserves evidence, distinguishes contributing factors from speculation, and turns learning into verifiable action.

---

A postmortem template should make a high-quality investigation easier. It should not force every incident into the same single-cause story.

The essential record answers:

- What happened?
- Who or what was affected?
- What did responders know and do over time?
- Which conditions produced and shaped the impact?
- What worked?
- What will change?
- How will the organization verify those changes?

## Design Principles

### Separate facts, inferences, and unknowns

A timestamp from an immutable deployment record is evidence. “The cache probably overloaded because traffic rose” is a hypothesis until supported. Label the difference.

### Describe actions without judging people

Record who held an operational role when it helps reconstruct the response, but avoid motive and character claims. Use roles or teams in the narrative unless individual identity is genuinely necessary.

### Prefer contributing factors to one root cause

Complex incidents usually require a trigger, vulnerable condition, propagation path, missing or ineffective defense, and response conditions. A single “root cause” field invites premature closure.

### Make actions testable

Every action needs an owner, priority, due date, completion criterion, and effectiveness check.

### Protect sensitive information

Use access classification, redact customer identifiers and secrets, and link to restricted evidence instead of copying it into a widely shared document. Google SRE notes that even internal postmortems must not include information identifying end users.

## Copyable Template

```markdown
# [Incident title]

Incident ID:
Date:
Severity:
Status: Draft | In Review | Reviewed | Closed
Postmortem owner:
Facilitator:
Incident commander:
Affected services:
Document classification:
Review date:

## Executive Summary

[Two or three paragraphs: what happened, user impact, duration,
how service was restored, and the most important planned changes.
Write this after completing the analysis.]

## Impact

- User-visible start:
- User-visible end:
- Duration:
- Affected population:
- Symptoms experienced:
- Quantified impact:
- Business, contractual, security, privacy, or regulatory impact:
- How impact was measured:
- Estimates and uncertainty:
- Recovery criterion:

## Detection

- First detectable signal:
- First actual detection:
- Detection source:
- Incident declaration:
- Detection gap:
- Why existing detection did or did not work:

## Incident Response Roles

| Role | Team or participant |
| --- | --- |
| Incident commander | |
| Technical responders | |
| Scribe | |
| Customer or communications liaison | |
| Other involved teams | |

## Timeline

All normalized times are [UTC]. Preserve original timestamps in evidence.

| Time | Event or observation | Information available then | Source | Confidence |
| --- | --- | --- | --- | --- |
| | | | | |

## Technical and Operational Narrative

[Explain the failure and response in plain language. Distinguish the
trigger, failure mechanism, propagation, impact, mitigation, and recovery.]

## Contributing Factors

### Technical and architectural
- [Add factor and supporting evidence]

### Change and delivery
- [Add factor and supporting evidence]

### Observability and detection
- [Add factor and supporting evidence]

### Process, documentation, and tooling
- [Add factor and supporting evidence]

### Ownership, organization, and incentives
- [Add factor and supporting evidence]

### External or environmental
- [Add factor and supporting evidence]

For each factor, link evidence and explain how it influenced likelihood,
blast radius, detection, diagnosis, mitigation, or recovery.

## Defenses and What Went Well

- Controls that limited impact:
- Effective response decisions:
- Useful tools, documentation, or communication:
- Fortunate conditions or near misses that should not be relied upon:

## What Did Not Go Well

- Detection:
- Diagnosis:
- Coordination:
- Mitigation:
- Communication:
- Verification:

Describe conditions and effects, not personal fault.

## Unknowns and Disputed Findings

| Question or competing hypothesis | Why it matters | Evidence owner | Due |
| --- | --- | --- | --- |
| | | | |

## Corrective Actions

| Action | Condition addressed | Type | Owner | Priority | Due | Done when | Effective when |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | Prevent / Detect / Mitigate / Respond | | | | | |

## Lessons and Broader Risk

- Where else can these conditions exist?
- Which similar services or workflows were checked?
- What should other teams learn?
- Are standards, templates, or training changing?

## Communications

- Internal audience and link:
- Customer communication:
- Status page or regulatory communication:
- Reviewers:

## Evidence

- Incident channel or call record:
- Dashboards and saved queries:
- Alerts:
- Logs and traces:
- Deployment and configuration history:
- Tickets and customer reports:
- Related incidents and postmortems:

## Review and Closure

- Factual reviewers:
- Approval date:
- Action tracking location:
- Effectiveness review date:
- Closure criteria:
- Final status:
```

## How to Write Each Section

### Summary

Write it last. It should stand alone and use measured impact. Avoid saying “no impact” merely because no support ticket arrived.

AWS’s Correction of Error guidance recommends a self-contained summary covering who was affected, when, where, how, detection, mitigation, and prevention.

### Impact

Quantify users, requests, transactions, data, regions, latency, or business processes where possible. State uncertainty and the query used. Separate:

- user-visible impact;
- internal operational impact;
- second-order impact;
- risk exposure without observed harm.

### Detection

Record the first time the condition was theoretically observable, the first signal emitted, the first human or automation recognition, and incident declaration. These are different.

### Timeline

Begin before the alert when the trigger or latent condition is known. Use one normalized time zone, retain original timestamps, cite a source for critical rows, and include what responders knew then.

Google’s example postmortem describes the timeline as a screenplay built from the incident state document and supplemented with other relevant entries.

### Factors

For each factor, ask how it affected:

- incident likelihood;
- blast radius;
- detection;
- diagnosis;
- mitigation;
- recovery.

Avoid a list of generic weaknesses. If a factor did not influence the incident, it belongs in the normal backlog, not this causal record.

### What went well

Record controls and decisions worth preserving. Include “lucky” defenses or spare capacity that worked but cannot be assumed next time.

### Actions

Tie each action to a factor. Good examples:

> By 30 September, the identity-platform owner will reject production role grants without an expiring request ID; the integration test will demonstrate denial and expiry.

> By 15 October, the checkout team will alert when the five-minute successful-payment SLI burns error budget at the approved threshold; a controlled test will verify paging and runbook linkage.

Avoid:

- be careful;
- retrain the team;
- improve monitoring;
- add tests;
- update documentation.

Those phrases can become good actions only after specifying what changes and how it is verified.

## Keep Workflow Metadata Outside the Narrative

Status, owner, reviewers, classification, and action tracking are operational metadata. Keeping them structured enables:

- reminders;
- action aging;
- trend analysis;
- review completeness;
- appropriate access;
- finding related incidents.

Google SRE describes formal review and an organizational repository as important parts of sharing and learning.

## Do Not Overload the Template

Use conditional sections for security, legal, data loss, or external communication. A template with 80 mandatory fields encourages empty prose and slows low-complexity reviews.

Allow “not applicable,” but require a reason for critical fields such as impact, timeline, contributing factors, and actions. If no corrective action is justified, document the risk decision and approver.

## Validate the Postmortem Before Closure

Ask:

- Can another engineer understand user impact?
- Does each critical timeline event have evidence?
- Are hindsight discoveries separated from information available during response?
- Does the analysis go beyond a person’s action?
- Are multiple relevant conditions represented?
- Does every action address a supported factor?
- Can completion and effectiveness be verified?
- Are privacy and access rules satisfied?
- Has the draft been reviewed by the involved teams?

A good template is a scaffold for honest reasoning. It preserves the incident as evidence, prevents a single-cause shortcut, and makes every lesson accountable to a future test.

## Official Documentation

- [Google SRE: Example Postmortem](https://sre.google/sre-book/example-postmortem/)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [PagerDuty: Postmortem Template](https://response.pagerduty.com/after/post_mortem_template/)
- [AWS: Why you should develop a Correction of Error](https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/)
- [Microsoft Azure Well-Architected Framework: Incident management](https://learn.microsoft.com/en-us/azure/well-architected/design-guides/incident-management)
