# Going Straight to SOC 2 Type II: Five Readiness Gates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, Type II, Audit Readiness, Trust Services Criteria, Evidence, Controls, Compliance

Description: Test five readiness gates before starting a SOC 2 Type II period so the scope, controls, evidence, and operating cadence can withstand examination.

---

You do not need a SOC 2 Type I report before pursuing Type II. You do need a system whose controls can operate and produce evidence throughout the period covered by the Type II report.

That difference matters. A Type II examination addresses management's system description, the suitability of control design, and the operating effectiveness of controls throughout a specified period. Starting the period does not make an immature control mature. It merely places its operation inside the time span the auditor will examine.

Before opening the observation window, pass five readiness gates:

1. The system boundary and selected Trust Services Categories are stable enough to describe.
2. Risks, commitments, and controls form a complete, testable chain.
3. Control owners can perform each control at its stated cadence.
4. Evidence and populations are reliable from day one.
5. A dry run shows that management can identify and address exceptions.

These are practical gates, not a substitute for the service auditor's engagement acceptance, planning, or professional judgment.

## Gate 1: The System Boundary Is Defensible

Management's description is part of the subject matter. Under the AICPA description criteria, it needs to explain the service organization's system in enough detail for report users to understand the nature of the services and how the system is designed and operated. The boundary normally considers infrastructure, software, people, procedures, and data, along with relevant subservice organizations.

The first gate is passed when the team can answer these questions consistently:

- Which legal entity provides the service?
- Which product features, APIs, regions, and production environments are included?
- Which customer commitments and system requirements drive the applicable criteria?
- Which cloud accounts, clusters, repositories, support tools, and identity systems support the service?
- Which employees and contractors operate or secure it?
- Where does customer data enter, move, persist, and leave?
- Which vendors are subservice organizations, and how will their controls be presented?
- What is explicitly outside the boundary?

Scope does not need to be frozen forever. Businesses change during an examination period. The problem is entering the period while fundamental questions remain unresolved or while a near-term migration will make the initial description misleading. Discuss significant planned changes with the CPA firm before the period starts and establish how they will be evaluated and described.

**Exit evidence:** a reviewed boundary diagram, asset and dependency inventory, data-flow diagram, category decision, and draft system description tied to the actual environment.

## Gate 2: Every Control Has a Reason to Exist

SOC 2 is criteria-based, not a universal checklist of named tools and policies. Management identifies risks that could prevent its service commitments and system requirements from being achieved based on the applicable Trust Services Criteria, then designs controls to provide reasonable assurance against those risks.

Build a traceability table with at least these columns:

| Field | Purpose |
| --- | --- |
| Principal service commitment or system requirement | Explains the outcome users depend on |
| Risk | States what could prevent the outcome or criterion from being met |
| Applicable criterion | Anchors the control to the examination |
| Control activity | Describes who does what, when, and using which source |
| Evidence | Identifies the record that demonstrates operation |
| Owner and backup | Establishes accountability |
| Frequency or trigger | Makes the population testable |

A control such as `management reviews access periodically` is not ready. It leaves the reviewer, population, attributes, timing, decisions, and evidence undefined. A testable version might identify the role that reviews a system-generated privileged-access population quarterly, the attributes reviewed, how conflicts are escalated, and where decisions and removals are recorded.

Do not add a control merely because a template includes it. Conversely, do not omit an activity that is necessary to address a scoped risk because it is inconvenient to evidence. Controls should reflect the real system and the real risk assessment.

**Exit evidence:** an approved risk-control matrix with no orphaned applicable risk, no control without an owner, and control wording that matches current operation.

## Gate 3: Owners Can Sustain the Cadence

A policy approval on the first day does not establish that recurring controls will operate throughout the period. Run each important control before the window and observe whether the owner can complete it correctly and on time.

Test the full operating calendar:

- daily or continuous monitoring and alert handling;
- per-event onboarding, access change, deployment, vendor, and incident workflows;
- weekly or monthly vulnerability and operational reviews;
- quarterly access, risk, or vendor reviews where selected by policy;
- annual exercises, training, policy review, or continuity activities that fall within the period.

The exact cadence is not universally prescribed by SOC 2. It should follow risk, commitments, system requirements, and management policy. Once management states a cadence in a control or policy, missing it can become an exception.

For every control, confirm:

- a primary owner and a trained backup;
- an unambiguous due date and timezone;
- inputs available before the due date;
- an escalation when inputs or approvers are missing;
- a durable record of completion and follow-up;
- capacity during holidays, leave, and incident response.

**Exit evidence:** at least one successful rehearsal for recurring controls, a control calendar, ownership acknowledgements, and tracked remediation for failed rehearsals.

## Gate 4: Evidence Is Reliable from Day One

The service auditor plans and performs procedures to obtain sufficient appropriate evidence. A folder full of screenshots is not automatically sufficient, and a compliance platform does not remove the need to evaluate completeness and accuracy.

Test each evidence path in four dimensions:

1. **Relevance:** Does the record demonstrate the control attributes, or merely show that a tool exists?
2. **Authenticity:** Can the source, actor, timestamp, and environment be identified?
3. **Completeness:** Can the organization produce the full in-scope population for the exact period, including failed, cancelled, emergency, and automated events where relevant?
4. **Retention:** Will the native record and necessary metadata remain available until fieldwork and report issuance?

For automated collection, document the accounts, organizations, projects, filters, APIs, and collection schedule. Reconcile the output to an independent control total when practical. A Git export that silently omits archived repositories or a ticket query that excludes closed incidents can create an incomplete population even when each returned row is accurate.

Run boundary tests before the period:

- an event just before the start timestamp is excluded;
- an event at or after the start is included;
- all in-scope accounts and repositories appear;
- timezones and daylight-saving behavior are understood;
- deleted objects remain discoverable through logs or retained exports;
- evidence permissions prevent undocumented alteration.

**Exit evidence:** tested evidence runbooks, sample exports, reconciliations, retention settings, and a documented method for proving population completeness.

## Gate 5: A Dry Run Finds and Resolves Exceptions

Perform a readiness dry run using the control wording, systems, and evidence intended for the examination. The goal is not to generate a mock pass. It is to find where reality differs from the design before those differences fall in the Type II period.

For a representative set of controls:

1. Generate the complete population for a rehearsal period.
2. Select examples across systems, owners, and unusual paths.
3. Reperform the stated attributes.
4. Record deviations without editing source evidence.
5. Determine root cause and affected population.
6. Remediate the process, not only the selected example.
7. Re-run the control and confirm the correction.

Include adverse paths: rejected access requests, failed deployments, emergency changes, late reviews, stale accounts, security alerts, and vendors that did not provide requested assurance. A happy-path demonstration will not show whether the control handles the risk it was designed for.

Management should also have a process for communicating incidents and significant changes to the service auditor. An exception during a Type II period does not mechanically dictate the opinion. The nature, cause, frequency, population, affected criteria, remediation, and other evidence matter, and the auditor evaluates those facts using professional judgment. Concealing or rewriting an exception is much worse than managing it transparently.

**Exit evidence:** completed dry-run workpapers, an exception register, root-cause remediation, retest results, and management approval to begin.

## The Go or No-Go Meeting

Hold a formal meeting with the control owners, executive sponsor, and scope owner; discuss relevant engagement implications with the CPA firm. Management owns the readiness and go-or-no-go decision, while the service auditor retains responsibility for engagement acceptance, planning, and procedures. For each gate, record `ready`, `ready with accepted action`, or `not ready`. Do not use a green compliance dashboard as the sole basis for the decision.

Start only when:

- management has approved the scope and categories and discussed them with the service auditor;
- the draft description matches the deployed service;
- control operation has been rehearsed;
- evidence collection covers the entire planned period;
- known design gaps are closed;
- owners accept the calendar;
- material planned changes have been discussed with the auditor;
- the intended period and report timing satisfy the report users.

If a gate fails, change the start date or narrow the scope only when that narrower scope remains useful and truthful. Do not backdate operation, reconstruct approvals that never occurred, or label a readiness artifact as evidence of later operation.

## The First Week Still Matters

After the window opens:

- capture a dated baseline of in-scope systems and configurations;
- verify automated collectors and retention jobs;
- review the upcoming control calendar with owners;
- preserve evidence in its native system where possible;
- log scope and personnel changes;
- escalate a missed control immediately;
- keep the auditor informed of significant facts.

Readiness is not a one-time project phase. A Type II report covers operation throughout a period, so the organization must keep monitoring the controls and evidence pipeline until the period ends.

## Official Documentation

- [AICPA and CIMA: SOC for Service Organizations Engagements Overview](https://www.aicpa-cima.com/resources/download/soc-for-service-organizations-engagements-overview)
- [AICPA and CIMA: 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AICPA and CIMA: 2018 SOC 2 Description Criteria with Revised Implementation Guidance 2022](https://www.aicpa-cima.com/resources/download/get-description-criteria-for-your-organizations-soc-2-r-report)
- [AICPA and CIMA: FAQs on the effect of software tools on SOC 2 examinations](https://www.aicpa-cima.com/resources/article/faqs-effect-of-the-use-of-software-tools-on-soc-2-r-examinations)

## Conclusion

Going directly to Type II is sound when the system is already ready for period testing. Pass the boundary, traceability, operating-cadence, evidence, and dry-run gates first. The observation window should record a functioning control environment, not become the place where the organization discovers how its controls are supposed to work.
