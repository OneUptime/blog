# Turn Recovery Drill Failures into an Owned Backlog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Reliability, Backlog, Site Reliability Engineering

Description: Convert recovery exercise evidence into prioritized, owned, measurable reliability work and verify each fix in a retest.

---

A failed recovery drill is valuable only if it changes the system. “Lessons learned” in a slide deck decay quickly; a reliability backlog with owners, deadlines, acceptance tests, and retest evidence closes the loop.

NIST SP 800-184 emphasizes using recovery metrics for continuous improvement. CISA's exercise materials include an After-Action Report and Improvement Plan. Apply those ideas with engineering issue discipline.

## Preserve Facts Before Interpretation

Within the exercise, capture:

- scenario, scope, fidelity limits, and objectives;
- event timeline and decision log;
- planned versus actual RTO/RPO stage durations;
- failed gates, retries, workarounds, and manual interventions;
- data-integrity and business-transaction results;
- commands, tool versions, configuration revisions, and logs;
- where the runbook differed from reality;
- what went well and where the outcome depended on luck.

Separate observation from explanation:

~~~text
Observation:
  Restore identity received AccessDenied for backup b-4812 at 01:08 UTC.

Impact:
  Data restore started 17 minutes late; RTO missed by 9 minutes.

Contributing conditions:
  Role policy did not include the new backup vault.
  Credential preflight tested only the old vault.
  Infrastructure change did not trigger runbook review.
~~~

“Operator forgot permission” blames a person and misses the missing policy automation and preflight coverage.

## Classify Every Finding

Useful categories include:

- architecture or single point of failure;
- backup, replication, or recovery-point integrity;
- dependency or startup order;
- capacity, quota, or performance;
- identity, secret, certificate, or DNS;
- automation safety, idempotency, or observability;
- runbook ambiguity or missing prerequisite;
- incident command, approval, communication, or escalation;
- vendor or external dependency;
- test-environment fidelity;
- data reconciliation or business acceptance;
- cleanup, security, privacy, or cost.

Also classify the control intent:

- **prevent:** remove or constrain the failure mode;
- **detect:** reveal it before or during recovery;
- **mitigate:** reduce impact or duration;
- **respond:** improve decisions and execution;
- **verify:** add a test that proves the control.

A high-risk issue usually needs more than a documentation fix: for example, prevent with policy-as-code, detect with a preflight, and verify with an isolated access test.

## Write Actionable Backlog Items

Use a schema:

~~~yaml
title: Include every protected vault in recovery-role policy generation
finding_id: DR-2026-09-02-F07
capability: restore-orders-database
failure_mode: recovery identity cannot read newly created backup vault
evidence: evidence://dr-2026-09-02/timeline#01:08
impact:
  rto_delay_minutes: 17
  objective_breached: true
risk:
  likelihood: likely
  consequence: critical
control_type: prevent
owner: cloud-identity-team
accountable_service_owner: orders-platform
due: 2026-09-16
change:
  Generate scoped vault access from backup inventory and block vault creation
  when the recovery role would lack read and decrypt permissions.
acceptance:
  - policy test covers all protected vaults
  - recovery identity reads and decrypts a harmless artifact in isolation
  - failed access produces a page before the next drill
retest: targeted-identity-preflight
status: open
~~~

Every item needs one accountable owner, even when several teams contribute. “Platform” is not an owner. A deadline without capacity allocated is not a plan.

## Prioritize by Recovery Risk

Use evidence rather than the loudest participant:

~~~text
priority increases with:
  business consequence
  likelihood or recurrence
  RTO/RPO margin consumed
  data-integrity or security exposure
  number of services sharing the dependency
  lack of detection
  inability to work around safely
~~~

Immediately escalate findings that can cause unreconciled data loss, split-brain, secret exposure, destructive automation, or complete inability to recover a critical capability.

For other items, compare risk-reduction value with effort. Fix shared recovery identity, DNS, artifact, and orchestration failures at the platform level where appropriate; copying the same workaround into twenty runbooks creates twenty future failures.

## Avoid Weak Actions

Reject:

- “be more careful”;
- “train the team” as the only control;
- “improve monitoring” without signal and threshold;
- “update documentation” without naming the missing decision or step;
- “automate recovery” without safety properties;
- “investigate later” without owner and time box;
- rewrites too broad to deliver before the next risk window.

Google's SRE Workbook recommends concrete action items with ownership, prioritization, tracking, and a verifiable end state. Human training can support a control, but system and process changes usually provide more durable prevention.

## Link Findings to Claims

Invalidate affected recovery evidence:

~~~yaml
claim: orders-restores-within-30-minutes
status: unproven
invalidated_by: DR-2026-09-02-F07
can_revalidate_with:
  - targeted identity preflight
  - representative restore and business acceptance
~~~

Do not leave a dashboard green because a previous drill passed. A new failure supersedes older evidence.

## Verify, Do Not Merely Close

An issue is not complete when code merges:

1. review the change and automated tests;
2. run the item's targeted acceptance test;
3. repeat the failed recovery gate under the same workload identity and network;
4. run a broader restore or failover if the change affects shared orchestration;
5. attach evidence and measured result;
6. update the runbook, dependency graph, and claim status;
7. close only after the service owner accepts revalidation.

If a workaround remains, track its removal separately with expiry and risk.

## Operate the Backlog

Review recovery actions with the same seriousness as production defects:

- weekly review for overdue critical and high items;
- service planning capacity reserved for reliability work;
- dashboards for open risk by capability and objective;
- aging, overdue rate, and median close time;
- repeated failure themes across services;
- percentage closed with retest evidence;
- RTO/RPO margin before and after changes;
- explicit risk acceptance by an authorized business owner when work is deferred.

Keep the after-action narrative blameless. Google SRE guidance focuses postmortems on contributing system conditions and effective preventive actions rather than individual blame. Blameless does not mean ownerless: teams still own improvements.

## Acceptance Criteria

The drill has produced a useful reliability backlog when:

- every material observation links to raw evidence and customer or objective impact;
- contributing conditions go beyond the proximate human action;
- findings are categorized as prevent, detect, mitigate, respond, or verify;
- each action has one owner, priority, deadline, concrete change, and measurable acceptance;
- affected recovery claims become visibly unproven;
- platform-wide problems receive platform-wide fixes;
- closure requires targeted or broader retest evidence;
- overdue and recurring risks are reviewed and escalated;
- results feed the next exercise scope and cadence.

The exercise ends when the evidence is captured. Reliability improves when its actions are verified.

## Official References

- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [CISA: Cybersecurity Tabletop Exercise Package documents](https://www.cisa.gov/resources-tools/resources/ctep-package-documents)
- [CISA: After-Action Report and Improvement Plan template](https://www.cisa.gov/sites/default/files/2024-01/essstep-after-action-report-improvement-plan-template_112023_508.pdf)
- [Google SRE Book: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
