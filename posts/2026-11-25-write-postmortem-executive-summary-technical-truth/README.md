# Write a Postmortem Executive Summary That Preserves the Truth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem, Incident Management, SRE

Description: Turn a technical incident record into a concise executive summary while preserving impact, causal confidence, recovery milestones, and remaining risk.

An executive summary is often the only part of a postmortem that a decision-maker reads. If it says “the platform was down” when one notification path was delayed, or “the issue is fixed” when responders only rolled back a change, the shorter document has changed the facts.

The task is to compress the incident without removing the distinctions that matter for decisions. Readers need to understand the customer effect, current state, supported explanation, and work still required.

Google's SRE workbook highlights missing context and omitted impact details as weaknesses in postmortems. It also reminds authors that the audience extends beyond the immediate technical team. [Postmortem writing guidance](https://sre.google/workbook/postmortem-culture/)

## Decide what the reader needs to act on

Before drafting, identify the decisions the summary should support. Does leadership need to prioritize prevention work, understand customer follow-up, approve a temporary operating constraint, or track a remaining investigation?

That purpose determines which technical details deserve space. A database identifier rarely belongs in the opening sentence. A continuing restriction on regional failover may matter because it changes operational risk.

Keep the summary connected to the full record. It should stand alone for basic understanding while providing a clear path to evidence, timeline, and action tracking. It should not become an independently maintained version of the incident.

PagerDuty's template places a short overview alongside separate sections for contributing factors, resolution, impact, and actions. Those categories provide useful ingredients for a compact summary without requiring every technical detail to fit in it. [Postmortem structure](https://docs.pagerduty.com/ops-guides/incident-response-guide/postmortem-template)

## Extract a small set of verified facts

Use a fact sheet before writing prose. The following incident is fictional:

| Topic | Reviewed fact for the example |
|---|---|
| Affected capability | Invoice notifications sent to customer systems through webhooks in one region |
| Customer effect | 5,400 unique notifications for 310 accounts arrived more than five minutes late |
| Scope boundary | Payment processing remained within its normal service indicators |
| Start | A delivery-concurrency configuration change at 14:10 UTC triggered the incident |
| New traffic recovery | Newly created notifications met the normal delivery target by 14:32 UTC |
| Backlog recovery | Previously queued notifications finished delivery by 15:05 UTC |
| Integrity check | Reconciliation at 15:10 found no missing notification IDs in the expected event set |
| Supported mechanism | Higher concurrency exceeded a downstream quota; immediate retries prolonged queueing |
| Completed mitigation | The concurrency change was reverted |
| Remaining work | Retry behavior and configuration safeguards remain scheduled work |

A webhook is a notification one system sends to another system's endpoint. Defining that term is more useful for this audience than listing the queue, worker, and proxy products involved.

The two recovery times are deliberately different. “Recovered at 14:32” alone would conceal the customer backlog that remained until 15:05. Conversely, saying the entire service was unavailable until 15:05 would overstate the effect on newly created work.

## Write the impact sentence before the cause sentence

Lead with what people experienced. Then explain the mechanism at the level needed to understand the response and remaining risk.

For this example, “invoice notifications were delayed” is more precise than “billing was unavailable.” The affected unit is a notification, and the customer count is accounts, not individual people. Preserve those units throughout the document.

Use estimates when necessary, but label them. If coverage is incomplete, say which cohort is measured. Do not combine a precise-looking customer percentage with an unrelated denominator such as all registered accounts.

Atlassian's postmortem handbook asks summaries to include the symptom, duration, impact, and mitigation. Treat those as factual requirements to reconcile, not placeholders to fill with whichever numbers are easiest to retrieve. [Incident-summary fields](https://www.atlassian.com/incident-management/handbook/postmortems)

## Use a short narrative with explicit status

A practical target is a few short paragraphs. There is no universal word count; preserve a necessary qualification before cutting another sentence merely to meet an arbitrary limit.

Here is an original executive summary for the fictional incident:

> On 25 November, a configuration change at 14:10 UTC delayed invoice notifications in one region. In total, 5,400 unique notifications for 310 customer accounts arrived more than five minutes late. Payment processing remained within its normal service indicators.
>
> Increased delivery concurrency exceeded a downstream quota, and immediate retries prolonged the queue. Reverting the change restored normal delivery for new notifications by 14:32 UTC. The accumulated backlog finished delivery by 15:05 UTC. Reconciliation at 15:10 found no missing notification IDs in the expected event set.
>
> The incident is mitigated. The Messaging team owns retry improvements due 28 November and a configuration safeguard due 2 December. Until those changes pass validation, the previous concurrency limit remains in place. The service owner will review completion evidence before approving another increase.

This summary keeps the causal chain short while retaining the customer unit, scope, two recovery milestones, bounded integrity finding, owner, deadlines, and remaining operating constraint.

It does not promise that the entire class of failure has been eliminated. The preventive work is still planned. If the causal explanation were unconfirmed, that uncertainty would belong in the second paragraph rather than being hidden in the technical appendix.

## Translate terminology without changing the mechanism

Simplification should explain the relationship between events, not merely replace unfamiliar words with vague language.

| Technical shorthand | Clearer wording for the summary |
|---|---|
| Worker parallelism exceeded the downstream rate limit | Too many notifications were sent concurrently for the receiving service's quota |
| Retry amplification prolonged backlog drainage | Immediate retries added work and delayed clearing the queue |
| Rollback restored steady-state throughput | Reverting the change restored normal delivery for new notifications |
| Event reconciliation found no unmatched IDs | The expected notification records were matched to delivery records, with no missing IDs in that checked set |

Keep a technical term if its exact meaning matters, then define it once. For example, “data loss” should not be used as shorthand for delayed delivery, and a successful retry does not erase the original delay experienced by a customer.

Avoid naming an individual as the cause. A useful explanation identifies the interaction between configuration, limits, and safeguards. Google's blameless-postmortem guidance focuses on the conditions and systems surrounding actions so the review can support improvement. [Blameless analysis](https://sre.google/sre-book/postmortem-culture/)

## Trace each sentence back to the record

Review the draft with a simple claim-to-evidence map:

| Summary claim | Evidence needed |
|---|---|
| 5,400 delayed notifications for 310 accounts | Defined delay threshold, deduplicated event query, account mapping, and time range |
| New work recovered by 14:32 | Delivery-latency measurement for notifications created after mitigation |
| Backlog cleared by 15:05 | Queue or event-completion evidence for previously pending notifications |
| No missing IDs in the checked set | Reconciliation definition, expected set, and result timestamp |
| Prevention work is due on named dates | Assigned tickets with owner, status, and completion criteria |

Do not promote an action ticket from “planned” to “completed” because it sounds better in the summary. If the action is implemented but not validated, state that status instead.

A useful review involves both someone who understands the incident technically and someone who was not part of the response. The first checks fidelity; the second identifies terms and omissions that make the account hard to understand. Neither should need to guess what “resolved” means.

## Keep the summary current as the investigation changes

Record a review date and link to the underlying postmortem. If later evidence changes the impact count or causal conclusion, update the summary and retain a dated note explaining the change. Check other versions that may have copied the earlier wording.

For each sentence, ask whether removing it would change the reader's understanding of impact, confidence, recovery, or remaining risk. Keep the essential distinctions and move supporting implementation detail into the body.

The result should let a reader make an informed decision quickly while giving a technical reviewer no reason to say, “That is simpler, but it is no longer what happened.”
