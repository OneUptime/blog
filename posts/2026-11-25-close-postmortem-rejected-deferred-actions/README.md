# Close a Postmortem When Actions Are Rejected or Deferred

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem, Incident Management, SRE

Description: Close the incident review without hiding unfinished work by recording rejected and deferred actions, residual risk, decision authority, and revisit triggers.

A postmortem proposes five improvements. Two are accepted, one is postponed, and two are rejected after review. The incident has ended, but the document stays open because nobody knows whether “closed” means the analysis is finished or every suggestion has been implemented.

Define those states separately. A review can reach a documented conclusion while implementation work and accepted risks continue in their own tracked processes. The closure record must make that distinction visible.

PagerDuty's documented workflow allows a postmortem to reach its closed state while outstanding issues remain tracked in Jira. That is a useful example of separating the review lifecycle from the lifecycle of its corrective work. [Postmortem status definitions](https://docs.pagerduty.com/ops-guides/incident-response-guide/postmortem-process)

## Define what closure means in your process

Write down the criteria before trying to close a difficult review. A reasonable set is that the impact and supported explanation have been reviewed, unresolved questions have owners, each proposed action has a decision, and remaining work is tracked somewhere durable.

Your organization may require additional approvals or completion of particular controls. Follow that policy. Changing a ticket's status must not bypass an existing release restriction or risk-acceptance requirement.

Use three separate questions during review: Is the incident mitigated? Is the analysis reviewed? Are the corrective changes implemented and verified? A single green status cannot answer all three reliably.

## Give every action a meaningful disposition

A disposition is the decision about what will happen to a proposed action. Use states that distinguish intent from evidence of completion.

| State | Meaning | Evidence needed |
|---|---|---|
| Accepted | The responsible owner has agreed to the work | Owner, tracked task, target date, acceptance criteria |
| Deferred | The work is not proceeding now | Reason, residual risk, decision owner, revisit condition |
| Rejected | This proposal will not be pursued under the recorded decision | Rationale, alternatives considered, risk treatment |
| Superseded | Another proposal replaces it | Link to the replacement and confirmation that it covers the intended outcome |
| Implemented | The change has been delivered | Deployment or procedure-change evidence |
| Verified | The expected improvement has been checked | Relevant test, exercise, or operational evidence |

“Accepted” is not a synonym for “done.” A deferred action does not have a hidden implementation promise. A rejected action still needs a rationale that a future reviewer can understand.

PagerDuty's meeting guidance explicitly recognizes that some actions may not justify their cost or may be delayed by other priorities. It recommends making those decisions and their implications clear. [Discussing action tradeoffs](https://docs.pagerduty.com/ops-guides/postmortem-best-practices/postmortem-meeting)

## Evaluate the proposal against the actual finding

Before discussing priority, establish what failure condition the action addresses. Then ask how the proposed change would reduce impact, which assumptions it relies on, and what evidence could demonstrate that benefit.

Consider a fictional incident in which a bulk-import workload exhausted a shared worker queue. A proposal to deploy another regional frontend might not address the same shared queue. Rejecting that proposal could be a sound technical decision if the review records the dependency and chooses a relevant alternative.

The finding remains: the shared queue allowed bulk work to delay interactive requests. The rejected regional proposal should not make that finding disappear from the incident record.

A capacity limit, separate queue, or admission-control change might address the condition more directly. Admission control means deciding which work to accept before the system becomes overloaded. These are candidate approaches, not automatic recommendations; the team still needs to evaluate their tradeoffs and behavior.

## Record a deferral as a decision with an expiry point

A useful deferral record is specific enough to revisit without repeating the whole postmortem. Here is an original fictional example:

| Field | Recorded decision |
|---|---|
| Action | Separate interactive and bulk-import worker capacity |
| Decision | Deferred pending a controlled load test and capacity estimate |
| Decision date | 25 November 2026 |
| Accountable risk owner | Service owner authorized under the team's risk process |
| Implementation contact | Processing team lead |
| Remaining exposure | A large import can still increase interactive queue delay |
| Interim control | Existing import-concurrency cap remains enabled |
| Review date | 9 December 2026 |
| Earlier trigger | Another interactive-delay incident or a planned increase in import limits |
| Next evidence | Load-test results, cost estimate, and verified behavior of the current cap |

The review date is a decision deadline, not an implied completion date. If the load test is not ready, the owner must decide whether to extend the deferral, change the approach, or escalate. The date should not silently roll forward.

An interim control also needs evidence. If the concurrency cap has not been verified for the relevant workload, describe it as an assumption to test rather than a proven protection.

## Make risk acceptance explicit and properly owned

Residual risk is the exposure that remains after the current response and controls. State it in operational terms: which customer capability can still fail, under what known conditions, and how the team would detect and respond to it.

The person assigned to write code may not have authority to accept that risk. Route the decision through your established ownership and escalation process. The postmortem facilitator records the decision; they do not acquire risk authority simply by owning the document.

Use existing reliability policy to inform the tradeoff. Google's example error-budget policy shows how service performance can change release priorities and require reliability work. It is an example policy, not a universal threshold to copy into every organization. [Example error-budget policy](https://sre.google/workbook/error-budget-policy/)

An error budget is the amount of unreliability allowed by a service's reliability target over a defined period. If your actual policy requires action after that allowance is exhausted, a postmortem decision should reference and satisfy the policy rather than invent an exception.

## Keep rejected work searchable

Preserve the proposal, the reason for rejection, and any replacement. Avoid deleting the ticket or rewriting it to look as though it was completed. A future incident may make the earlier tradeoff worth revisiting.

Distinguish different reasons: the proposal does not address the mechanism, another change covers the outcome, the expected benefit is too small for its cost, or the evidence is insufficient to choose it yet. The last case may call for an investigation task instead of permanent rejection.

If a replacement is used, compare its acceptance criteria with the original objective. A new dashboard may improve detection, but it does not necessarily replace a proposed prevention mechanism. Record that difference so the residual risk remains understandable.

## Close the review with a short decision summary

The closure note should be readable without opening every action ticket. For example:

> Analysis reviewed on 25 November. The queue-isolation proposal is deferred to a 9 December decision, with the service owner responsible for the remaining exposure. The regional-frontend proposal is rejected because it retains the shared queue dependency. The import-cap verification task is accepted and tracked separately. No permanent queue-isolation improvement is claimed as complete.

This note describes the review outcome without hiding incomplete work. Google emphasizes that postmortem actions need concrete follow-through; linking decisions to tracked work helps the document continue to support improvement after review closure. [Actionable postmortems](https://sre.google/workbook/postmortem-culture/)

## Revisit decisions when their assumptions change

A recurring incident, larger workload, changed architecture, expired interim control, or new evidence can invalidate an earlier decision. Record those triggers where the risk owner already reviews work, rather than relying on someone to remember the postmortem.

At the revisit, compare the current conditions with the original rationale. Record a new dated decision and preserve the old one as history. Escalate missed reviews through the existing ownership process.

The review is ready to close when the organization has made explicit, reviewable decisions about its findings and follow-up. That closure should make remaining work easier to see and act on, while verified completion remains a separate claim supported by evidence.
