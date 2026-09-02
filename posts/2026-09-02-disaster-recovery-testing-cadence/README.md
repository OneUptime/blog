# Choose a Disaster Recovery Testing Cadence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Testing, Business Continuity, RTO, RPO

Description: Set a risk-based recovery testing cadence that combines frequent restore checks, decision exercises, and full technical drills.

---

There is no universal cadence that makes every workload recoverable. A weekly-changing payment platform and a stable internal archive should not inherit the same schedule. Regulations, contracts, and vendor requirements may also impose minimums that override general engineering guidance.

Use a layered program: frequent narrow tests catch drift quickly; less frequent broad exercises validate coordination, scale, and transitions.

## Separate the Test Types

### Backup control checks

Confirm jobs, retention, replication, encryption, immutability, and alerts. These checks can run continuously, but they do not prove restore.

### Automated restore tests

Restore a selected point to a clean target and validate artifact, engine, schema, integrity, business invariants, RTO, and RPO. Rotate newest, oldest-retained, incremental-chain, and upgrade-boundary points.

### Runbook walkthrough

An operator reads and steps through preconditions, decisions, commands, expected results, and escalation without mutating systems. Good for frequent change review and cold-reader usability.

### Tabletop exercise

A facilitator introduces a scenario and decision injects. Teams exercise authority, communication, dependencies, legal or customer obligations, and recovery choices. CISA provides exercise-planner and facilitator/evaluator handbooks, feedback forms, and an after-action report/improvement plan template.

### Component failover or game day

Exercise a database promotion, queue recovery, DNS control, credential path, or dependency failure with guardrails.

### Full failover and failback

Recover the complete critical capability, shift authority and traffic, validate data, operate on the recovery site, and return safely. This is the broadest and usually most expensive test.

One green test type cannot substitute for the others. A tabletop cannot prove backup credentials, and an automated database restore cannot prove incident command.

## Start with Risk, Then Apply Minimums

Score each workload using:

- business impact and data sensitivity;
- RTO/RPO tightness;
- frequency of infrastructure, schema, dependency, and credential change;
- number and complexity of recovery steps;
- percentage of manual actions;
- prior exercise failure rate;
- time since the last representative-volume test;
- staff turnover and on-call familiarity;
- external and control-plane dependencies;
- corruption and ransomware exposure;
- regulatory and contractual requirements.

Shorter objectives, faster change, greater consequence, and weaker prior evidence require more frequent tests.

## A Practical Starting Cadence

The following is a planning baseline, not an industry guarantee:

| Activity | Critical, fast-changing service | Moderate service | Low-change archive |
| --- | --- | --- | --- |
| Backup and dependency monitoring | Continuous | Continuous | Continuous |
| Automated clean restore | Daily to weekly | Weekly to monthly | Monthly to quarterly |
| Runbook/access preflight | On change and monthly | On change and quarterly | On change and semiannually |
| Tabletop | Quarterly and on major change | Semiannually | Annually |
| Component game day | Monthly to quarterly | Quarterly to semiannual | As relevant |
| Full failover and failback | Semiannual, plus material change | Annual | Risk- or requirement-based |

Adjust from measured results. If a daily restore is cheap and catches meaningful failures, run it daily. If a full failover has a 40% failure rate, annual repetition is too slow; remediate and repeat promptly.

Published vendor guidance illustrates why cadence is contextual:

- Azure Site Recovery's recovery-plan guidance recommends running a test failover for each app every quarter because apps and their dependencies change frequently.
- Azure Site Recovery's monitoring guidance recommends running a test failover at least every six months for replicated machines.
- AWS Elastic Disaster Recovery recommends drilling as often as practical and at least several times a year, with failback included in initial and some regular drills.
- NIST SP 800-53 contingency-plan testing uses an organization-defined frequency rather than one universal interval.

These statements apply to their described scope and should not be combined into a fictional global standard.

## Add Event-Driven Tests

Calendar tests are insufficient. Invalidate prior evidence and trigger a targeted test after:

- database, backup format, or stateful engine major upgrade;
- network, account, region, or topology change;
- new hard dependency or changed startup order;
- secret store, IAM, CA, certificate, DNS, or registrar change;
- RTO, RPO, degraded-mode, or business-priority change;
- large data-growth threshold;
- recovery IaC, orchestrator, or runbook change;
- failed restore, incident, audit finding, or provider deprecation;
- team ownership or emergency-access change.

Choose the smallest test that directly validates the affected assumption, then run a broader exercise when multiple layers changed.

## Use Evidence Expiry

For each recovery claim, calculate:

~~~text
valid_until = earliest of:
  scheduled_expiry,
  invalidating_change,
  tool_or_artifact_end_of_support,
  owner_or_access_failure
~~~

Track evidence per claim:

~~~yaml
claim: orders-database-restores-within-20-minutes
last_proven: 2026-08-14
data_volume: production-equivalent
backup_cases: [newest, oldest-retained, incremental-chain]
expires_after_days: 30
invalidated_by:
  - engine-major-change
  - backup-policy-change
  - volume-growth-over-20-percent
status: current
~~~

A recent tabletop does not refresh a database restore claim. Evidence type must match the claim.

## Schedule Around Detection Time

For failures that a recurring test can detect, cadence determines how long the failure can exist before the next scheduled detection opportunity:

~~~text
maximum scheduled detection interval approximately equals test interval
~~~

If the organization cannot tolerate a broken restore path for 90 days, a quarterly restore is too infrequent. Continuous backup-job monitoring does not shorten this interval for restore-only failures.

Use random sampling inside the cadence to reduce the chance that one privileged backup, operator, or time window is always tested. Occasionally run without the usual subject-matter expert as primary operator.

## Close the Feedback Loop

After every exercise:

1. publish objective, scope, fidelity, result, and evidence;
2. open owned corrective actions with deadlines and acceptance tests;
3. repeat failed gates after remediation;
4. trend RTO/RPO margin, manual interventions, and recurring failure classes;
5. increase cadence when margins shrink or failures recur;
6. decrease expensive breadth only when cheaper tests cover the same risk and broad tests remain periodic.

Do not count a failed exercise as “completed” for risk reduction. It is valuable evidence, but the recovery claim remains unproven until correction is verified.

## Acceptance Criteria

The cadence is defensible when:

- every recovery claim maps to a test capable of proving it;
- business risk, change rate, objective tightness, and past results drive frequency;
- regulatory and product-specific minimums are documented;
- event-driven tests invalidate stale evidence;
- representative-volume RTO/RPO tests occur, not only small functional restores;
- where the recovery strategy includes them, failover and failback are both exercised;
- failures trigger timely retest after remediation;
- evidence status and next due date are visible to service owners;
- leadership explicitly accepts any interval in which a broken path could remain undetected.

The right cadence is the shortest affordable feedback loop for each meaningful failure, supplemented by broad exercises that prove the parts cannot be validated in isolation.

## Official References

- [NIST SP 800-53 Rev. 5: Security and Privacy Controls](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [CISA: Cybersecurity Tabletop Exercise Package documents](https://www.cisa.gov/resources-tools/resources/ctep-package-documents)
- [Azure Site Recovery: About recovery plans](https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview)
- [Azure Site Recovery: Monitor test failovers](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-monitor-and-troubleshoot)
- [AWS Elastic Disaster Recovery: Best practices](https://docs.aws.amazon.com/drs/latest/userguide/best_practices_drs.html)
- [AWS Well-Architected Framework: Test disaster recovery implementation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_dr_tested.html)
