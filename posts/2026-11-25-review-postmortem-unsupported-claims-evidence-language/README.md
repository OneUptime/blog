# Review Postmortem Drafts for Unsupported Claims and Ambiguous Language

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem, Incident Response, SRE

Description: Review a postmortem draft with evidence-backed comments, explicit scope, precise timelines, and clear action status before approving the incident record.

A postmortem draft can be grammatically clean and still mislead its reader. “The database failed, affecting all users, and the team immediately fixed it” compresses several claims into one sentence. Each claim needs a different kind of support.

Review the factual account before polishing its style. The objective is a document that readers can use to understand the incident and act on its findings, with enough context to assess what is known and what remains uncertain.

PagerDuty's effective-postmortem guidance describes review as constructive feedback on useful changes, rather than merely correcting spelling. It also emphasizes accurate timelines and separating the incident account from proposed improvements. [Effective postmortem review](https://docs.pagerduty.com/ops-guides/incident-response-guide/effective-postmortems)

## Agree on the draft and the review scope

Identify the revision being reviewed and the intended audience. A technical review of the incident account is different from a disclosure review of a public report, though both may be required before publication.

Ask the author for the evidence references, impact-query definitions, relevant timeline, and action tracker. A reviewer should not have to reconstruct the incident from scratch, but they need access to the material behind important claims.

Use a practical order: factual support, completeness, causal reasoning, action quality, and readability. Fixing the meaning first avoids repeatedly polishing sentences that later need to be withdrawn.

## Break broad sentences into claims

Take this deliberately flawed, fictional passage:

> A database failure took down the platform for all customers. The team immediately rolled back the release, which fixed the issue. No data was lost, and monitoring has been improved to prevent recurrence.

This contains at least six assertions: a database failure occurred, the whole platform was unavailable, all customers were affected, the rollback was immediate, rollback caused recovery, and prevention work is complete. The integrity claim adds another assertion requiring its own evidence.

Make those claims visible in review comments. A vague request to “add detail” leaves the author guessing which part is unsupported.

| Draft phrase | Evidence question |
|---|---|
| Database failure | Which operation failed, and what establishes the database as the cause? |
| Platform for all customers | Which capabilities and customer population were measured? |
| Immediately rolled back | What were the detection, decision, and rollback timestamps? |
| Rollback fixed the issue | What supports causation beyond the order of events? |
| No data was lost | What data set was reconciled, and what was outside the check? |
| Monitoring prevents recurrence | What change was delivered, and does it prevent, detect, or mitigate? |

## Check the evidence's scope, not just its existence

A link is useful only when the linked material supports the stated claim. Check its time range, filters, units, aggregation, environment, and retention. A dashboard of one region cannot establish that every customer worldwide was affected.

For the fictional draft, suppose the reviewed evidence establishes:

| Evidence | Supported finding |
|---|---|
| Request query E-1 | 76 of 400 requests to the regional export API returned server errors during 13:02–13:11 UTC |
| Deployment record E-2 | Rollback began at 13:07 and completed at 13:09 |
| Health query E-3 | Error rate for new regional export requests returned to normal by 13:11 |
| Reconciliation E-4 | Expected export-job IDs matched stored job records for the checked cohort |
| Action tracker E-5 | A queue-delay alert is proposed and has not been implemented |

The request error rate is 19% for that query's population. It is not a customer percentage. The records also do not establish the incident's database cause, prove that rollback produced recovery, or demonstrate integrity outside the reconciled job set.

PagerDuty's template separates impact measures and asks timeline entries to link to the evidence behind their timestamps. Those fields help reviewers identify precisely this kind of scope mismatch. [Impact and timeline evidence](https://docs.pagerduty.com/ops-guides/incident-response-guide/postmortem-template)

## Rewrite to the strength of the evidence

A supported revision of the passage could be:

> Between 13:02 and 13:11 UTC, 76 of 400 requests to the regional export API returned server errors. Rollback began at 13:07 and completed at 13:09; the new-request error rate returned to normal by 13:11. The investigation has not established whether rollback caused the recovery. Reconciliation found no missing job records in the checked export cohort. A queue-delay alert is proposed and remains unimplemented.

This version is longer because the original concealed several distinctions. Further editing can improve its flow, but should preserve the measured capability, denominator, sequence, uncertainty, integrity boundary, and action status.

Do not fill missing evidence with a more confident adjective. “Clearly caused” and “definitely resolved” add certainty without adding support.

## Look for missing context that changes the explanation

Review what the draft leaves out. Does it describe a mitigation attempt that failed? Does it distinguish the first alert from the beginning of customer impact? Does it explain why a responder chose one option with the information then available?

Missing context can make a reasonable decision look careless or a temporary recovery look permanent. Google's SRE workbook contrasts weak and stronger postmortems and discusses the importance of context, useful detail, and concrete follow-up. [Postmortem quality examples](https://sre.google/workbook/postmortem-culture/)

Request the smallest addition that resolves the gap. For example: “Include the queue-depth view available at 13:06 and explain whether it influenced the rollback decision.” That is more actionable than demanding a complete transcript of the response.

## Keep causal explanations and proposed fixes separate

A proposed fix can reveal a useful hypothesis, but it does not prove the hypothesis. “We should add a rate limit” is a proposal. “A missing rate limit caused the incident” requires evidence about the workload, resource behavior, and failure mechanism.

Check whether the draft distinguishes the initiating event, contributing conditions, and factors that delayed recovery. It may support some of these more strongly than others.

Avoid comments that push the author toward a favored explanation. Ask what observation supports the proposed mechanism and what alternatives were considered. When the answer is unavailable, a clearly stated investigation limit is more accurate than an invented root cause.

## Make action comments testable

An action should describe the intended outcome, an accountable owner, and evidence of completion. Review its relationship to the finding as well as its wording.

For the proposed queue alert, ask which customer symptom it is intended to detect, what signal and threshold are under consideration, how the response path will be exercised, and who accepts the result. Do not call it prevention if it only changes detection.

A change can be implemented without being verified. Keep those states separate, and check that the executive summary uses the same status as the action tracker.

## Comment on the document without judging the responder

Google's blameless-postmortem guidance focuses on contributing conditions and the information available to people. Review language should support that goal. [Blameless review](https://sre.google/sre-book/postmortem-culture/)

Replace “Why didn't the engineer notice this obvious problem?” with “Which signal would have exposed this condition, and was it available during the decision?” Replace “The team was slow” with a request for the measured interval and the work or uncertainty within it.

A good review comment contains the affected claim, the problem, the needed evidence or revision, and the reason it matters. For example: “The phrase ‘all customers’ exceeds E-1's regional export scope. Please narrow the statement or provide the broader measurement, because the current wording overstates the known impact.”

## Prioritize findings and approve a specific revision

Separate blocking factual problems from requests for clarification and optional style suggestions. An unsupported causal claim or an incorrect impact count deserves more attention than a preferred heading style.

Record how each material comment was resolved: evidence added, wording narrowed, claim removed, or uncertainty retained with an owner. A resolved comment should correspond to an actual revision or a documented decision.

Finally, reread the revised summary, timeline, impact section, and actions together. Check that the correction appears everywhere the old claim was repeated. Approve the specific revision you reviewed, with any remaining limits stated explicitly.

The strongest review leaves the reader with a clearer account and the author with concrete reasoning for each substantive change. It improves the document's usefulness without making certainty a requirement where the evidence cannot support it.
