# How to Write Useful Status Updates When There Is No New ETA: Facts, Unknowns, Actions, and Next Checkpoint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Incident Management, Reliability

Description: Write incident updates that remain useful without a recovery estimate by stating current impact, remaining uncertainty, concrete actions, and the next communication checkpoint.

An incident can remain unresolved for an hour while the response makes substantial progress. Teams may eliminate a suspected cause, reduce the affected population, or discover that a proposed workaround is unsafe. Repeating “we are investigating” hides that progress. Inventing an ETA creates a promise the team cannot support.

Give customers information they can use now: what is failing, whether their next action should change, what is being attempted, and when they will hear from you again. Atlassian recommends early, frequent, precise communication with consistent information across channels. The structure below is an editorial practice for applying that advice when recovery time is unknown. [Atlassian Statuspage: Incident Communication Tips](https://support.atlassian.com/statuspage/docs/incident-communication-tips/)

## Separate Three Different Times

An update can contain several times, but each needs a label:

| Time | Meaning |
| --- | --- |
| Evidence timestamp | When the reported observation was measured |
| Recovery estimate | When the user-visible service is expected to recover |
| Next communication checkpoint | When another update will be published |

The third is under the communications team's control even when the second is unknown. “Next update by 11:30 UTC” must not read like “service returns at 11:30 UTC.” Use an explicit date for incidents that cross midnight or involve multiple regions.

Keep an internal investigation deadline separate too. A team expecting to finish a test in ten minutes has not promised that its result will restore service.

## Build Each Update from Four Questions

**Facts:** What user outcome is currently affected, in which population, according to what recent evidence? Prefer “new exports remain queued in the EU region” to “the backend is experiencing issues.”

**Unknowns:** What important question remains unanswered? Say whether the cause, affected population, recovery duration, or data correctness is still being checked. Do not list every engineering hypothesis.

**Actions:** What work could change the outcome or reduce uncertainty? “We are testing whether a reduced worker concurrency allows the backlog to drain” is more useful than “our team is working hard.”

**Next checkpoint:** When will customers hear again, and will a meaningful change trigger an earlier update?

The message need not use these as visible headings. They are a drafting checklist, not a rigid public template.

## Example: Still Degraded, No Reliable ETA

```text
29 September, 11:00 UTC — Export processing remains delayed for EU
workspaces. Exports submitted since 10:12 UTC may remain queued;
viewing existing reports is operating normally in our current checks.

We have stopped new worker deployments and are testing a change to
reduce database contention. We do not yet have a reliable recovery
estimate. Please avoid resubmitting the same export while it is queued.

We will publish another update by 11:30 UTC, or sooner if impact changes.
```

This illustrative statement assumes the team has verified the affected cohort, deployment action, and advice about resubmission. Never recommend a workaround just because it sounds reassuring. Confirm that it does not duplicate writes, lose work, bypass controls, or impose unexpected cost.

## Explain What Changed Since the Last Update

An unchanged overall status does not mean the evidence is unchanged. Maintain a small internal delta record:

```text
Previous: EU export processing delayed; scope being checked.
New evidence: US exports complete; EU queue age still rising.
Action completed: rollout stopped; no measurable recovery yet.
Current action: constrained worker test, results due 11:20 UTC.
Customer instruction: do not resubmit queued exports.
```

Use that record to write the next message. If nothing material changed, state that plainly: the same population remains affected, the earlier workaround remains valid, and the next test is still underway. Avoid filler about “all available resources” unless it helps the customer make a decision.

## Do Not Turn Absence of Evidence into Assurance

“We have not observed data loss” and “there was no data loss” carry different confidence. Even the first needs a meaningful inspection behind it. If reconciliation has not started, say that data integrity checks are pending when that information matters to affected users.

Similarly, a green infrastructure dashboard does not prove the customer journey recovered. Attribute observations precisely: “our synthetic export completes” is weaker than “queued customer exports are draining and new exports meet the normal completion target.”

When an earlier statement becomes incorrect, publish a correction with the affected scope. Quietly editing a previous update can leave subscribers relying on the original notification.

## Use a Review and Publishing Loop

Have the communications owner draft from the current incident record. Ask the relevant technical lead to verify impact, action, and workaround. Publish through the designated status channel, then reuse the same facts in support replies and account updates.

Record the publication timestamp and the next deadline in the incident channel. Assign a backup publisher for shift changes. If the technical reviewer is occupied, publish the last verified facts with their timestamp and explicit uncertainty instead of silently missing the promised checkpoint.

Choose cadence according to impact and how quickly useful information changes. The example uses thirty minutes; it is not a universal requirement. Publish immediately when impact expands, a workaround becomes unsafe, or the recovery assessment changes materially.

## When an ETA Finally Becomes Defensible

An estimate should have an owner and a basis: a measured backlog drain rate, a bounded rollout, or a provider commitment with clearly stated uncertainty. Include the remaining dependencies. Distinguish “the mitigation deployment should finish around noon” from “all delayed work should complete around noon.”

If an estimate slips, explain what changed and publish the revised assessment before the original time passes when possible. A checkpoint promise should continue even when the recovery estimate is withdrawn.

## Conclusion

An update without an ETA can still reduce uncertainty. Anchor it in verified customer impact, name the important unknown, describe the current action, and commit to a specific next communication time. That gives users a dependable information flow while engineers continue working toward recovery.
