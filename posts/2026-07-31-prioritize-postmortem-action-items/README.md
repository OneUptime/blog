# Postmortem Action Items Keep Dying in the Backlog: How to Get Them Prioritized

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Postmortem Actions, Reliability, Backlog Management, SRE

Description: Convert postmortem follow-up into risk-owned, prioritized engineering work with explicit tradeoffs, capacity, and closure evidence.

---

Postmortem actions die when the review produces tickets but the planning system treats them as optional suggestions.

The solution is not to create more tickets. It is to connect each action to a demonstrated risk, choose a small set of strong controls, give those controls real priority, and require an explicit decision when the organization will not do the work.

Google’s SRE Workbook warns that actions without clear priority, ownership, tracking, and verifiable end states are easily forgotten. It also recommends rewarding action-item closeout, not only postmortem publication.

## Make the Risk Visible in the Ticket

Every action should link to:

- the incident and measured impact;
- the contributing factor or failed barrier it addresses;
- whether it prevents, detects, contains, mitigates, or improves recovery;
- the likely consequence if left open;
- recurrence or near-miss evidence;
- affected service objective or risk commitment.

Compare:

> Improve retry handling.

with:

> Enforce a shared retry budget at the checkout-to-inventory boundary so one failed inventory request cannot generate more than the approved additional attempts; verify with a load test matching INC-482.

The second item explains the exposure and the intended control.

## Prioritize the Action Portfolio, Not Every Idea

Incident reviews can generate dozens of plausible improvements. Treat them as candidates until the review selects the actions that materially change risk.

Group candidates by:

- prevention;
- detection;
- containment;
- mitigation;
- recovery;
- investigation.

Then identify duplication and dependencies. One rollout scope limit may address several contributing factors. A broad rewrite may depend on a short-term containment control.

PagerDuty’s published process cautions against creating too many follow-up tickets and focuses its own process on high-priority work. The exact number and priority scheme should fit your organization, but the principle is useful: do not bury important controls in an undifferentiated list.

## Use an Explicit Risk Discussion

A lightweight scoring aid can include:

| Dimension | Question |
| --- | --- |
| Impact | What customer, financial, security, or operational harm can recur? |
| Likelihood | Is the trigger common, rare, or increasing? |
| Exposure | How many services, regions, tenants, or workflows share the condition? |
| Control gap | Is there already an independent prevention or containment barrier? |
| Detection | Would recurrence be found before serious impact? |
| Recovery | Is mitigation fast, tested, and reversible? |
| Evidence | Is the proposed action tied to a confirmed factor? |
| Effort and risk | What capacity, dependency, and change risk does implementation require? |

Do not turn the score into fake precision. Use it to expose assumptions and compare actions consistently. A high-impact global destructive path with no scope limit may outrank an easy dashboard improvement even if the path is exercised infrequently.

## Give Reliability Work a Planning Rule

Define what incident severity or risk class changes normal planning. Examples:

- highest-severity incidents require at least one top-priority preventive or mitigative action unless a named risk authority accepts an exception;
- actions protecting against imminent capacity exhaustion enter the current planning window;
- repeated factors trigger a service-level reliability plan rather than another isolated ticket;
- overdue high-risk actions are reviewed by engineering and product leadership;
- a service that spends its error budget shifts capacity from feature work to reliability work according to its agreed policy.

Google’s example error-budget policy pauses nonessential change and prioritizes reliability work when a service exceeds its error-budget policy. Adapt the mechanism to your SLOs and decision model; do not copy Google’s priority names without defining them.

## Assign Capacity, Not Just Priority Labels

A “P1” ticket with no engineer or planning slot is not prioritized.

At the postmortem or the next authorized planning meeting, decide:

- which team owns implementation;
- which work will move to make capacity;
- whether a short-term control is required first;
- which dependency owner has committed;
- who can accept residual risk;
- when progress will be reviewed.

Record the tradeoff:

> The checkout team will deliver the retry budget in the current cycle. The catalog caching change moves to the next cycle. Product and engineering leads approved the change on 2026-08-03.

This makes the organizational decision visible instead of leaving teams to absorb work invisibly.

## Split Large Actions Without Losing the Outcome

“Rebuild deployment safety” will drift. Break it into independently valuable controls:

1. reject empty target filters;
2. add a maximum affected-host limit;
3. preview namespace and host count;
4. require a separate audited workflow above the limit;
5. test rollback under representative load.

Keep a parent reliability outcome that links the pieces and defines when the overall risk is adequately controlled. Closing one subtask must not make the parent appear complete.

For an expensive redesign, use staged risk reduction:

```text
48 hours: disable the unsafe global path
2 weeks: add validated scope limits and audit events
quarter: replace the legacy workflow
each stage: test the failure mode and record residual risk
```

Suggested times are examples, not universal service levels. Set them from incident risk and delivery constraints.

## Make Ownership and Verification Non-Optional

Each committed action needs:

- one accountable owner;
- collaborators and dependency owners;
- priority;
- due date or dated milestone;
- tracking ID;
- acceptance criteria;
- test evidence;
- accepting reviewer;
- status and blocker history.

AWS’s Correction of Error guidance calls for priority, a responsible person, and a due date. Google emphasizes ownership, tracking, prioritization, and measurability.

Do not close an action because code merged. Close it when the specified control is deployed where required and the verification evidence passes.

## Run a Small Follow-Up Review

Use a recurring review for open high-risk actions. Keep it decision-oriented:

- What closed, with what evidence?
- What is blocked, by whom or what dependency?
- Has the due date or exposure changed?
- Did a related incident or near miss occur?
- Does the action still address the factor?
- Is an escalation, rescope, or risk decision required?

Avoid making engineers recite status already available in the tracker. The meeting exists to remove blockers and make tradeoffs.

Useful program measures include:

- open actions by risk and age;
- completion rate by priority;
- actions without owners or verification criteria;
- time from incident to first deployed control;
- reopened actions;
- repeated incidents with an applicable open or closed action;
- accepted-risk decisions and review dates.

A leaderboard of raw ticket count can reward trivial work. Weight attention toward risk reduction and verified outcomes.

## Give Stale Items an Honest State

An action should not remain “open” indefinitely. Choose one:

- **committed:** funded and scheduled;
- **blocked:** dependency and escalation owner recorded;
- **resized:** smaller control accepted with residual risk stated;
- **superseded:** replacement action linked;
- **completed:** acceptance evidence attached;
- **risk accepted:** named authority, rationale, scope, and review date recorded;
- **invalidated:** new evidence shows it does not address the factor.

“Won’t do” can be a legitimate risk decision. Silent backlog decay is not.

## Escalate Repeated Incidents

Google’s SRE Workbook recommends deeper review when failures mirror previous incidents, including asking whether actions are taking too long, feature velocity is outranking reliability, the wrong actions were chosen, or the service needs a refactor.

When repetition occurs:

1. link all related incidents and actions;
2. verify whether each action was truly complete;
3. test whether it addressed the actual failure path;
4. identify shared organizational or architectural conditions;
5. create one service-level reliability plan;
6. assign an executive or senior engineering sponsor able to resolve capacity conflicts.

Do not generate another duplicate set of low-priority tickets.

## A Practical Prioritization Record

```text
Risk:
Routine deployment can target every production region when the filter
is empty. INC-731 caused 38 minutes of global degradation.

Chosen control:
Reject empty filters and cap the routine workflow at one region.

Priority:
Immediate reliability work; global workflow remains disabled until deployed.

Owner:
Deployment platform owner

Dependencies:
Regional inventory API owner

Acceptance:
Integration tests cover empty, oversized, and one-region scopes;
production audit confirms only the restricted workflow is available.

Tradeoff:
Two planned workflow features move to the next planning cycle.

Residual risk:
Emergency global workflow remains available to incident command under
separate authorization; review after its first drill.
```

That record lets planners compare real work and lets leaders own the tradeoff. A postmortem action becomes prioritized when the organization commits capacity and a decision path, not when someone adds a red label.

## Official Documentation

- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [Google SRE Workbook: Example Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [AWS: Why you should develop a Correction of Error](https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/)
- [PagerDuty Incident Response: Postmortem Process](https://response.pagerduty.com/after/post_mortem_process/)
- [Microsoft Azure Well-Architected Framework: Incident Management](https://learn.microsoft.com/en-us/azure/well-architected/design-guides/incident-management)
