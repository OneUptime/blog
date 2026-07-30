# Measure Platform Toil from Tickets, Interruptions, and Manual Approvals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Toil, Support, Automation, Developer Experience, Metric

Description: Quantify platform toil as human effort and interruption cost while distinguishing repetitive operational work from valuable engineering and support.

---

A queue containing 800 platform tickets does not mean the platform created 800 units of toil. One ticket may be an automatable access approval that takes two minutes. Another may be a novel architecture consultation that creates lasting value. Counting both as equal “manual work” produces a number that is easy to graph and hard to act on.

Google SRE defines toil through characteristics: it tends to be manual, repetitive, automatable, tactical, without enduring value, and scales linearly as the service grows. That definition is a useful filter for platform work too.

Measure the human effort consumed by routine support, interruptions, and approvals-then use workflow categories to identify what can be removed.

## Classify Work Before Counting It

Tag each support or operational item along two axes.

First, identify the work type:

- incident response;
- routine service request;
- manual approval;
- failed-workflow assistance;
- how-to or discovery question;
- defect investigation;
- consultation or design review;
- platform engineering project;
- administrative overhead.

Second, evaluate toil characteristics:

| Characteristic | Question |
| --- | --- |
| Manual | Must a person actively perform the step? |
| Repetitive | Has substantially the same work happened before? |
| Automatable | Could software or a safer process satisfy it? |
| Tactical | Is it reactive and interrupt-driven? |
| No enduring value | Is the system essentially unchanged afterward? |
| Scales with demand | Does work rise roughly in proportion to teams, services, or requests? |

Do not call every unpleasant task toil. A first investigation of a new failure mode may be valuable engineering. Repeating the same workaround for its fiftieth occurrence is different.

## Measure Effort, Not Ticket Count Alone

For each work item, capture:

```text
created_at
first_human_touch_at
resolved_at
active_person_minutes
number_of_people_involved
number_of_handoffs
interruption_flag
after_hours_flag
request_or_failure_category
workflow_and_version
toil_classification
automation_candidate
```

The core quantity is active human time. Sum each participant's hands-on time, so ten active minutes from two people is twenty person-minutes:

```text
toil hours =
  sum(active person-minutes for toil-classified work) / 60
```

Do not use ticket elapsed time as labor. A request open for three days may contain eight minutes of active work and a long wait for the requester.

If exact time tracking would be burdensome, use calibrated effort bands:

```text
0-5 minutes
6-15 minutes
16-30 minutes
31-60 minutes
1-4 hours
more than 4 hours
```

Periodically sample items and compare estimates with direct observation. The measurement process should not become significant toil itself.

## Account for Interruption Cost

An interruption has more cost than its handling minutes. It breaks planned work and often causes context switching.

Track:

- number of interrupt-driven contacts;
- responders interrupted;
- time from interruption to return to planned work, in a short sample;
- pages, urgent chat mentions, walk-ups, and escalations;
- after-hours interruptions;
- repeated interruptions for the same failure class.

Do not invent a universal context-switch multiplier. Measure a representative sample or report direct interruption minutes separately:

```text
direct toil hours
interruptions per platform engineer
sampled recovery-to-focus time
```

Google SRE’s guidance on operational load distinguishes pages, tickets, and ongoing operational responsibilities. Preserve those categories because a page with a minutes-level response expectation is not equivalent to a planned queue item.

## Instrument Manual Approvals as Workflow Stages

Every approval should emit or record:

- request submitted;
- approver group resolved;
- review started;
- approved, rejected, expired, or cancelled;
- requested changes;
- execution completed;
- exception invoked.

Then calculate:

```text
manual approval rate =
  successful eligible workflows with >= 1 manual approval
  / successful eligible workflows

approval touch time =
  sum(active reviewer person-minutes)

initial approval queue time =
  review start time - approval request time

approval decision lead time =
  approval decision time - approval request time

straight-through rate =
  eligible workflows completed without human action
  / eligible completed workflows
```

Keep touch time, initial queue time, and decision lead time separate. Automation may remove a three-day queue without reclaiming much labor, or save substantial reviewer time while an external wait remains.

Measure approval outcomes. A control that approves 99.9% of routine requests may be a candidate for automated policy, while a high rejection rate may indicate valuable review or confusing requirements. The metric starts the investigation; it does not decide the control.

## Build a Toil Taxonomy

Use categories tied to remedies:

| Toil category | Example | Likely response |
| --- | --- | --- |
| Discovery | “Which template do I use?” | Search, catalog metadata, or clearer entry point |
| Configuration | Repeatedly editing the same field | Better default or generated configuration |
| Access | Routing a routine role request | Policy-driven entitlement |
| Approval | Human verifies machine-checkable facts | Automated guardrail |
| Failure recovery | Resetting stuck workflow state | Idempotency and self-recovery |
| Exception handling | Repeated waiver for one workload class | Product capability or policy redesign |
| Status inquiry | “Is provisioning done?” | Visible state and notifications |
| Handoff | Finding the owning team | Ownership metadata and routing |

Limit free-form “other.” Review and split it regularly so emerging problems do not disappear.

## Normalize by Demand

Total toil may rise while the platform becomes more efficient because the organization adds teams and services. Report both total and unit rates:

```text
support toil hours per 100 active services
interruptions per 1,000 workflow executions
manual approval minutes per deployment
tickets per newly onboarded team
```

Choose a denominator related to the cause of the work. Tickets per employee is unhelpful if service count drives support.

Also report coverage. A lower ticket rate can mean better self-service, but it can also mean developers bypass the platform or stop asking for help.

## Find Repetition with Pareto Analysis

Group work by normalized request or failure class, not exact ticket subject. For each class, show:

- occurrence count;
- total active minutes;
- interruption count;
- affected teams;
- recurrence trend;
- automation feasibility;
- failure or control risk;
- proposed owner.

The most frequent item is not always the best target. Prioritize expected net value:

```text
annual avoidable hours
* realistic reduction
* loaded labor rate
- build and operating cost
```

Add risk reduction and developer wait-time impact as separate benefits. Do not force every benefit into currency.

## Track Automation Outcomes Honestly

For each toil-reduction change, establish:

- baseline volume and effort;
- target population;
- expected reduction;
- rollout date;
- new failure modes;
- maintenance burden;
- exceptions still requiring people;
- result after a stable observation period.

Automation that converts one manual ticket into three alert investigations has moved toil, not removed it. Include automation failures, override reviews, and ongoing maintenance.

Google SRE notes that automation should not remove human understanding and that toil reduction should be evaluated against its implementation cost. Sometimes simplifying or changing a process is better than automating it exactly.

## Create a Monthly Toil Review

Review:

1. total toil hours and rate per demand unit;
2. top recurring classes by hours and interruptions;
3. manual approval rate, touch time, initial queue time, and decision lead time;
4. after-hours and high-severity work;
5. emerging “other” categories;
6. automation results and newly created toil;
7. one or two prioritized elimination experiments.

Include application-team support effort created by the platform, not only effort inside the platform team. A confusing workflow that shifts diagnosis to every product team can make the central queue look excellent.

## Avoid Misleading Targets

- **“Zero tickets”:** discourages useful feedback and consultation.
- **Ticket closure speed:** rewards shallow closure or reclassification.
- **One fixed toil cap copied from another organization:** context differs; Google explicitly notes its 50% operational-work limit may not fit everyone.
- **All approvals are waste:** some embody necessary judgment.
- **All support is toil:** design assistance and new investigations create value.
- **Engineer-level rankings:** people avoid difficult work or underreport time.
- **Hours saved as cash saved:** reclaimed capacity only becomes financial value when it changes staffing, spend, or delivered work.

Platform toil becomes manageable when the unit is human effort attached to a repeatable workflow. Classify it, sample it, normalize it by demand, and remove the causes that generate the largest avoidable burden-without treating necessary human judgment or developer feedback as failure.

## Official Documentation

- [Google SRE Workbook: Eliminating Toil](https://sre.google/workbook/eliminating-toil/)
- [Google SRE: Eliminating Toil](https://sre.google/sre-book/eliminating-toil/)
- [Google SRE: Dealing with Interrupts](https://sre.google/sre-book/dealing-with-interrupts/)
- [Microsoft Learn: Empower developers through self-service](https://learn.microsoft.com/en-us/platform-engineering/about/self-service)
