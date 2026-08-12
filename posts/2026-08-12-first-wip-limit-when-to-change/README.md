# What Should Your First WIP Limit Be-and When Should You Change It?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Continuous Improvement, Kanban, WIP Limits, Flow, Pull Systems, Delivery Management

Description: Set a defensible first work-in-progress limit, operate it as a pull policy, and change it only through measured experiments that improve end-to-end flow.

---

A work-in-progress limit is not a target for how much work a team should start. It is an upper bound on started but unfinished work. Its purpose is to create a pull system: new work enters a state only when capacity is available, so congestion becomes visible and people have a reason to finish, unblock, and collaborate.

There is no universal first number. A limit of five can be loose for a pair and impossible for a team operating five independent services. The right opening limit comes from the real workflow, available collaboration capacity, and a deliberate willingness to expose problems without making service unsafe.

The first limit is therefore a hypothesis. Make it explicit, follow it consistently, observe flow, then change it as a controlled experiment-not whenever the board becomes uncomfortable.

## Define the system before choosing a number

The Kanban Guide requires a Definition of Workflow that includes where work starts and finishes, the states work passes through, how work in progress is controlled, and the explicit policies governing movement. A number without these definitions is ambiguous.

Before setting a limit:

1. Choose the service and its customer-facing boundary.
2. Put every started item on the board, including maintenance, incidents, support, and unplanned work.
3. Separate active states from queues such as “Ready for review.”
4. Make blocked items visible; blocked work still counts as WIP.
5. Identify who can actively advance work in each part of the workflow.
6. Define completion for every state and for the whole system.

Hidden work defeats the policy. If engineers keep personal task lists while the shared board remains below its limit, the displayed number controls only reporting, not the system.

## A practical first-limit method

DORA's WIP-limit guidance starts from team capacity. It gives an example of four programming pairs and a development-column limit of four, then advises accounting for time spent on support, meetings, technical debt, and other responsibilities. It also recommends avoiding more WIP than the number of people-or collaborating units-who can actively work on it.

Use that as a starting heuristic, not a formula:

1. **Count effective collaborating units.** Four engineers who normally pair may have capacity for two active implementation items, not four. A reviewer shared across three teams may be able to progress only one review at a time.
2. **Subtract predictable competing demand.** On-call, operational support, leave, and recurring obligations reduce capacity available to this workflow.
3. **Set an active-state limit near that capacity.** Each item should have someone able to advance it now.
4. **Set queue limits deliberately.** A “Ready for test” column with no upper bound can hide the system's largest inventory.
5. **Add a system-wide limit.** Local column limits alone can permit too much total started work or move a pile from one queue to another.

Suppose a six-person product team usually works as two implementation pairs, has one person on support, and one person able to test or deploy. A plausible experiment might be:

| State | Initial limit | Rationale |
| --- | ---: | --- |
| Building | 2 | Two pairs can advance two items |
| Ready for review | 1 | Prevent a hidden review batch |
| Reviewing and testing | 1 | One item can receive focused downstream attention |
| Ready to deploy | 1 | Keep the deployment queue visible and small |
| Total started, unfinished | 4 | Constrain the end-to-end system, not just columns |

These numbers are not a reusable prescription. They illustrate how capacity and workflow shape the policy. If review and testing are collaborative activities rather than specialist-owned stages, the board and limits should reflect that reality.

## Make the pull rule explicit

A WIP limit changes behavior only if everybody knows what happens when a state is full. The basic pull policy is:

> Do not pull a new item into a state whose limit is reached. First help move existing work toward completion.

Kanban University summarizes this as “stop starting, start finishing.” DORA similarly warns against raising a limit merely so an idle person can begin something new; that person should help at or downstream of the constraint where possible.

Write an operating policy that answers these questions:

- Who may pull work and from which replenishment queue?
- What qualifies an item to enter or leave each state?
- What should someone do when their usual state is full?
- How are incidents or genuine fixed-date emergencies handled?
- Who can authorize an exception, and how is it recorded?
- Does a blocked item remain within the limit? It normally should, because it still consumes system capacity and represents unfinished demand.

An expedite policy should be narrow. An emergency may displace another item or occupy reserved capacity; it should not make all limits disappear. Record the reason and review it afterward. Frequent exceptions indicate that demand classes, service policies, or capacity assumptions need attention.

## What to do when the limit is reached

Reaching a limit is not a failure. It is the feedback mechanism working. Respond in this order:

1. Finish the nearest-to-done item.
2. Swarm on testing, review, deployment, or another downstream constraint.
3. Remove a blocker or obtain the missing decision.
4. Reduce scope while preserving a valuable independently finishable outcome.
5. Improve the workflow, tooling, or skills that prevent collaboration.
6. Only then consider explicitly breaking the limit for a time-critical reason.

Do not manufacture low-value work to keep every person utilized. Both DORA and the Kanban guidance favor flow over individual utilization. Some slack permits reviews, automation, learning, and fast response; flooding the system to eliminate all idle time increases queues and context switching.

## Observe before changing the limit

Choose an observation window long enough to include several ordinary completions and the normal variation in demand. A calendar month might be appropriate for a team completing several items each week; a low-volume workflow may need longer. Avoid deciding from one unusually quiet day or one incident-heavy week.

Capture a baseline and then inspect:

- WIP by state and total WIP
- Work item age for every active item
- Cycle-time distribution, especially the long tail
- Throughput by a stable time interval
- Queue or buffer time by state
- Blocked time and recurring blocker reasons
- Rework, escaped defects, and customer outcomes
- Expedite frequency and limit exceptions
- Team sustainability and ability to respond to urgent demand

Do not require every metric to improve simultaneously. A lower limit may initially reveal old work or reduce starts before completed throughput stabilizes. The question is whether the end-to-end system becomes more predictable and responsive without sacrificing quality or safety.

## When to lower a limit

Lower the limit by a small amount when current limits are rarely felt, items routinely flow without aging, and the team can safely test a tighter pull policy. DORA explicitly recommends reducing a limit when it is too easy to meet because the tighter constraint can reveal the next obstacle to flow.

A lower limit can be useful when:

- many items are nominally active but receive intermittent attention;
- queue time or context switching remains high;
- old work coexists with frequent new starts;
- batching dominates review, test, or deployment;
- throughput is stable but cycle-time variability is unnecessarily wide.

Change one meaningful limit at a time when practical. State the hypothesis, such as: “Reducing Building from four to three for four weeks will reduce the 85th-percentile cycle time without lowering completed throughput or increasing urgent-work failures.” Record the date and keep the old data under its original policy version.

## When raising a limit may be justified

Raising a limit is not forbidden. It simply needs system evidence. It may be sensible when a state with real available capacity is repeatedly starved, the downstream system can absorb more work, demand and item definitions are stable, and a small increase improves end-to-end outcomes.

Examples include adding a durable collaborating pair, removing a dependency that materially increases effective capacity, or discovering that a limit was below the smallest safe batch imposed by an external system. Even then, test the smallest increase and watch total WIP, downstream queues, cycle time, and quality.

Do not raise a limit merely because:

- someone is temporarily idle;
- a manager wants every specialist fully utilized;
- a queue is full after an unusual incident;
- stakeholders want more work “in flight”;
- blocked items make the board look bad;
- upstream throughput increased while downstream capacity did not.

Those are prompts to help, unblock, cross-skill, change demand policies, or improve the constraint. More inventory often masks the issue while making elapsed time worse.

## Consider changing the workflow before the number

A chronically breached limit sometimes means the model is wrong. Inspect whether one state mixes active and queued work, whether items are too large, whether a mandatory handoff adds no value, or whether a shared service needs an explicit service policy. Splitting a state into “Ready” and “Active” can reveal a queue, but it does not solve it. Removing the cause or improving collaboration does.

DORA recommends visualizing the complete value stream rather than a convenient fragment. A local limit can improve one team's chart while shifting inventory into another team's inbox. Track from the chosen start to a customer-relevant finish, and involve business, design, security, testing, operations, and support where they participate.

## Run a reversible WIP experiment

Use a lightweight change record:

~~~text
Policy change: Building limit 4 -> 3
Period: 1 September through 30 September
Reason: Three items are frequently unattended; review queue is growing
Expected effect: Less queue time and a narrower cycle-time tail
Guardrails: No increase in escaped defects or missed incident response
Review evidence: WIP, age, cycle-time distribution, throughput, blockers
Decision: keep, revert, or revise
~~~

Review the policy with the people doing the work. Kanban policies are intended to be explicit and evolve through feedback. A limit imposed without access to operational reality will invite workarounds; a shared experiment creates learning.

## Official Documentation

- [The Kanban Guide](https://kanbanguides.org/the-kanban-guide/)
- [Open Guide to Kanban](https://kanbanguides.org/open-guide-to-kanban/2025.7/)
- [The Official Kanban Guide - Kanban University](https://kanban.university/kanban-guide/)
- [DORA: Work in process limits](https://dora.dev/capabilities/wip-limits/)
- [DORA: Visibility of work in the value stream](https://dora.dev/capabilities/work-visibility-in-value-stream/)
- [Lean Enterprise Institute: Pull](https://www.lean.org/the-lean-post/articles/lean-roundup-pull/)
- [Lean Enterprise Institute: Value-stream mapping](https://www.lean.org/lexicon-terms/value-stream-mapping/)

## Conclusion

Start with limits grounded in the number of collaborating units that can genuinely advance work, adjusted for real competing demand, and constrain queues and the end-to-end system as well as active columns. Treat a reached limit as a signal to finish, swarm, or unblock. Lower or raise it only through an explicit, measured experiment. The best limit is not the most comfortable number; it is the policy that helps the whole system deliver valuable work with less waiting, aging, and unpredictability.
