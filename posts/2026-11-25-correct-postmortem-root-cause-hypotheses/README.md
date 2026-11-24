# Correct a Postmortem That Named the Wrong Root Cause

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem, Root Cause Analysis, Incident Response

Description: Replace an unsupported causal claim with a clear evidence record, calibrated confidence, useful rejected hypotheses, and a traceable correction.

The first postmortem draft says a deployment caused the incident. Later, someone finds affected requests from before the deployment began. The draft now contains a confident explanation that its own evidence contradicts.

Correct the claim promptly, but keep the reasoning history. A changed conclusion is useful information: it shows which evidence mattered and prevents the same explanation from being accepted again without scrutiny.

Google's SRE workbook contrasts poor and effective postmortems, emphasizing clear analysis and useful follow-up rather than treating the document as a formality. A review that changes the initial explanation is doing valuable work. [Postmortem practices](https://sre.google/workbook/postmortem-culture/)

## Identify the exact claim that failed

Consider this fictional export-service incident:

| UTC time | Available record |
|---|---|
| 08:56 | Archived worker logs show repeated failed export attempts on release 2.7 |
| 09:00 | Deployment audit records the start of release 2.8 rollout |
| 09:07 | Queue-lag alert fires |
| 09:18 | Responders begin rolling back release 2.8 |
| 09:19 | Responders also limit new export traffic |
| 09:24 | Queue lag returns to its usual range |

The original draft said, “Release 2.8 introduced the retry loop that started the outage.” Verified pre-rollout retry records contradict that specific initiating-trigger claim.

They do not prove that release 2.8 had no effect on the incident's later severity. Likewise, recovery after rollback does not isolate rollback's effect when responders also limited traffic. Make the correction as narrow as the evidence allows.

Before relying on the new record, verify its timestamp source, time zone, worker identity, and version field. A delayed log ingestion timestamp or a mislabeled instance can produce another misleading story.

## Give evidence and hypotheses separate identities

An observation is a recorded fact with a source and scope. A hypothesis is a proposed explanation that connects observations. Keep them separate so one can change without silently rewriting the other.

For the fictional case, an evidence register might contain:

| Evidence ID | Observation | Scope and limitation |
|---|---|---|
| E1 | Deployment audit starts release 2.8 at 09:00 UTC | Applies to the listed worker pool; verify no earlier canary elsewhere |
| E2 | release 2.7 workers logged retries at 08:56 UTC | Establishes earlier retries; does not measure all customer impact |
| E3 | Some dependency responses were429 at 09:01 UTC | Establishes observed throttling then; earlier responses were not retained |
| E4 | Rollback and traffic limiting preceded recovery | Multiple interventions prevent isolating either one's effect |

The record should link to preserved evidence, not only a person's interpretation of it. PagerDuty's postmortem guidance recommends supporting timeline entries with the underlying data and asking for review before sharing the result. [Evidence and review workflow](https://docs.pagerduty.com/ops-guides/postmortem-best-practices/step-by-step)

Do not count the same evidence twice. Three dashboards built from one metric stream are three views of one source, not three independent confirmations.

## Use a hypothesis ledger with explicit limits

A hypothesis ledger is a small table tracking candidate explanations. The following fields are a practical writing convention, not a formal probability model:

| ID | Claim | Current assessment | Evidence and next discriminator |
|---|---|---|---|
| H1 | release 2.8 initiated the retry behavior | Contradicted for the recorded pool | E1 and E2 place retries before rollout; verify canary scope |
| H2 | Dependency throttling prolonged the backlog | Supported as a contributor, not established as the trigger | E3 shows 429 responses; inspect retry timing and earlier dependency evidence |
| H3 | A traffic burst exhausted processing capacity | Open | Need accepted-job rate and service-time distributions before 08:56 |
| H4 | Rollback alone restored service | Not established | E4 includes a second intervention; a controlled comparison is missing |

A useful discriminator is an observation that would make competing explanations predict different results. For H2, compare retry scheduling and backlog growth during a controlled throttling exercise. Simply collecting more CPU graphs may not separate H2 from H3.

Include evidence against a preferred hypothesis in the same row or linked analysis. Requiring that field helps reviewers notice when the document only accumulates supporting examples.

## Calibrate confidence without inventing percentages

Avoid assigning “90% confidence” because the explanation sounds convincing. Unless a team has a defined, calibrated probabilistic method, that number hides the judgment behind false precision.

Use plain descriptions tied to evidence:

| Description | Meaning in this review |
|---|---|
| Observed | A specific event or condition is present in identified records |
| Supported explanation | Several relevant observations fit a mechanism; important alternatives remain |
| Open hypothesis | Plausible, but the evidence does not yet distinguish it from alternatives |
| Contradicted within stated scope | Reliable evidence conflicts with a necessary part of the claim |

These categories describe different kinds of statements. “Observed429 responses” does not automatically become “throttling caused the entire outage.” Confidence in a measurement and confidence in a causal explanation are separate judgments.

A reproduction also has limits. Recreating a similar symptom in staging establishes that a mechanism is possible under those conditions. Compare its timing, affected components, and failure signatures with the incident before calling it an explanation of the production event.

## Preserve red herrings without blaming their authors

A red herring is an apparently relevant clue that did not explain the incident as initially believed. Record why it attracted attention, what evidence changed the assessment, and whether any useful question remains.

For example:

> The deployment was investigated because the alert followed the rollout and a rollback was available. Archived logs later showed retry behavior on the preceding release before rollout. We therefore removed the claim that release 2.8 initiated the retries. Whether it amplified the backlog remains open. The rollback decision is recorded separately from the final causal assessment.

This explains the investigation without describing responders as careless. Etsy's blameless-postmortem approach emphasizes understanding why actions made sense in the circumstances instead of substituting hindsight and personal blame for explanation. [Etsy's account of blameless review](https://www.etsy.com/codeascraft/blameless-postmortems)

Do not erase an investigated theory merely because it was wrong. Its evidence trail can save the next responder from repeating an expensive dead end, while its unresolved portion may still deserve attention.

## Correct the summary and dependent actions together

Replacing one sentence in the root-cause section is insufficient if the executive summary, incident label, and action tickets still assert the earlier cause.

For the fictional case, a corrected paragraph could read:

> The incident involved repeated export failures and accumulating queue lag. Our first draft attributed initiation to release 2.8. Verified release 2.7 logs show retries before that rollout, so this attribution has been withdrawn for the recorded worker pool. Dependency throttling was observed during the incident and may have prolonged it. The initiating condition remains unresolved. Recovery followed both rollback and traffic limiting, and their separate effects are not established.

Review each follow-up against the revised evidence. A task to fix a purported 2.8 retry regression may now require investigation before implementation. A task to preserve dependency response classes may remain justified because the evidence gap is confirmed. PagerDuty's template separates contributing factors, resolution, and follow-up work; keeping those distinctions visible makes this review easier. [Postmortem structure](https://docs.pagerduty.com/ops-guides/incident-response-guide/postmortem-template)

## Publish a traceable correction

Keep a dated revision note identifying the replaced claim, the new evidence, the revised conclusion, and the affected actions. Have the postmortem owner and a reviewer check it. If the earlier explanation reached another audience, provide the correction through the appropriate existing communication process rather than silently editing a document they may never reopen.

Before approving the revised draft, verify that every hypothesis has a scope, important alternatives are visible, rejected explanations retain their evidence trail, and no mitigation result is presented as an isolated experiment. The goal is a record that becomes more accurate as evidence improves, while remaining honest about what each version actually established.
