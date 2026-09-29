# How to Run Incident Command with a Small Team: Combining IC, Operations, Communications, and Scribe Roles Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Incident Management, SRE, On-Call

Description: Run incident command with one to four responders by making combined roles explicit, protecting operational attention, and splitting responsibilities before coordination fails.

A two-person team cannot fill four incident roles with four different people. It can still make four responsibilities visible: someone coordinates decisions, someone changes production, someone communicates impact, and someone records what happened. The dangerous gap is an unnamed responsibility that everyone assumes another person owns.

Google's incident response model allows the incident commander to retain undelegated roles and delegate them as the response grows. PagerDuty's starting guidance favors separating incident command from remediation. These are useful foundations for a small-team procedure, rather than evidence that every incident needs the same staffing chart. See [Google's incident response chapter](https://sre.google/workbook/incident-response/) and [PagerDuty's getting-started guide](https://response.pagerduty.com/getting_started/).

## Assign Responsibilities Before Assigning Titles

Write a compact role card when declaring the incident:

```text
Incident: INC-284 | checkout failures | declared 14:05 UTC
Command and decisions: Morgan
Operations and production changes: Lee
Customer/internal communications: Morgan
Decision and action record: Morgan; Lee records command outcomes
Next checkpoint: 14:15 UTC
Backup requested: platform secondary
```

A role card states who is accountable now. It should not imply that an incident commander can authorize changes outside their normal emergency authority. Database recovery, security containment, and customer notifications may have separate decision owners.

The following staffing patterns are proposed operating practices. Adapt them to responder experience, incident complexity, and the tools available.

| Available responders | Initial arrangement | Main pressure point |
| --- | --- | --- |
| One | First responder temporarily covers every responsibility and requests help | Debugging consumes all communication time |
| Two | Commander covers communications and short notes; operator investigates and changes production | Commander cannot write lengthy updates while tracking decisions |
| Three | Commander; operator; communications plus scribe | Scribe may miss actions while answering stakeholders |
| Four | Separate command, operations, communications, and scribe | Roles still need explicit coordination |

A fifth expert need not become another commander. Give them a bounded investigation and a reporting checkpoint.

## Make Solo Response a Temporary Mode

A solo responder should first declare the incident, request the next responder, and record the current impact. Then use a preapproved mitigation if its scope and recovery procedure are understood.

A useful solo checklist is short enough to read under pressure:

1. Identify the affected customer journey and the evidence for impact.
2. Open the shared incident record and page backup.
3. Record the intended action, target, and abort condition.
4. Execute one bounded action and record the result.
5. Recheck impact and the backup acknowledgment before taking another action.

If production changes require two people under your actual access policy, a small team does not remove that requirement. Escalate through the established emergency route. Conversely, do not invent a new approval meeting for an already authorized routine mitigation.

Set a reminder for the next update. A timer does not replace a communications lead, but it makes an otherwise invisible responsibility harder to forget.

## Protect the Operator's Attention

For two responders, keep most interruptions away from the operator. The commander collects stakeholder questions, states the next decision, and asks for a brief outcome at agreed checkpoints.

Use a repeatable exchange:

```text
Operator: Propose disabling recommendation enrichment for checkout.
Scope: production checkout only; payments remain unchanged.
Expected result: dependency timeouts disappear within two minutes.
Abort: checkout errors rise or order totals differ from the control.
Commander: Proceed under the existing feature-flag runbook.
Operator: Flag changed at 14:11 UTC; verification in progress.
```

The commander can record these five lines without transcribing the whole debugging session. The operator should paste a restricted evidence link and a concise result, rather than a terminal dump that might contain credentials or customer data.

PagerDuty describes the scribe as tracking context and actions during the response. Use that responsibility to prioritize decisions, changes, owners, and results over verbatim transcription. [PagerDuty scribe guidance](https://response.pagerduty.com/training/scribe/)

## Split Roles When Work Starts Getting Dropped

Headcount alone is a weak signal for when to delegate. Watch for observable symptoms:

- Two production changes overlap without a shared plan.
- The next customer update is late because the commander is debugging.
- Responders ask the same question because the decision record is missing.
- Several teams need conflicting actions on the same dependency.
- The commander cannot state the current impact or next checkpoint.

When the third responder arrives, hand over the busiest combined responsibility. If customers and executives need frequent updates, delegate communications first. If the change stream is complex, assign a scribe or deputy. If the commander is the only database specialist, transfer command and let that specialist become the operator.

Make every transfer explicit:

```text
14:20 UTC: Priya accepts incident command from Morgan.
Morgan now owns database operations.
Priya owns communications until a communications lead accepts it.
Next customer update remains due at 14:30 UTC.
```

Google's incident management guidance calls for an acknowledged handoff and notification to other responders. A name change in a document without acceptance is insufficient. [Clear, live handoff](https://sre.google/sre-book/managing-incidents/)

## Rehearse the Smallest Team You Actually Have

Run a brief drill with the staffing available overnight. Include an incoming customer question, a failed mitigation, and a responder joining halfway through. Check whether the team can identify the decision owner, latest production change, and next communication deadline at every stage.

Afterward, repair the first responsibility that was dropped. That may mean a shorter status template, a better backup route, or another person on call. A process cannot manufacture capacity when a single responder faces several unsafe, simultaneous tasks.

## Conclusion

Small teams can combine incident roles when the responsibilities remain explicit and the workload remains manageable. Start with a visible role card, protect operational attention, keep a concise action record, and delegate as soon as coordination or communication starts slipping.
