# What Counts as SOC 2 Evidence? Three Control Types Compared

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, Audit Evidence, Controls, Type II, Trust Services Criteria, Compliance Automation, Audit Readiness

Description: Match SOC 2 evidence to point-in-time, periodic, and transactional controls while preserving source, timing, completeness, and the attributes actually tested.

---

SOC 2 evidence is information that helps the service auditor evaluate the system description, control design, implementation, or operating effectiveness. It is not defined by a file extension. A screenshot can be useful, irrelevant, incomplete, or misleading depending on what the control says and what the auditor needs to test.

The practical test is whether the evidence supports the relevant assertion:

- **What happened or existed?**
- **Who or what performed the activity?**
- **When did it occur?**
- **Which in-scope system, person, or event did it cover?**
- **Which control attributes does it demonstrate?**
- **How do we know the record and its population are complete and reliable?**

The answer changes for point-in-time, periodic, and transactional controls.

## Start with the Control, Not the Screenshot

Suppose the stated control is that privileged production access is approved by an authorized owner before provisioning. A useful evidence package may need to show:

1. the access request and privilege requested;
2. the affected production system;
3. the requester and intended user;
4. the authorized approver and approval timestamp;
5. the provisioning event and timestamp;
6. a way to establish that approval preceded provisioning;
7. the complete population from which the tested item was selected.

A current screenshot showing that the user has access may support the visible state at capture. It does not by itself prove who approved the access or that approval happened first.

Control wording should identify the activity and evidence-producing system without promising attributes the organization does not actually perform. Evidence should then be captured from the authoritative source whenever possible.

## Point-in-Time Controls

A point-in-time control concerns a state at a specified moment. Common examples include:

- a production storage configuration at the report date;
- the enabled settings of an identity provider;
- the inventory of privileged accounts on a selected date;
- the approved version of a policy as of a date;
- implementation of a control for a Type I examination.

Good evidence preserves both state and context. An API or system export is often stronger than a cropped interface because it can carry resource identifiers, account or tenant, collection time, and all relevant fields. A screenshot can still be useful when it visibly includes:

- the application and tenant or environment;
- the complete setting being inspected;
- the resource identifier;
- a trustworthy capture date or corroborating timestamp;
- enough surrounding context to interpret the result.

### The historical-state trap

Many administrative consoles show only current state. A screenshot collected during fieldwork cannot prove that the same configuration existed three months earlier. For historical point-in-time evidence, use configuration history, immutable audit logs, dated exports, version-controlled configuration, or another source that actually records the earlier state.

### Baseline and change evidence work together

A dated baseline plus a complete log of subsequent changes can sometimes explain state across a span better than repeated screenshots. The service auditor decides whether the evidence is sufficient and appropriate for the procedure. Management should preserve both the baseline and the change trail rather than assuming one substitutes automatically for the other.

## Periodic Controls

A periodic control operates on a schedule selected by management, such as monthly, quarterly, or annually. Examples include:

- a privileged-access review;
- a vulnerability-management review;
- a vendor reassessment;
- a policy review and approval;
- a business continuity exercise;
- a risk assessment update.

Useful evidence for a periodic review generally shows more than a meeting occurred. It should establish:

1. **Population:** what records, accounts, findings, vendors, or policies were subject to review.
2. **Reviewer:** who performed the review and whether that person had appropriate authority and objectivity for the control design.
3. **Timing:** when the review started and completed, measured against the stated cadence.
4. **Criteria:** what the reviewer checked.
5. **Decisions:** which items were approved, changed, removed, escalated, or accepted.
6. **Follow-up:** whether required actions were completed and how completion was verified.

A calendar invitation or signature proves attendance or approval, not necessarily the content of the review. Preserve the reviewed population, annotations or decisions, resulting tickets, and closure evidence together.

### Cadence is part of the evidence

SOC 2 does not impose one universal frequency for every organization. Frequency follows risks, commitments, system requirements, and the organization's own control design. Once the control says `quarterly`, evidence must establish that each required occurrence happened under the organization's defined calendar. Define whether quarters are calendar or fiscal, how due dates are handled, and what happens when the owner is absent.

For a Type II period, prepare a schedule of every expected occurrence, not merely the occurrences that produced convenient artifacts.

## Transactional Controls

A transactional control is triggered by an event. Examples include:

- hiring, role change, and termination;
- access request and provisioning;
- source-code change and production deployment;
- security incident declaration and response;
- new vendor onboarding;
- backup restore request;
- emergency configuration change.

For these controls, an individual ticket is only one item. The auditor also needs a basis for selecting items from a complete population of in-scope events.

For each tested transaction, evidence should connect the trigger, required authorization or review, system action, and completion. Useful records can include:

- HRIS event history and identity-provider audit logs;
- pull requests, protected-branch checks, build records, and deployment logs;
- incident records, alert timelines, communications, and post-incident actions;
- vendor intake, risk decision, contract approval, and provisioning record.

The records should use stable identifiers so the chain can be joined without relying on names or memory. For example, an HR employee ID can link an HRIS termination to an identity workflow; a commit SHA and deployment ID can link code review to production release.

### Population evidence is separate from item evidence

The strongest approval record in the world does not prove that the population omitted no unapproved events. Preserve:

- the query or API method used;
- in-scope organizations, projects, accounts, and repositories;
- time boundaries and timezone;
- included and excluded statuses;
- pagination and row counts;
- reconciliation to independent totals where practical;
- export time and person or service that performed the export.

Do not silently exclude failed, rolled-back, cancelled, emergency, deleted, or automated transactions. Decide whether they are in scope based on the control and document that decision.

## Evidence Quality Has Several Dimensions

An artifact is not simply good or bad. Evaluate it across these dimensions:

| Dimension | Question |
| --- | --- |
| Relevance | Does it address the control attribute being tested? |
| Reliability | Is it generated by an authoritative source with trustworthy metadata? |
| Precision | Does it identify the exact resource, actor, action, and time? |
| Completeness | Does the population cover all in-scope instances and the full period? |
| Integrity | Can undocumented alteration be prevented or detected? |
| Retention | Will the source record remain available through examination and report issuance? |
| Understandability | Can a person outside the operating team interpret it without oral context? |

Evidence supplied by management can be appropriate, but the service auditor may perform procedures over the information's accuracy and completeness. The AICPA has specifically highlighted the risk of overreliance on information produced by SOC 2 tools without testing whether the tool operates as intended and whether its information is complete and accurate for the auditor's purpose.

## What Common Artifacts Do and Do Not Prove

| Artifact | May help prove | Does not prove by itself |
| --- | --- | --- |
| Policy PDF | Approved expectations and version | The process operated |
| Console screenshot | Visible state when captured | Historical state or population completeness |
| Ticket | Workflow and recorded decisions for one item | All events used the workflow |
| Chat message | Contemporaneous communication | Formal approval unless the control recognizes it and identity is reliable |
| Automated dashboard | Collected status under configured rules | Correct scope, mappings, or complete source coverage |
| Meeting minutes | Topics, attendees, and decisions | Underlying population was complete |
| Log export | Recorded events matching the query | Events outside the query were not omitted |
| Signed attestation | A person's representation | Independent corroboration of the represented facts |

No artifact has a magic status merely because another auditor accepted something similar elsewhere.

## Build an Evidence Specification

For each control, maintain a short specification:

```text
Control ID: AC-04
Control activity: Privileged access is approved before provisioning
Trigger: New or changed privileged assignment
Authoritative population: Identity-provider role assignment audit log
Item evidence: Request ID, approver, approval time, role, assignment event, assignment time
Population boundaries: Production tenant, all privileged roles, UTC, [period_start, period_end)
Completeness check: Reconcile assignment events to current-role changes and workflow records
Retention: Native logs plus read-only export through report issuance
Owner: Security operations
```

This does not dictate the auditor's test. It makes management's process reproducible and exposes missing fields early.

## Preserve Evidence Without Manufacturing It

- Keep native records and metadata; use exports as working copies.
- Never recreate an approval that did not occur.
- Do not alter timestamps or replace an exception with a cleaner example.
- Document corrections as later events with their real dates.
- Restrict evidence repositories and retain access logs.
- Record changes to collectors, filters, and scope.
- Ask the CPA firm about evidence expectations before the period, but remember that management remains responsible for its system and controls.

Sample sizes and procedures are the service auditor's professional judgment based on the engagement. A template's sample count is not an AICPA guarantee.

## Official Documentation

- [AICPA and CIMA: 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AICPA and CIMA: FAQs on the effect of software tools on SOC 2 examinations](https://www.aicpa-cima.com/resources/article/faqs-effect-of-the-use-of-software-tools-on-soc-2-r-examinations)
- [AWS Audit Manager: Understanding how evidence is collected](https://docs.aws.amazon.com/audit-manager/latest/userguide/how-evidence-is-collected.html)
- [AWS Audit Manager: Concepts and terminology for evidence](https://docs.aws.amazon.com/audit-manager/latest/userguide/concepts.html)

## Conclusion

SOC 2 evidence must fit the control. Point-in-time controls need trustworthy state at the relevant moment, periodic controls need each scheduled review and its decisions, and transactional controls need both tested event chains and complete populations. Preserve source context, boundaries, timing, and integrity so the auditor can evaluate what the artifact truly demonstrates.
