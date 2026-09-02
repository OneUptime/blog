# How to Write a Recovery Runbook an Unfamiliar On-Call Engineer Can Execute at 3 A.M.

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Runbook, Documentation, Incident Management

Description: Write recovery runbooks with explicit entry conditions, guarded commands, expected evidence, and escalation paths for a cold reader.

---

The real reader of a recovery runbook may be tired, unfamiliar with the service, working from a restricted recovery laptop, and unable to reach the author. Design for that reader.

NIST SP 800-184 describes a recovery playbook as an actionable set of steps prepared before an event. “Restore the database and update DNS” is not actionable. A usable step says what must be true, who may authorize it, exactly what to do, what success looks like, what can go wrong, and when to stop.

## Put Decision Context Before Commands

The first screen should answer:

- What scenario does this cover?
- Which customer capability and data are in scope?
- What is explicitly out of scope?
- What conditions authorize entry?
- What are the RTO, RPO, and allowed degraded mode?
- Who is incident commander, operator, approver, scribe, and subject-matter escalation?
- What actions are irreversible or externally visible?
- Where is the evidence captured?
- What are the abort conditions?

Also state when **not** to use the runbook. A regional-loss procedure may be dangerous during data corruption because it can copy corrupt state into the recovery site.

## Use a Predictable Structure

### 1. Purpose and scope

Name the scenario, affected capability, assumptions, and supported architecture versions.

### 2. Safety box

Place non-negotiable warnings before the first action:

- old writers must be fenced before enabling new writers;
- restored workloads must remain isolated until side-effect checks pass;
- all resource selectors must include the exact incident or exercise ID;
- no step may disable TLS verification or expose credentials in logs.

### 3. Roles and communication

Use role aliases and active team routes rather than individual names. Include the incident channel, decision log, stakeholder update interval, and escalation deadline.

### 4. Inputs

Define every variable once:

~~~text
RECOVERY_RUN_ID   Unique ID from incident record
SOURCE_SITE       Failed or isolated site identifier
TARGET_SITE       Approved recovery site
RECOVERY_POINT    Immutable backup or log position approved by data owner
ARTIFACT_RELEASE  Signed application release
~~~

Provide examples that are unmistakably non-production and explain how to verify each value.

### 5. Preconditions

Use checkboxes backed by evidence:

- target account and identity confirmed;
- production impact and communication approved;
- recovery point and expected data loss accepted;
- target quota and capacity available;
- production writers fenced, or the runbook is explicitly constrained to isolated read-only recovery until fencing is proven;
- isolation and side-effect sinks verified;
- rollback or stop procedure ready;
- required specialists reachable or explicit delegation approved.

### 6. Numbered, gated actions

Each step should fit this template:

~~~markdown
## Step 4: Restore the orders database

Risk: Creates a new database; must not modify SOURCE_SITE.
Approver: Database recovery lead.
Requires: Steps 1-3 PASS; RECOVERY_POINT recorded.

Command:
  recoveryctl database restore
    --run-id RECOVERY_RUN_ID
    --target TARGET_SITE
    --recovery-point RECOVERY_POINT
    --confirm-target-account EXPECTED_TARGET_ACCOUNT

Expected:
  operation_id is returned;
  target name includes RECOVERY_RUN_ID;
  final state is RESTORED_READ_ONLY.

Verify:
  recoveryctl database status --operation OPERATION_ID
  recoveryctl evidence attach --operation OPERATION_ID

PASS: integrity=pass and sequence >= APPROVED_MINIMUM_SEQUENCE.
STOP: target account differs, integrity fails, or sequence is older.
Escalate: #database-recovery using incident template DR-DATA-02.
Rollback: delete only the exact run-tagged target after approval.
~~~

Real commands should use the actual product syntax. The example illustrates the information shape, not a universal recovery tool.

### 7. Business validation

Specify synthetic transactions, data reconciliation, routing path, expected receipt, and objective calculations. “Check the application” is not a test.

### 8. Traffic and write enablement

Separate data restoration, read-only validation, write enablement, external side effects, and traffic shift into distinct approval gates.

### 9. Stop, rollback, and failback

Document how to halt orchestration, revoke credentials, keep evidence, restore safe routing, and escalate. Failback deserves its own procedure and entry criteria.

## Make Commands Safe to Copy

- Set and verify account, region, namespace, and cluster explicitly.
- Prefer non-interactive commands only when all dangerous inputs are explicit.
- Include preview or read-only commands before mutations.
- Require exact resource IDs, not broad globs or name prefixes.
- Show where output values are captured for later steps.
- State tested CLI and API versions.
- Avoid shell history exposure for secrets; retrieve short-lived credentials through the approved mechanism.
- Never use placeholders that look valid, such as a real production account number.
- Put long scripts in reviewed, versioned artifacts and have the runbook verify their checksum.

Do not tell an operator to ignore errors. List known warnings by exact code or pattern and explain why each is safe; every other error is a stop.

## Design for Cognitive Load

Use one action per numbered step. Put the expected result immediately after its command. Repeat critical target context at irreversible gates. Mark decision points as PASS, STOP, or ESCALATE. Keep background explanation in linked appendices so it does not obscure execution.

Provide progress and time budget:

| Milestone | Target elapsed | Escalate when |
| --- | ---: | ---: |
| Containment complete | 5 min | 7 min |
| Data restored read-only | 15 min | 18 min |
| Business validation | 24 min | 26 min |
| Traffic shifted | 28 min | 30 min |

An escalation threshold is not permission to skip safety checks. It triggers more help or a strategy decision.

## Test with a Cold Reader

The author should not be the primary operator in validation:

1. give an on-call engineer the runbook, approved inputs, and normal tools;
2. prohibit private coaching; route questions through documented escalation;
3. observe ambiguities, searches, retries, and undocumented access;
4. inject a realistic failed precondition and verify that the operator stops;
5. swap roles and repeat after corrections;
6. retain timestamps and evidence;
7. invalidate the result after material architecture or credential changes.

CISA's tabletop materials include planner, facilitator, participant-feedback, and after-action resources. A walkthrough tests decisions; follow it with an isolated technical exercise to test commands and access.

## Acceptance Criteria

The runbook is ready for an unfamiliar on-call engineer when:

- entry and exclusion scenarios are unambiguous;
- objectives, roles, inputs, risks, and abort conditions appear before commands;
- every action has prerequisites, exact scope, expected output, verification, failure path, and rollback guidance;
- destructive and write-enabling actions have explicit approvals;
- target context and recovery point cannot be silently inferred;
- a cold reader completes an isolated recovery without private coaching;
- the procedure produces an evidence bundle and measured RTO/RPO;
- all discovered ambiguity becomes an owned correction and is retested.

The standard is not literary completeness. It is safe, observable execution under pressure.

## Official References

- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [CISA: Cybersecurity Tabletop Exercise Package documents](https://www.cisa.gov/resources-tools/resources/ctep-package-documents)
- [Google SRE Book: Managing Incidents](https://sre.google/sre-book/managing-incidents/)
- [Azure Site Recovery: About recovery plans](https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview)
