# How to Make an Improvement Stick: Ownership, Automation, Documentation, and Drift Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Continuous Improvement, Process Ownership, Automation, Documentation, Drift Detection, Standard Work

Description: Turn a successful experiment into durable normal work with accountable ownership, safe automation, current documentation, and actionable drift checks.

---

A process experiment can produce a clear improvement and still disappear three months later. The original champion changes teams, a new tool bypasses the agreed check, documentation describes the pilot rather than normal operations, and nobody notices that performance has returned to baseline.

The change did not fail during the experiment. It failed during the transition from a temporary project to an owned operating system.

Durability requires more than telling people to keep doing the new thing. A sustained improvement has an accountable owner, a defined standard, controls that make the desired behavior easier and safer, documentation at the point of work, and checks that expose drift early enough for someone to act. Those elements must be designed before the experiment is closed.

## Define What “Stick” Means

Do not use “adopted” as an undefined status. Write a small sustainability contract that distinguishes implementation from durable operation:

```yaml
improvement: "Validate production rollback before deployment approval"
intended_outcome: "Reduce time to recover from failed changes"
standard: "Every standard-risk deployment has a tested rollback reference"
accountable_owner: "release-engineering-team"
backup_owner: "service-reliability-team"
enforcement: "deployment policy check"
source_of_truth: "docs/production/rollback-standard.md"
outcome_measure: "recovery time for rollback-eligible failed changes"
conformance_measure: "deployments with a valid rollback reference"
guardrail: "emergency change delay"
drift_check:
  frequency: "on every deployment plus monthly trend review"
  destination: "release-engineering work queue"
  response_slo: "two working days for policy failures"
review_date: "2026-11-12"
retirement_condition: "replacement policy approved and migration complete"
```

This contract answers five questions: what must remain true, who is answerable, where the standard lives, how the team will know it has drifted, and when the arrangement will be reconsidered.

The Institute for Healthcare Improvement's [Sustainability Planning Worksheet](https://www.ihi.org/library/tools/sustainability-planning-worksheet) covers a similar set of concerns through measurement, ownership, communication and training, hardwiring the change, and workload assessment. Sustainability is operating design, not a final announcement.

## Assign an Owner With Authority and Capacity

“Everyone owns it” usually means nobody has the duty to notice degradation or make a decision. Name one accountable team or role. That owner does not perform every task; it is responsible for keeping the standard effective.

The owner's responsibilities should include:

- maintaining the standard and its documentation;
- reviewing outcome, conformance, and balancing measures;
- triaging drift signals and assigning corrective work;
- approving material exceptions;
- ensuring training and handoffs remain current;
- deciding when to adapt or retire the standard;
- maintaining the automation that enforces or observes it.

Give the owner authority to change the relevant workflow and capacity to do the work. An owner without repository access, budget, operational visibility, or scheduled review time is merely a name on a page. Name a backup team or succession rule so a reorganization does not orphan the improvement.

Google's SRE guidance on [postmortem culture](https://sre.google/workbook/postmortem-culture/) makes the ownership lesson concrete: action items without clear owners are less likely to be resolved, and one owner with collaborators is preferable to diffuse ownership. The same principle applies after an improvement action is completed.

For repository-controlled standards, GitHub's [CODEOWNERS documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) shows how to map paths to responsible people or teams and automatically request their review. CODEOWNERS is a review-routing mechanism, not the entire operating model. Pair it with service ownership, escalation, and a succession process.

## Turn the Successful Variant Into Standard Work

During an experiment, exceptions and manual support are acceptable because the team is learning. After the keep decision, remove ambiguity:

- choose one normal path;
- state when it applies and when it does not;
- define required inputs and observable outputs;
- document exception authority and expiration;
- remove obsolete forms, meetings, flags, and instructions;
- migrate unfinished work from the old process;
- tell affected people when the new standard takes effect.

The IHI white paper on [sustaining improvement](https://www.ihi.org/library/white-papers/sustaining-improvement) emphasizes standard tasks and responsibilities, routine monitoring, and adjustments that maintain stability over time. Standard work is not a claim that the process can never change. It creates a visible baseline from which later learning can proceed.

Prefer a standard expressed as an outcome or invariant where possible. “A deploy has a tested rollback path” survives a tool migration better than “fill field 17 in the old release form.” Implementation instructions can be tool-specific, but the reason and invariant should remain clear.

## Automate the Right Layer

Automation helps an improvement survive memory lapses, staff turnover, and scale. It can:

- prefill reliable data rather than asking people to copy it;
- validate required conditions at the moment of action;
- block a dangerous operation with a clear remediation path;
- route exceptions to an accountable owner;
- schedule recurring evidence collection;
- open or update work when drift is detected.

Do not automate an unproven or needlessly complex process. Google's SRE chapter on [the evolution of automation](https://sre.google/sre-book/automation-at-google/) describes automation as a force multiplier rather than a panacea: a poorly aimed mechanism can apply the wrong action faster and more consistently. First simplify or design away the manual step; then automate what remains within a well-defined scope.

Choose the control according to consequence:

| Control | Appropriate use | Example |
| --- | --- | --- |
| Default | Preferred choice is usually safe, but override is legitimate | New repositories include the standard CI template |
| Warning | Human judgment is required | Flag unusually broad deployment scope |
| Required check | Violation should prevent the change | Schema compatibility test must pass before merge |
| Automatic remediation | Correction is deterministic and bounded | Reapply an approved formatting policy |
| Human review | Context or irreversible risk is high | Approve a time-limited security exception |

Automation must itself be owned, tested, observable, and reversible. A scheduled job that silently stops is documentation theater in executable form. Record its last successful run, failure destination, permissions, dependencies, and manual fallback.

GitHub's documentation for [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) describes enforceable review and status-check requirements. Its [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) supports event-driven and scheduled checks. These are useful building blocks, but a cron expression alone is not a control unless failure creates an actionable signal.

## Put Documentation at the Point of Work

Documentation sustains reasoning that automation cannot express. Keep one canonical source close to the controlled system and link to it from errors, templates, runbooks, dashboards, and onboarding material.

A durable page should include:

- the customer or operational problem the standard addresses;
- scope, exclusions, and defined terms;
- the normal procedure and expected result;
- the rationale for important controls;
- exception and rollback procedures;
- owners and escalation routes;
- measures, dashboards, and drift checks;
- last review date and meaningful change history;
- retirement or supersession information.

Write for the person encountering the process without the original champion beside them. Test the document: ask someone unfamiliar with the change to complete a realistic task or diagnose a simulated failure. Their confusion is evidence of a documentation defect.

Treat documentation changes as part of the same change set as code, policy, or workflow modifications. If a pull request changes a deployment check, it should update the corresponding operational explanation. A path-based owner and required review can help enforce that coupling. Avoid duplicated instructions in wikis and slides; use short pointers to the canonical source instead.

## Detect Drift Across More Than Configuration

Drift is any meaningful difference between the intended standard and actual operation. It appears in several forms:

| Drift type | Example | Possible check |
| --- | --- | --- |
| Configuration | A production setting differs from declared configuration | Periodic plan or reconciliation |
| Behavior | People bypass the normal path | Conformance events plus sampled observation |
| Outcome | Compliance stays high but customer benefit decays | Outcome time series and guardrails |
| Documentation | Instructions no longer match the interface | Task-based review or link/check execution |
| Ownership | Team alias has no active responders | Ownership-directory audit and escalation test |
| Exception | Temporary waivers never expire | Expiry check and exception inventory |
| Automation | A job runs but no longer evaluates the right population | Synthetic test and coverage measure |

This breadth matters. A dashboard showing 100% form completion does not prove the change still works for customers. The process can conform perfectly while its causal assumption becomes obsolete.

Use three layers of control:

1. **Preventive:** defaults, templates, permissions, and required checks make drift less likely.
2. **Detective:** scheduled reconciliation, outcome monitoring, audits, and synthetic tests reveal drift.
3. **Corrective:** an owner receives work with context, severity, and a response expectation; safe cases may self-heal.

HashiCorp's official [HCP Terraform health assessment documentation](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/health) illustrates the distinction between configuration drift and continuous validation. Drift detection compares real infrastructure with declared configuration, while continuous validation checks whether custom conditions remain true after provisioning. The general lesson is valuable beyond infrastructure: both conformance and continuing fitness need observation.

Prometheus [alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) can turn a time-series condition into a pending or firing alert and attach annotations such as a runbook link. Prometheus's [alerting practices](https://prometheus.io/docs/practices/alerting/) recommend alerting on actionable symptoms associated with user pain and avoiding pages where there is nothing to do. A drift alert should say what changed, why it matters, who owns it, and what response is expected.

## Choose Check Frequency From Risk

“Review annually” is not a universal sustainability plan. Choose frequency from:

- how quickly drift can occur;
- consequence if it remains undetected;
- time needed to repair it;
- cost and reliability of the check;
- expected rate of product, policy, or organizational change.

A security invariant may need enforcement on every change. A documentation walkthrough may be appropriate quarterly or after a major interface revision. An ownership audit might run monthly and on organizational changes. Outcome trends may be reviewed weekly but require several periods before a decision.

Use an explicit response path. A check that writes to an unread dashboard does not control drift. Route failures to the owner's normal queue, deduplicate repeated signals, define severity, and periodically test the route end to end.

## Close the Experiment Only After the Handoff Works

Before declaring the improvement embedded, verify:

- the accountable and backup owners accept the role;
- normal and exception paths are documented;
- automation passes positive and negative tests;
- metrics cover the intended population and relevant segments;
- drift failures reach the owner's real queue;
- a person outside the experiment can follow the standard;
- the old process and temporary artifacts are removed;
- the next review date is scheduled;
- rollback and retirement paths exist.

Run a handoff exercise. Introduce a safe, synthetic violation, confirm that the check detects it, ensure the message leads to usable documentation, and observe whether the owner can resolve it. Then restore the system. This tests the complete control loop rather than checking that each artifact exists in isolation.

Google SRE defines toil as manual, repetitive, automatable, tactical work that lacks enduring value and scales with service growth. Its [Eliminating Toil chapter](https://sre.google/sre-book/eliminating-toil/) explains why automation can reduce that load, while the [SRE Workbook's practical guidance](https://sre.google/workbook/eliminating-toil/) also stresses measuring costs, benefits, and ongoing maintenance. The goal is not maximum automation. It is an improvement whose operating cost remains proportionate to its value.

Finally, keep capacity for later iteration. The GOV.UK Service Standard states that teams should [iterate and improve frequently](https://www.gov.uk/service-manual/service-standard/point-8-iterate-and-improve-frequently) throughout a service's life. “Sticking” should mean the benefit remains visible and owned, not that the first solution is frozen forever.

## Official Documentation

- [IHI — Sustaining Improvement](https://www.ihi.org/library/white-papers/sustaining-improvement)
- [IHI — Sustainability Planning Worksheet](https://www.ihi.org/library/tools/sustainability-planning-worksheet)
- [Google SRE — Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [Google SRE — The Evolution of Automation at Google](https://sre.google/sre-book/automation-at-google/)
- [Google SRE — Eliminating Toil](https://sre.google/sre-book/eliminating-toil/)
- [GitHub Docs — About Code Owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub Docs — About Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs — Workflow Syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [HashiCorp — Health Assessments in HCP Terraform](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/health)
- [Prometheus — Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [GOV.UK Service Standard — Iterate and Improve Frequently](https://www.gov.uk/service-manual/service-standard/point-8-iterate-and-improve-frequently)

## Conclusion

An improvement sticks when it becomes a complete, observable control loop: an owner maintains a clear standard; automation makes the intended path easy and guards important invariants; documentation preserves context and recovery knowledge; drift checks compare reality with both the standard and the intended outcome; and failures create actionable work.

Build that loop before closing the experiment. Test the handoff without its original champion, remove the superseded process, and schedule reassessment. Durable improvement is not permanent compliance with yesterday's procedure. It is the capability to preserve a proven benefit, notice when assumptions or behavior change, and adapt deliberately instead of drifting silently backward.
