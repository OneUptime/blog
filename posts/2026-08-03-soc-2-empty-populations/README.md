# No Terminations or Incidents: How Auditors Test Empty Populations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, Empty Population, Audit Evidence, Termination, Incident Response, Type II, Controls

Description: Handle an empty SOC 2 population by proving it is truly empty, separating event controls from readiness controls, and avoiding invented or backfilled evidence.

---

An empty population is a fact to evaluate, not automatically a pass, failure, or reason to create a fake transaction. If no employee was terminated during the period, an auditor cannot select a termination and test whether its access was removed on time. The auditor can still evaluate the control design, whether it was implemented, whether the population is genuinely empty, and other controls or evidence relevant to the applicable criteria.

The outcome depends on the control wording and the engagement facts. The AICPA Trust Services Criteria do not prescribe one automatic treatment for every empty population. The service auditor plans procedures and evaluates sufficient appropriate evidence using professional judgment.

Management's job is to make the facts clear:

1. Define the exact population that should exist.
2. Demonstrate with reliable sources that it contains zero items.
3. Separate event-triggered controls from scheduled and readiness controls.
4. Show that the process was implemented and capable of operating.
5. Do not manufacture, relabel, or backdate an event.

## First Ask Whether the Population Should Be Empty

`No terminations` and `no incidents` are conclusions. Test them against authoritative occurrence sources.

For terminations, consider:

- HRIS employment-event history;
- contractor end-date and vendor rosters;
- payroll removals;
- identity disablement logs;
- offboarding tickets;
- people who joined and left between reporting snapshots;
- transfers or role changes if the control includes them.

For incidents, consider:

- security alert and case-management systems;
- support escalations;
- privacy or legal intake;
- employee reporting channels;
- severity and declaration decisions;
- merged, deleted, suppressed, false-positive, and reclassified cases.

A current active-employee list cannot prove there were no departures earlier in the period. A list of confirmed incidents cannot prove that no event should have been declared. Preserve event history and reconciliations.

### Build a zero-population memo

Use a short record that contains:

```text
Control and population definition
Period start and end, with timezone
In-scope entities, worker types, systems, and channels
Source queries and extraction dates
Raw counts from each source
Reconciliation performed
Potential matches investigated
Conclusion and approver
Links to retained source evidence
```

The memo is an explanation and index. It does not replace the underlying logs or exports.

## Separate Three Different Kinds of Controls

An empty event population affects controls differently.

### 1. Pure event-triggered control

Example: `Human Resources notifies IT of a termination, and IT disables the worker's production access within the policy-defined interval.`

If there were no in-scope terminations, there are no instances on which to test the timeliness attribute. The auditor may inspect design and implementation, corroborate that the population is empty, and consider other relevant evidence. That does not transform a simulated event into an actual operating instance.

### 2. Scheduled control

Example: `The security lead reviews all privileged access quarterly and investigates inappropriate access.`

This control still has four expected occurrences even if nobody was terminated and no access was removed. Its population is quarterly reviews, not terminations. Each scheduled review should occur using the complete access listing.

An empty termination population is no excuse for missing periodic access reviews.

### 3. Readiness or capability control

Example: `The incident-response plan is reviewed and tested annually, and identified improvements are tracked.`

This control can operate without a real security incident. A tabletop or simulation may be valid evidence for the exercise control because the control explicitly concerns testing readiness. It is not evidence that the organization executed its real-incident notification control during an actual incident.

Correctly separating these populations prevents both false exceptions and false assurance.

## How a Service Auditor May Respond

The exact procedures belong to the service auditor. Depending on risk and the control, procedures may include:

- inspecting the control documentation and workflow configuration;
- determining whether the control was implemented;
- inspecting source-system histories and queries supporting zero occurrences;
- testing the reliability, completeness, and accuracy of management-produced population information;
- reconciling to independent sources;
- inquiring of relevant personnel and corroborating their responses;
- observing or inspecting a readiness exercise where that is itself a stated control;
- evaluating related controls that address the same risk;
- considering whether the control description needs to explain that no events occurred;
- evaluating the effect on the examination and report using professional judgment.

Inquiry alone is generally weak support for a technical population. `We would know if anyone left` is not comparable to an HRIS event export reconciled to payroll and identity logs.

An empty population also does not prove operating effectiveness. It means there was no event instance for that particular test. Avoid describing the result as a successful sample of zero.

## Termination Example

Assume a five-person company had no employees or contractors leave during a six-month period.

### Evidence for the empty event population

- HRIS event history for all in-scope worker types;
- contractor roster history and end dates;
- payroll or accounts-payable worker removals as applicable;
- identity-provider disablement events;
- offboarding workflow report;
- reconciliation of opening workers, additions, removals, and closing workers.

### Evidence that can still exist

- the approved offboarding procedure;
- configured HR-to-IT notification workflow;
- named owners and backups;
- current identity inventory;
- completed periodic access reviews;
- a dry run performed before the examination period, clearly labeled as readiness work;
- an exercise during the period if exercise performance is a separate stated control.

### Evidence that should not be created

- a termination ticket for an employee who still works there;
- an approval dated earlier than it actually occurred;
- a fictional identity removal described as a real event;
- a role change relabeled as a termination without support in the control definition.

If management wants exercises to be part of the continuing control environment, define an exercise control prospectively, including its cadence, expected steps, evidence, and remediation. Do not rewrite the control after learning the population is empty merely to create a testable occurrence.

## Incident Example

`No incidents` requires a classification rule. Many organizations receive security alerts, suspicious emails, scanner findings, customer complaints, and availability events. Not every signal is a declared security incident, but the path from signal to classification should be visible.

### Evidence for the empty declared-incident population

- all alert and intake sources named by the response procedure;
- the triage case population;
- classification and severity history;
- documented reasons for false positives, duplicates, and non-incidents;
- reconciliation of high-severity alerts to cases;
- query showing zero cases meeting the declaration threshold.

### Controls that can still operate

- alert monitoring and triage;
- incident-response training;
- tabletop exercises;
- plan and contact-list review;
- backup restoration testing;
- corrective-action tracking from exercises;
- periodic review of alert coverage.

Do not claim the real-incident response process operated because a tabletop succeeded. Say what each artifact proves.

## When Empty May Reveal a Design Problem

An unexpectedly empty population can expose a control or data problem:

- the control trigger is defined so narrowly that real risk events fall outside it;
- contractors are omitted from an employee-only offboarding process;
- alerts are suppressed before entering retained case history;
- records are deleted when a user or ticket is deleted;
- the system exports current state instead of period history;
- teams use an undocumented side channel;
- incidents are never formally declared even when policy thresholds are met.

Investigate the cause rather than defending the zero. If real events were omitted, the population is incomplete, not empty.

## Write Controls That Reflect the Real Process

Avoid guarantees that an event-driven control operates on a periodic cadence. Use distinct wording:

- event control: what happens when a termination or incident occurs;
- scheduled oversight control: what is reviewed every month or quarter;
- readiness control: how the organization tests the process when no real event occurs.

Each control should have its own trigger, owner, evidence, and population. The criteria are outcomes to be addressed; they do not require every company to adopt the same control set or frequency.

## Discuss It Before Fieldwork

Tell the service auditor as soon as management expects an empty population. Provide:

- the control wording;
- the population definition;
- preliminary zero-population support;
- related scheduled and readiness controls;
- system retention limitations;
- any changes planned for the process.

The auditor can then plan appropriate procedures. Management should not demand a predetermined conclusion, and the auditor should not be asked to design the control on management's behalf.

## Official Documentation

- [AICPA and CIMA: 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AICPA and CIMA: SOC for Service Organizations Engagements Overview](https://www.aicpa-cima.com/resources/download/soc-for-service-organizations-engagements-overview)
- [AICPA and CIMA: 2018 SOC 2 Description Criteria with Revised Implementation Guidance 2022](https://www.aicpa-cima.com/resources/download/get-description-criteria-for-your-organizations-soc-2-r-report)
- [AWS Audit Manager: Understanding evidence collection and inconclusive evidence](https://docs.aws.amazon.com/audit-manager/latest/userguide/how-evidence-is-collected.html)

## Conclusion

When a population is empty, prove the zero from authoritative sources and keep event, scheduled, and readiness controls separate. The auditor determines the appropriate procedures and reporting effect from the facts. Honest zero-population evidence is defensible; invented events and retroactive approvals are not.
