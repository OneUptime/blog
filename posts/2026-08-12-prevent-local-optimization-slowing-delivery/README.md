# How to Prevent Local Optimization from Making the End-to-End Delivery System Slower

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Continuous Improvement, Systems Thinking, Flow, Value Streams, Kanban, Software Delivery

Description: Prevent team-level efficiency gains from increasing queues and delivery time by aligning boundaries, measures, WIP policies, and experiments around customer outcomes.

---

A development team automates code generation and doubles the rate at which changes reach review. Reviewers receive twice as much work, their queue grows, feedback arrives later, and completed delivery slows. Every local chart can look better while the customer waits longer.

That is local optimization: improving one activity, resource, or team's output without improving—and sometimes while damaging—the performance of the whole value stream. Software organizations are vulnerable because work crosses product, design, development, security, platform, operations, and support boundaries, while dashboards and incentives usually stop at each boundary.

Preventing it does not mean ignoring local craftsmanship or efficiency. It means evaluating local changes by their effect on the end-to-end system and managing the interfaces, queues, and constraints that connect the parts.

## Define the whole that matters

Lean Enterprise Institute distinguishes local efficiency at one process point from total efficiency across a complete process or value stream. Its value-stream mapping guidance emphasizes improving the whole rather than isolated parts. The first protection against local optimization is therefore an explicit system boundary.

For a product change, a boundary might start when a customer problem is accepted and end when the change operates successfully and its result can be observed. “Code complete” is an internal milestone, not a delivered outcome. If your team controls only part of that path, it can still measure the wider path and collaborate with the other participants.

Write down:

- the customer or user of the service;
- the demand types included;
- the start and finish events;
- the value or outcome expected at finish;
- the quality, reliability, compliance, and sustainability guardrails;
- every team and external service on the path.

Different demand types may need different policies. An incident recovery and a planned product experiment should not be forced into one average, but both can have a customer-relevant end point.

## Recognize common local optimizations

Local optimization often appears reasonable in isolation:

- **Maximizing developer utilization.** Everyone starts work so nobody looks idle; testing and review receive a growing queue.
- **Batching reviews or releases.** A specialist saves setup time, while every item waits for the batch window.
- **Measuring handoffs as completions.** Development counts “done” when work enters test, even when half returns for rework.
- **Centralizing a decision.** Consistency improves locally, but an approval inbox becomes the delivery constraint.
- **Automating a non-constraint.** Upstream output rises while the slowest downstream step remains unchanged.
- **Optimizing a service-level target.** A team closes tickets quickly by transferring them, increasing customer effort and end-to-end resolution time.
- **Reducing one cost center.** Fewer operations staff or release windows cut a departmental cost while lead time and recovery risk grow.
- **Standardizing every case.** A platform makes its maintenance easier while product teams wait or build workarounds for needs the standard cannot serve.

The warning sign is a local output measure with no downstream consequence. Ask where the work goes next, what queue it joins, how often it returns, and when a customer can actually use the result.

## Map work and information end to end

DORA's guidance on visibility of work recommends mapping the complete value stream and explicitly warns that partial maps can cause local optimization. Bring business, design, development, quality, security, operations, support, and other participating groups into the same current-state view.

For each major step, record:

- active processing time and total elapsed time;
- queue size and queue time;
- work in progress;
- entry and exit policies;
- handoff signal and required information;
- percent complete and accurate at receipt;
- rework destinations and frequency;
- the team or service with decision authority.

Follow recent work items rather than the documented ideal. Draw information flow as well as artifact movement. A deployment may take ten minutes, yet a missing risk classification waits four days for an approval meeting; the information path is the actual constraint.

Once the map exists, check every proposed improvement against it. If the change makes one box faster, does inventory accumulate before the next box? Does the receiving team need more clarification? Does a faster handoff reduce or increase total elapsed time?

## Replace utilization with flow as the operating priority

High utilization sounds efficient, but a fully loaded delivery system has little capacity to absorb variation, reviews, incidents, or collaboration. Queues grow, context switching increases, and feedback arrives later. Kanban University describes balancing utilization with flow; DORA's WIP guidance tells teams not to raise limits simply to keep someone busy.

Use a pull policy instead:

1. Make all started work visible.
2. Limit WIP in active states, queues, and across the system.
3. Pull only when downstream capacity exists.
4. When a limit is reached, finish, unblock, review, test, or improve instead of starting more.
5. Preserve some capacity for operational variation and urgent demand.

An idle specialist is a local observation. An aging customer item is a system signal. If the specialist cannot help, that exposes a skills, architecture, tooling, or organizational boundary worth improving. Starting unrelated work hides the learning under more inventory.

## Find the constraint, then subordinate upstream work

The constraint is the part of the current system that most restricts the rate of valuable completion. It may be a technical environment, scarce expertise, decision policy, rework loop, or demand-selection process—not necessarily the team with the longest active task.

Use evidence from queues, work item age, cycle-time distributions, blocked time, throughput, and rework. Observe the constraint over multiple items because transient incidents can mislead.

Then protect it from avoidable work and poor inputs:

- improve entry quality and acceptance policies;
- send smaller, independently valuable items;
- reduce switching and unplanned interruption;
- move checks earlier where that prevents costly returns;
- automate repetitive work at the constraint;
- cross-skill and collaborate rather than merely transfer ownership;
- stop upstream release of work the constraint cannot yet pull.

Making upstream faster is useful only if the end-to-end system can turn the additional output into finished value. Otherwise the “gain” is inventory.

## Use a balanced system scorecard

No single metric protects the whole system. A throughput-only target can encourage tiny or low-value tickets. A cycle-time-only target can encourage a later start definition. A utilization target can flood queues. Pair precise definitions with several perspectives.

A practical scorecard includes:

| Perspective | Measures and evidence |
| --- | --- |
| Customer outcome | Adoption, task success, resolved problem, or another product-specific result |
| Flow | End-to-end cycle time, throughput, WIP, work item age, and queue time |
| Quality and reliability | Rework, escaped defects, failed changes, service performance, and recovery |
| Demand | Arrival rate, work-type mix, expedites, and abandoned requests |
| Sustainability | Interruptions, overload signals, and capacity for learning and operations |

The Kanban Guide supplies exact definitions for minimum flow metrics; use distributions and time series rather than a single average. DORA's delivery capabilities emphasize that speed and stability belong together. The customer outcome prevents a smooth pipeline for unwanted features from being declared successful.

Keep local measures as diagnostics. Review duration can help improve reviewing, build time can improve CI, and platform adoption can reveal usability. Do not make them the final success criteria for an end-to-end change.

## Align ownership and incentives across handoffs

If each team is rewarded for output handed to the next team, queues are rational behavior. Give a cross-functional group shared responsibility for the service and its customer-facing flow. This need not require an immediate reorganization; it does require common definitions, review cadence, and decision rights.

Useful governance includes:

- one visible value-stream map and data dictionary;
- shared start, finish, and work-item definitions;
- a regular flow review attended by adjacent groups;
- an owner who can convene participants and escalate systemic obstacles;
- joint improvement capacity rather than unfunded requests to another team;
- objectives that include end-to-end outcomes and guardrails;
- explicit policies for urgent work, dependencies, and exceptions.

Be careful with individual rankings and team league tables. Work complexity and system position differ, and competition discourages truthful blocker reporting. The goal is to improve the service, not identify a locally “slow” participant.

## Evaluate changes with a downstream impact check

Before approving a local improvement, ask five questions:

1. Which customer-facing outcome should change, and why?
2. What happens to total elapsed time and its variability?
3. Where will inventory, waiting, or decision load move?
4. Could defect detection or rework move later?
5. Which quality, reliability, and sustainability guardrails could regress?

Then make the change a bounded experiment:

~~~text
Observation: Build configuration waits two days for platform review.
Change: Offer a validated self-service template for the standard case.
System hypothesis: End-to-end cycle time will fall because the review queue
shrinks, without increasing failed changes or support demand.
Local measure: Standard-case review demand.
System measures: Cycle time, queue time, throughput, rework, failed changes.
Review: Compare four weeks with the defined baseline and decide keep/revise/revert.
~~~

Instrument downstream effects before rollout. Annotate demand changes, incidents, freezes, and staffing changes. If upstream output improves but downstream queue time rises by more, call the experiment unsuccessful even if the local automation works perfectly.

## Design feedback loops that expose displacement

A local improvement can initially look successful because its cost appears later or elsewhere. Review evidence at multiple cadences:

- **Daily:** aging work, blockers, WIP-limit breaches, and the nearest downstream queue.
- **Weekly:** end-to-end throughput, cycle-time scatterplot, queue time, rework, and demand mix.
- **Per release or change:** quality, reliability, support demand, and customer behavior.
- **Monthly or quarterly:** value-stream map, current constraint, strategic outcome, and sustainability.

Ask downstream recipients whether inputs became more complete and accurate. Ask support whether failure demand moved to customers. Ask operations whether release acceleration increased recovery load. Numbers identify a pattern; direct cross-boundary feedback explains it.

## Example: a faster review process that slows delivery

Imagine a security group introduces a 24-hour review target. To meet it, reviewers quickly mark incomplete requests as rejected. Their local response time improves. Product teams wait for clarification, resubmit work, and lose context. End-to-end cycle time and rework rise.

A system response would not demand that security ignore risk. It would map the return loop, measure complete-and-accurate inputs, and create an explicit standard-change policy. Security could collaborate during design for novel risks while a validated automated path handles common cases. Success would mean shorter total elapsed time with preserved or improved risk outcomes—not simply faster first responses.

This pattern applies to quality gates, architecture reviews, platform tickets, and operations approvals. Optimize the decision and feedback path, not the speed with which one inbox transfers responsibility.

## When a local improvement is still the right move

Some changes clearly improve a local process: a faster test, clearer documentation, or safer deployment automation. Proceed when the mechanism is credible, but connect it to the broader hypothesis. A build that drops from twenty minutes to five may reduce end-to-end feedback time if builds are on the critical path; it may have no material delivery impact if work waits a week for product approval.

Both results can be worthwhile. The distinction prevents overstating benefits and helps allocate improvement effort. Local maintenance, risk reduction, and developer experience are legitimate outcomes when named honestly and balanced against the system's current constraint.

## Official Documentation

- [Lean Enterprise Institute: Value-stream mapping](https://www.lean.org/lexicon-terms/value-stream-mapping/)
- [Lean Enterprise Institute: Efficiency](https://www.lean.org/lexicon-terms/efficiency/)
- [Lean Enterprise Institute: Learning to See excerpt](https://www.lean.org/wp-content/uploads/2021/01/Learning-to-See-part1.pdf)
- [DORA: Visibility of work in the value stream](https://dora.dev/capabilities/work-visibility-in-value-stream/)
- [DORA: Work in process limits](https://dora.dev/capabilities/wip-limits/)
- [DORA: Continuous delivery](https://dora.dev/capabilities/continuous-delivery/)
- [The Kanban Guide](https://kanbanguides.org/the-kanban-guide/)
- [The Official Kanban Guide — Kanban University](https://kanban.university/kanban-guide/)

## Conclusion

Local improvements become system improvements only when they reduce the time and risk required to produce a valuable customer outcome. Define that end-to-end boundary, map the work and information flow, limit WIP, focus on the current constraint, and judge experiments with customer, flow, quality, demand, and sustainability evidence. Keep local metrics for diagnosis, but make shared end-to-end results the basis for decisions. That prevents a faster box on the diagram from creating a slower delivery system.
