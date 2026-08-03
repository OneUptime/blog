# How to Build Complete SOC 2 Populations for Four Key Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, Audit Populations, Access Management, Change Management, Incident Response, Onboarding, Audit Evidence

Description: Build reproducible SOC 2 populations by defining triggers, system boundaries, time rules, joins, reconciliations, and retained query evidence for four common workflows.

---

A perfect approval ticket is not enough if the organization cannot show that every in-scope event had a chance to enter the population. Population completeness is what connects a selected sample to the control's operation across the examination period.

For SOC 2 work, a population is the complete set of occurrences relevant to a control and period under the organization's defined scope. Building one requires more than exporting the tool where approvals happen. The trigger may live in one system, the action in another, and the evidence of review in a third.

The durable pattern is:

1. Define the control and event trigger.
2. Identify the authoritative source for occurrence, not just the happy-path workflow.
3. Set exact system and time boundaries.
4. Normalize stable identifiers.
5. Join workflow and action records.
6. Retain unmatched records instead of dropping them.
7. Reconcile to an independent control total.
8. Preserve the query, parameters, counts, and export.

Apply that pattern separately to access changes, deployments, incidents, and new hires.

## Define the Population Before Querying

Write a population specification with these fields:

| Field | Example question |
| --- | --- |
| Control | What activity is the auditor evaluating? |
| Trigger | What real-world or system event creates an occurrence? |
| In-scope systems | Which tenants, accounts, repositories, services, and environments count? |
| In-scope subjects | Which employees, contractors, customers, or machine identities count? |
| Time rule | Is the event included by request, approval, action, or completion timestamp? |
| Status rule | Are failed, rejected, cancelled, emergency, and rolled-back events included? |
| Source of occurrence | Which log establishes that the event happened? |
| Workflow source | Which record contains approvals and review attributes? |
| Stable join key | Which immutable ID connects sources? |
| Reconciliation | What independent total or state can expose omissions? |

Do not decide these fields after seeing the export. That invites selection bias and inconsistent boundary decisions.

Use explicit timestamps in UTC or retain the source timezone and offset. Define whether the start and end are inclusive. Test events exactly on both boundaries.

## Population 1: Access Changes

### The common incomplete approach

Export all closed access-request tickets. This omits direct console grants, command-line changes, group inheritance, emergency access, role changes created by automation, and tickets that were never closed.

### Better sources

Use the system that records the actual entitlement change as the occurrence source:

- identity-provider or directory audit logs;
- cloud IAM policy, group, and role assignment events;
- privileged-access-management checkout or grant history;
- application administration audit logs;
- infrastructure-as-code changes when entitlements are deployed as code.

Then join each grant, modification, or removal to its request and approval record.

### Suggested fields

```text
event_id
event_timestamp_utc
source_tenant
target_system
subject_id
subject_type
entitlement_before
entitlement_after
actor_id
mechanism
request_id
approval_id
emergency_flag
```

### Completeness checks

- Compare entitlement-change events with workflow tickets by stable ID.
- Retain changes with no ticket in an exceptions table.
- Reconcile opening entitlements plus additions minus removals to closing entitlements, accounting for role-definition changes.
- Compare in-scope tenants and applications to the system inventory.
- Include service and machine identities if the control applies to them.
- Test group nesting and inherited privileges; a direct-assignment export alone may not show effective access.

If the control concerns new access approvals, removals may be a separate control population. Keep the occurrence inventory broad, then derive clearly documented control-specific subsets rather than destroying records early.

## Population 2: Production Deployments

### The common incomplete approach

Export merged pull requests from the main application repository. This misses deployments that contained multiple commits, redeployments of old artifacts, infrastructure changes, hotfixes, manual console changes, database migrations, feature-flag changes, and production jobs launched outside that repository.

### Better sources

Begin with the mechanism that changed production:

- CI/CD deployment records;
- deployment-controller or GitOps reconciliation history;
- cloud audit logs for configuration changes;
- container registry and runtime release metadata;
- infrastructure-as-code apply records;
- database migration tooling;
- feature-management audit logs if flags are in the control scope.

Join each production event backward to artifact digest, build, commit, pull request, required checks, and approval.

### Suggested fields

```text
deployment_id
started_at_utc
completed_at_utc
environment
service
result
initiator
artifact_digest
commit_sha
pull_request_ids
pipeline_run_id
approval_record
emergency_flag
rollback_of
```

### Completeness checks

- Reconcile CD production runs to runtime release history.
- Inventory every production delivery path, including manual and emergency paths.
- Include failed and rolled-back attempts when they are relevant to the control wording.
- Match repositories and services to the scoped software inventory.
- Flag deployments with no source review, no successful required checks, or an unknown artifact.
- Detect many-to-many joins: one deployment may contain several pull requests, and one commit may be deployed more than once.

The population unit must match the control. A control over approval before each production deployment uses deployment events; a control over peer review of code changes may use pull requests or commits. Do not use the easier population for a different activity.

## Population 3: Security Incidents

### The common incomplete approach

Export records whose final status is `confirmed security incident`. This can omit alerts closed incorrectly, incidents tracked in another tool, merged duplicates, and events that met the organization's declaration threshold but were not labeled properly.

### Better sources

Separate at least three concepts:

1. **Detection population:** alerts or reports that entered triage.
2. **Declared-incident population:** events management classified as incidents under the response policy.
3. **Control-action populations:** communications, containment actions, post-incident reviews, or remediation tasks triggered by qualifying incidents.

The control determines which population is relevant. A control over triage timeliness cannot be tested from confirmed incidents alone.

### Suggested fields

```text
source_event_id
first_observed_at_utc
case_id
case_opened_at_utc
severity
classification
classification_reason
declared_at_utc
owner
status
closed_at_utc
duplicate_of
notification_required
post_incident_review_required
```

### Completeness checks

- Reconcile case records to the alerting, support, privacy, and employee-reporting channels named in the response process.
- Preserve suppressed, duplicate, false-positive, and reclassified cases with their reasons.
- Compare incident numbers and audit history for deletion gaps.
- Reconcile high-severity alerts to cases or documented suppression decisions.
- Check cases opened near period boundaries and use the control's chosen timestamp consistently.

If the declared-incident population is empty, preserve the broader triage evidence and the query proving no case met the declaration rule. Do not invent an incident to create a sample.

## Population 4: New Hires

### The common incomplete approach

Export active employees whose hire date falls in the period. This can omit contractors, people who joined and left during the period, rescinded starts, rehires, workers represented under another legal entity, and records later deleted or anonymized.

### Better sources

Use the HRIS or approved workforce system's event history, not the current employee list. Define which worker types the control covers. Join the hire or start event to required activities such as:

- background screening where management policy and law make it applicable;
- confidentiality or acceptable-use acknowledgement;
- security training;
- manager-approved access request;
- identity creation and baseline entitlements;
- equipment issuance.

### Suggested fields

```text
worker_id
worker_type
legal_entity
hire_event_id
hire_or_contract_date
start_date
department
manager_id
location
status_history
rescind_or_termination_date
rehire_flag
```

### Completeness checks

- Reconcile payroll additions, contractor-roster additions, and identity creations to HR events.
- Include people who were no longer active at export time.
- Identify duplicate records and rehires using stable worker IDs.
- Compare legal entities and worker types with the scoped people definition.
- Retain exceptions where an identity was created without a matching approved worker event.

The population date depends on the control. Pre-hire screening may be keyed to start date or screening completion; security training may be due within a policy-defined interval after start. State the rule before testing.

## Use Left Joins and Exception Buckets

When joining an occurrence source to its workflow, start from every occurrence and left join the expected approval or review. An inner join quietly drops the events most likely to be exceptions.

Classify unmatched records explicitly:

- valid exception;
- out of scope with documented reason;
- duplicate linked to canonical record;
- system-generated event handled by a defined automated path;
- data-quality issue requiring investigation;
- unresolved.

Keep the original row, classification, reviewer, date, and support. A filter added only to make the total match is not a reconciliation.

## Preserve Population Lineage

For every delivered population, retain:

- source systems and tenant identifiers;
- query text, API endpoint, report settings, or script version;
- credentials or role class used, without storing secrets;
- extraction timestamp;
- period parameters and timezone;
- pagination behavior;
- raw row count per source;
- transformations and join logic;
- duplicate and exclusion counts;
- final row count;
- reconciliation and unresolved differences;
- hash or read-only storage reference for the final export.

Ask the auditor what procedures will be performed over management-produced information. A service auditor may test the information's completeness and accuracy; a label from a compliance tool does not make that work unnecessary.

## Official Documentation

- [AICPA and CIMA: 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AICPA and CIMA: FAQs on the effect of software tools on SOC 2 examinations](https://www.aicpa-cima.com/resources/article/faqs-effect-of-the-use-of-software-tools-on-soc-2-r-examinations)
- [AWS Audit Manager: Understanding how evidence is collected](https://docs.aws.amazon.com/audit-manager/latest/userguide/how-evidence-is-collected.html)
- [AWS Audit Manager: Reviewing evidence and collection metadata](https://docs.aws.amazon.com/audit-manager/latest/userguide/review-evidence.html)

## Conclusion

Build populations from the event that proves an occurrence happened, then join the approval and action evidence without discarding unmatched records. Exact boundaries, stable identifiers, reconciliations, and retained query lineage make the population reproducible. That is more valuable than a polished sample folder built from an unknown subset.
