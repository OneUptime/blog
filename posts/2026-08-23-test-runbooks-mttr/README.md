# Testing Whether Runbooks Reduce MTTR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Runbooks, Experiment Design, Incident Response, SRE

Description: Evaluate runbook effectiveness with comparable incident cohorts, exposure tracking, uncertainty, and recovery-quality guardrails.

---

A lower MTTR after publishing a runbook does not prove the runbook caused the improvement. The later incidents may be less severe, responders may have learned independently, monitoring may have improved, or a few long events may have left the window. Treat runbook evaluation as a causal-inference problem with imperfect operational data.

## State a Testable Hypothesis

Specify the runbook, eligible incident class, phase it should change, and guardrails. For example:

> For production connection-pool exhaustion incidents, presenting Runbook v3 at acknowledgment reduces acknowledgment-to-effective-mitigation time without increasing failed mitigation, reopen, or data-integrity events.

This is stronger than `Runbooks reduce MTTR`. A diagnostic runbook cannot explain faster detection if it is not available until after the page. Match the primary measure to the steps it changes.

## Record Exposure and Adherence

An incident after publication is not necessarily treated by the runbook. Capture:

```text
incident_id, runbook_id, runbook_version
eligible_at, presented_at, opened_at
first_step_started_at, steps_completed
deviation_reason, mitigation_action, outcome
```

Use version at incident time. A later edit must not retroactively label an incident as exposed to instructions it never contained.

Distinguish assignment, availability, presentation, opening, and adherence. When presentation is randomized, an intention-to-treat view compares every incident in the arm to which it was assigned, including cases where delivery failed, the prompt was not opened, or responders did not adhere. A presentation-based view is an as-treated exposure analysis. A per-protocol view of incidents where responders followed the runbook can be strongly selected because easy cases are more likely to follow the script. Show secondary views when useful, but do not claim they preserve the causal protection of random assignment.

## Define Comparable Cohorts

Match or stratify on pre-treatment characteristics:

- service and affected component;
- failure mode and trigger;
- impact scope and severity measured before assignment or presentation;
- traffic and time of day;
- automation and observability versions;
- responder staffing model;
- dependency health;
- whether the failure was novel or repeated.

Do not match on outcomes that happen after runbook use, such as final incident severity or whether mitigation succeeded. That can introduce bias.

Keep an eligibility funnel: all incidents, classified failure mode, runbook eligible, runbook presented, valid duration, and completed outcome. Review excluded rows.

## Choose the Strongest Feasible Design

### Simulations and paired game days

Run the same bounded scenario with and without the runbook, randomizing order and balancing experience. This provides control over failure conditions, though exercise behavior may not generalize fully to production pressure.

### Randomized presentation

When safe and ethically acceptable, randomize an assistive runbook prompt among eligible low-risk cases while leaving normal tools and escalation available. Never withhold a required safety procedure.

### Stepped rollout

Roll out the runbook to comparable teams or services in a randomized or planned order. Compare changes over the same calendar periods, controlling for common trends.

### Matched observational comparison

When incidents are rare, compare each exposed incident with historical or contemporary incidents sharing the failure class and impact. This is weaker because unmeasured differences remain; phrase results as an association.

## Analyze the Effect, Not Just Two Means

Let \(Y\) be acknowledgment-to-effective-mitigation duration. Report median, p75 or p90, mean, raw points, and sample size for both cohorts. Estimate the difference directly:

\[
\Delta=median(Y_{runbook})-median(Y_{comparison})
\]

Bootstrap the difference within the design's unit. If rollout was by team, resample teams or clusters rather than treating every incident as fully independent. With a paired exercise, bootstrap or analyze pairs.

Predeclare the primary measure and analysis window. Trying many service filters and reporting only the best result turns noise into a success story.

Small samples are normal. A wide interval should lead to more evidence and qualitative review, not a false declaration that the runbook has no effect.

## Include Recovery-Quality Guardrails

A runbook can make responders act faster but worse. Track:

- effective mitigation on first attempt;
- rollback or action failure;
- incident reopen within a declared stability horizon;
- recurrence of the same failure mode;
- user-minutes and error-budget consumption;
- data loss or security policy violation;
- unnecessary escalation;
- responder-hours and cognitive load.

Define recovery success before looking at results. Ticket resolution is too weak if the SLI regresses ten minutes later.

## Learn from Deviations

Runbooks cannot encode every production state. A deviation may show missing prerequisites, stale commands, an unsafe assumption, or a genuinely novel failure. Review the working record and postmortem without blaming the responder.

Classify failure to use the runbook: not found, not presented, unclear entry condition, missing access, unsafe step, stale dependency, failed automation, or scenario mismatch. These are product requirements for the runbook system.

OneUptime can attach and start matching runbooks through runbook rules, which makes eligibility and execution records useful integration points. Preserve the incident and runbook version when exporting analytics.

## Decide What to Do Next

Adopt or expand when the effect is practically useful, guardrails are acceptable, and evidence applies to the intended population. Revise when responders reach the right path but encounter friction. Retire a runbook when the failure is engineered away or its assumptions no longer hold.

The best outcome may be automation. A consistently successful deterministic step can become a tested recovery control with observability and rollback, while the runbook handles exceptions.

## Official Documentation

- [Google SRE Workbook: Incident Response](https://sre.google/workbook/incident-response/)
- [Google SRE Book: Emergency Response](https://sre.google/sre-book/emergency-response/)
- [Google SRE Book: Testing for Reliability](https://sre.google/sre-book/testing-reliability/)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [OneUptime runbook rules](https://oneuptime.com/docs/en/runbooks/rules)
- [National Academies and NCBI Bookshelf: Intention-to-treat glossary](https://www.ncbi.nlm.nih.gov/books/NBK209906/)

## Conclusion

To test a runbook, define the eligible failure class, record actual exposure and version, compare like with like, and measure the response phase the instructions can affect. Pair speed with recovery-quality guardrails and uncertainty. The result should guide revision or automation, not manufacture causal certainty from a before-and-after chart.
