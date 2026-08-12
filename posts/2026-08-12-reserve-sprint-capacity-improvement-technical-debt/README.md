# Reserve Sprint Capacity for Improvement and Technical Debt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Continuous Improvement, Technical Debt, Sprint Planning, Capacity Planning, Scrum, Engineering Management

Description: Choose an evidence-based improvement capacity policy from demand, risk, and delivery data instead of copying a universal percentage that ignores your system.

---

There is no authoritative Scrum percentage for improvement work or technical debt. Ten, 15, and 20 percent are common organizational policies, not rules in the Scrum Guide. The right reservation is the smallest sustained investment that prevents important improvement demand from aging faster than the team can resolve it-and that level changes with risk, operational load, and the health of the delivery system.

This is why “What percentage should we use?” is the second question. The first is “What demand must this team absorb, and what happens when it does not?”

## Treat Capacity as a Policy, Not a Hidden Hope

Improvement work includes more than refactoring. It can include:

- removing repetitive operational toil;
- upgrading a dependency before support ends;
- reducing build, test, or review delay;
- strengthening recovery, security, and observability controls;
- simplifying a fragile component;
- running a process experiment from a retrospective;
- paying down a deliberate design compromise;
- measuring a problem well enough to choose a change.

If this work is expected to happen only “when there is time,” planned feature work usually consumes the visible capacity and unplanned work consumes the rest. The result is an implicit zero-percent policy, even if leaders regularly say quality matters.

Make the policy explicit. A policy can be a percentage, a fixed number of work items, a rotating engineer, slack enforced through work-in-progress limits, or capacity triggered by risk thresholds. What matters is that teams and stakeholders can see the tradeoff and revisit it with evidence.

## Start from Actual Capacity

Do not multiply a percentage by an idealized headcount. Begin with the capacity the people doing the work expect to have during this Sprint. The Scrum Guide says Developers select Product Backlog items for the Sprint through discussion with the Product Owner; knowledge of their past performance, upcoming capacity, and Definition of Done increases confidence in their Sprint forecast.

A simple planning model is:

```text
available person-days
  = working days × available people
  - leave and holidays
  - known support/on-call load
  - mandatory organizational work

improvement reservation
  = available person-days × policy percentage
```

Suppose a six-person team has a ten-day Sprint. Leave removes six person-days, and expected support rotation consumes eight. Available capacity is 46 person-days, not 60. A 15% policy reserves about seven person-days. Treat that as a planning signal, not precision: knowledge work varies, support arrivals are stochastic, and a seven-person-day budget does not guarantee a seven-person-day outcome.

Use historical throughput or completed work as a second view. If a team usually finishes 12 similarly sized items per Sprint, reserving two improvement items may be clearer than converting story points or hours into a percentage.

## Quantify the Demand You Are Deferring

Make improvement demand visible in the Product Backlog, then separate it by urgency and economic effect:

| Demand class | Useful evidence |
| --- | --- |
| Reliability and security exposure | Error-budget burn, incident recurrence, vulnerability deadlines |
| Time-critical maintenance | End-of-support and certificate or contract dates |
| Toil | Human hours per week, interruption count, growth rate |
| Flow constraint | Queue time, work item age, blocked time, rework |
| Product quality | Escaped defects, failure demand, customer impact |
| Strategic enablement | Capability unlocked and decision deadline |

Measure arrival and completion rates. If an average of four material improvement items arrive each month and the team finishes one, the backlog will grow regardless of whether the reservation is called 10% or 20%. Item count alone is imperfect, so also watch the age and risk of unfinished work.

Technical debt should not be treated as one undifferentiated balance. A dated library upgrade with an exploited vulnerability, a slow test suite that adds 30 minutes to every change, and an inelegant but stable internal abstraction have different urgency. Prioritize the consequence, not the label.

## Choose a Starting Policy

When data is weak, choose a reversible starting point and define a review date. Three reasonable patterns are:

### Fixed reservation

Reserve, for example, 15% of actual capacity for two or three Sprints. This is easy to explain and protects work from short-term pressure. It can be wasteful if the backlog is not ready or inadequate during a concentrated risk period.

### One-item floor

Commit to finishing at least one high-impact improvement each Sprint. This works when item sizes are comparable and makes the commitment tangible. It fails if teams game sizing or select a trivial item to satisfy the rule.

### Triggered capacity

Set a normal floor, then increase it when agreed thresholds fire. Examples include excessive error-budget consumption, a support deadline entering the planning horizon, toil exceeding a cap, or the oldest high-risk item exceeding its service expectation. This aligns investment with changing conditions but requires trustworthy signals and authority to change the plan.

A hybrid often works best: a modest protected floor plus explicit triggers. Record the initial policy as a hypothesis:

```yaml
policy: "Reserve 15% of actual Sprint capacity"
duration: "next 4 Sprints"
selection: "highest-risk ready improvement items"
expected_result:
  - "oldest high-risk item age falls below 45 days"
  - "manual release toil falls by 4 hours per week"
guardrails:
  - "Sprint Goal success does not decline"
  - "after-hours work does not rise"
review: "after Sprint 4"
```

The numbers are illustrative. Your baseline, risk tolerance, and work-item shape should determine your experiment.

## Do Not Misapply Google's 50% SRE Rule

Google's SRE material places an upper bound of 50% on operational work so at least half of SRE time remains for engineering project work. That is a deliberate rule for the SRE operating model, designed to prevent operational load from consuming the function. The SRE Workbook explicitly notes that this target may not suit every organization.

It is useful evidence that capacity boundaries can protect long-term engineering, but it is not a recommendation that every product team reserve 50% for a technical-debt backlog. Product development, on-call structure, service maturity, staffing, and the definition of “engineering work” all differ. Borrow the principle-bound work that expands without limit-not the number without its context.

## Integrate Improvement with the Product Goal

Do not build a permanent “feature work versus engineering work” wall. Reliability, maintainability, and delivery capability contribute to product value. Where possible, describe improvement items in outcome terms:

- “Cut checkout recovery time” instead of “refactor worker”;
- “Restore supported database versions before November” instead of “tech debt”;
- “Reduce merge-to-production p85 from six hours to two” instead of “fix CI”;
- “Remove eight weekly manual certificate renewals” instead of “automation cleanup.”

The Product Owner orders the Product Backlog, while Developers forecast what can be completed and determine how work is done. Use Sprint Planning to make the tradeoff visible. A reservation is not a secret sub-backlog that bypasses product decisions, nor should stakeholders force a forecast that ignores known maintenance and support work.

Some improvement belongs inside the Definition of Done rather than a capacity pool. Tests, security checks, documentation necessary to operate a change, and routine refactoring needed for a maintainable Increment should not be continually deferred as separate debt. A separate reservation is most useful for cross-cutting or accumulated changes that cannot reasonably fit inside one feature's completion.

## Protect Slack Without Filling It in Advance

Capacity does not need to be preassigned to named tasks. The Open Guide to Kanban describes slack as intentionally unused capacity that absorbs variability and urgent demand or enables continuous improvement. A team might control work in progress below theoretical capacity, then use available time to improve the system.

This is different from planning every engineer to 100% and labeling contingency work “stretch.” Slack loses its purpose when managers immediately fill every open slot. Use pull policies: when an engineer finishes current work, they help complete existing items, address an eligible improvement, or learn-not automatically start another feature.

Track work in progress, throughput, work item age, and cycle time. If the reservation starts more improvement items but completion and age worsen, reduce simultaneous work and slice items smaller. Utilization is not the objective; faster, safer value flow is.

## Review the Policy with Balanced Evidence

After a fixed observation window, inspect both results and guardrails:

- arrival, completion, and age of high-risk improvement items;
- hours of toil and unplanned interruption;
- delivery throughput and lead time;
- change failure and recovery performance;
- Sprint Goal outcomes;
- customer reliability or quality indicators;
- team after-hours work and perceived sustainability;
- percentage of reserved capacity actually used on selected outcomes.

Interpret the system, not just the percentage. If 20% was reserved but work remained blocked on another team, increasing to 30% will not resolve the dependency. If improvement work repeatedly gets displaced by incidents, the team may need a reliability intervention rather than a larger nominal allocation. If the ready backlog is empty, invest in discovery or reduce the reservation.

Then make an explicit decision: keep, increase, decrease, change the selection policy, or switch from a percentage to a trigger. Publish why so the rule does not fossilize into unexplained process.

## Common Failure Modes

- **Universal mandate:** every team receives the same number despite different risk and operating load.
- **Percentage theater:** the policy exists, but feature commitments still assume 100% of capacity.
- **Debt bucket:** unrelated work is hidden under a label with no outcome or ordering rationale.
- **Output counting:** success means consuming the allocation, not reducing risk or delay.
- **Permanent exception:** urgent product work displaces the reservation every Sprint.
- **Individual cleanup time:** engineers are expected to pay debt alone without team or product visibility.
- **No review date:** a useful experiment becomes a ritual that nobody can explain.

## Official Documentation

- [The Scrum Guide](https://scrumguides.org/scrum-guide.html)
- [The Kanban Guide](https://kanbanguides.org/the-kanban-guide/)
- [Open Guide to Kanban](https://kanbanguides.org/open-guide-to-kanban/2025.7/)
- [Google SRE: Eliminating Toil](https://sre.google/sre-book/eliminating-toil/)
- [Google SRE Workbook: Eliminating Toil](https://sre.google/workbook/eliminating-toil/)
- [Google SRE: Being On-Call](https://sre.google/sre-book/being-on-call/)
- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)

## Conclusion

There is no correct universal Sprint-capacity percentage for improvement and technical debt. Start with actual available capacity, quantify the demand and risk being deferred, choose a visible and reversible policy, and test it over several Sprints with outcome and sustainability guardrails. A modest protected floor plus evidence-based escalation triggers is usually more resilient than a fixed slogan. The goal is not to spend a target percentage; it is to keep the delivery system safe, supportable, and able to improve without relying on spare-time heroics.
