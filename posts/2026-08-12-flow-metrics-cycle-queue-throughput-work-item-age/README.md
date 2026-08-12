# Which Flow Metric Answers Which Question?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Continuous Improvement, Flow Metrics, Kanban, Cycle Time, Queue Time, Throughput, Work Item Age

Description: Learn what four commonly confused flow metrics measure, the questions each one can answer, and how to use them together without hiding delays or gaming the system.

---

A delivery board can display a dozen numbers and still leave a team unable to answer a basic question: are customers receiving useful changes predictably? The usual problem is not a shortage of data. It is using one flow metric to answer a question that belongs to another.

Cycle time describes completed work. Work item age describes unfinished work. Throughput counts completions. Queue time explains a particular kind of delay inside the journey. They are complementary views of one workflow, not interchangeable measures of “speed.”

The definitions also depend on the workflow. Before building a dashboard, make the start point, finish point, workflow states, and treatment of exceptional cases explicit. Otherwise two teams can publish numbers with the same label and entirely different meanings.

## The four questions at a glance

| Metric | Population | Basic calculation | Question it answers best |
| --- | --- | --- | --- |
| Cycle time | Finished items | Finish timestamp minus start timestamp | How long did similar completed items take? |
| Queue time | Usually finished items, by waiting state | Sum of time in explicit queue or buffer states | Where did work wait rather than progress? |
| Throughput | Finished items | Count finished per unit of time | How many items did the workflow complete? |
| Work item age | Started but unfinished items | Now minus start timestamp | Which current items are becoming unusually old? |

The Kanban Guide defines cycle time, throughput, work item age, and work in progress as the minimum set of flow metrics. The Open Guide to Kanban adds cumulative queueing or buffer time as a useful diagnostic and distinguishes queueing from blocked time. That distinction matters: an item can be waiting because a downstream state has no capacity, or it can be blocked by an external dependency while someone is otherwise ready to work on it.

## Cycle time: learn from completed work

Cycle time is the elapsed time between the workflow's defined start and finish points. If “started” means a team has committed to implement a change and “finished” means it is running in production, then review, testing, deployment queues, nights, and weekends all sit inside that elapsed interval. Calling only keyboard time “cycle time” hides the delays the customer experiences.

Cycle time answers questions such as:

- How long have completed items of this service and work type taken?
- What range should a customer or stakeholder expect for a similar new item?
- Did a workflow change shift the distribution, not merely the average?

Use a distribution or scatterplot rather than a single mean. A median describes a typical completion; a higher percentile exposes the long tail. The Kanban Guide's service level expectation, or SLE, combines a probability and elapsed time based on historical cycle time-for example, “85 percent of comparable items finish within eight days.” It is a forecast, not a guarantee.

Cycle time cannot tell you what will finish this week by itself. It also says nothing directly about how many items finish. Ten items can each have a four-day cycle time yet complete at a very different weekly rate from a system completing one four-day item at a time.

## Queue time: locate avoidable waiting

Queue time measures time in states explicitly defined as waiting or buffering: “Ready for review,” “Awaiting security,” “Ready to deploy,” or a replenishment queue, for example. The Open Guide calls the accumulated value across the workflow cumulative queueing or buffer time.

This metric answers diagnostic questions:

- Which handoff holds work longest?
- Is a shorter cycle time coming from faster processing or less waiting?
- Does one upstream team release batches that overwhelm a downstream team?
- Is an approval policy creating a queue without improving outcomes?

Queue time only works when the board reflects reality. A card in “Testing” may be actively tested, waiting for a tester, or blocked by an unavailable environment. Those are different conditions. Split active and waiting states, or record state-transition events and an explicit blocked flag. Do not infer queue time from who owns the card.

Keep blocked time separate where possible. A dependency on a vendor is not the same flow problem as a review queue, even though both add to cycle time. The corrective action for the first may be an interface, fallback, or escalation policy; the second may need a lower work-in-progress limit or more collaboration at the constraint.

## Throughput: count delivered items

Throughput is the exact number of work items finished in a unit of time. “17 items per week” is throughput. Story points completed per sprint are not item throughput; they combine a count with a team-specific estimate whose scale can change.

Throughput answers capacity and delivery-rate questions:

- How many items does this system ordinarily finish each week?
- Is completion rate keeping pace with demand?
- Did completions become more or less variable after a change?
- How many completed items of each work type reach the finish point?

Choose an interval appropriate to the volume. A high-volume support workflow might use daily counts, while a platform team may use weekly or monthly counts. Show a time series or rolling window so that a holiday, release freeze, or batch does not become a permanent conclusion.

Segment only when the categories describe materially different demand-for example, standard changes, incidents, and fixed-date work. Excessive slicing produces tiny samples. Never encourage teams to split work solely to inflate the count. A stable definition of a work item and checks on customer outcomes and quality are essential guardrails.

## Work item age: manage today's risk

Work item age is the elapsed time since an unfinished item crossed the workflow's start point. It stops being age and becomes an observed cycle time when the item finishes.

Age is the operational metric for a daily flow review:

- Which current item is oldest?
- Which items are approaching or exceeding the SLE?
- Has work stopped moving even though the board still looks busy?
- Where should the team swarm before starting something else?

An old item is a signal to inspect, not evidence that its owner performed badly. It may reveal a hidden dependency, oversized scope, a review queue, or a policy that prevents collaboration. Put age beside the item's current state and blocked status. Comparing age with historical cycle-time percentiles for the same class of service provides context, but it still does not guarantee a completion date.

An average age is often unhelpful because many newly started items can dilute one dangerous outlier. Sort or visualize all active items by age and make aging thresholds visible.

## A worked example

Suppose the workflow starts at `Development started` and finishes at `Running in production`. During one week it finishes these five changes:

| Item | Cycle time | Time in queues |
| --- | ---: | ---: |
| A | 3 days | 0.5 day |
| B | 4 days | 2 days |
| C | 4 days | 1 day |
| D | 7 days | 4 days |
| E | 12 days | 8 days |

Weekly throughput is five items. The median cycle time is four days, while the long tail reaches twelve. Queue time suggests that E's delay was primarily waiting, not unusually long implementation. Those are observations about completed work.

Now suppose two unfinished items are six and eleven days old. Their age makes them candidates for inspection today. They do not belong in the completed cycle-time sample, and they should not be silently omitted from operational attention simply because no finish timestamp exists.

These metrics lead to different actions. Throughput prompts a demand-versus-capacity conversation. The cycle-time distribution supports expectations. Queue time directs improvement toward a particular handoff. Age directs the team's immediate attention.

## Establish one trustworthy measurement policy

Write the policy next to the dashboard, ideally as part of the Definition of Workflow:

1. **Name the service and boundary.** “Idea to customer” and “development to production” are both valid boundaries, but they produce different values.
2. **Define start and finish events.** Use timestamped events, not retrospective judgments. State whether a reopened item retains its original start or begins a separately labelled cycle.
3. **Define every state.** Say what entering and leaving each state means, which states are queues, and how blocked work is marked.
4. **Count elapsed time consistently.** If a report uses calendar duration or a documented working-time calendar, label it. Never pause clocks informally when a delay becomes inconvenient.
5. **Preserve item identity.** Record splits, merges, cancellations, and work-type changes rather than rewriting history.
6. **Keep raw events.** State-transition data permits later audit and recalculation when a definition changes.
7. **Version metric definitions.** A changed start point creates a new series; it should not masquerade as improvement in the old one.

A minimal event record needs an item identifier, work type, transition, state, and timestamp. Derive reports from those events instead of maintaining four unrelated spreadsheets.

## Use the metrics at different cadences

At a daily flow review, inspect work item age, blockers, queues, and WIP. Ask what the team can finish or unblock together. Starting another item is rarely the first response to an aging one.

Weekly, inspect throughput, the cycle-time scatterplot, and queue-time contribution by state. Look for changes in shape and variability, not a single red or green number. Compare like periods and annotate events such as holidays, migrations, and major incidents.

Monthly or at an improvement review, test whether a deliberate process change reduced waiting or the long cycle-time tail without reducing quality or customer value. DORA's guidance on work visibility recommends mapping the full value stream, because improving one non-bottleneck step may have little effect on the customer-facing result.

## Common interpretation mistakes

- **Using cycle time for active work only.** That renames touch time and conceals queues.
- **Treating age as remaining time.** Age shows elapsed time, not an exact countdown.
- **Using velocity as throughput.** Throughput is a count of finished items, not estimated effort.
- **Averaging away the tail.** Percentiles, scatterplots, and the oldest active items reveal risk that a mean hides.
- **Comparing unlike services.** A production incident and a planned dependency upgrade may follow different policies and distributions.
- **Rewarding the metric.** A throughput target invites smaller tickets; a cycle-time target invites a later start point. Pair metrics with explicit definitions, quality, and outcome evidence.
- **Optimizing a queue locally.** Keeping every specialist busy can create more upstream inventory and a longer end-to-end cycle.

The goal is not to make every number smaller or larger. It is to understand how reliably the system turns demand into a valuable finished outcome, then select the metric that can test the next improvement hypothesis.

## Official Documentation

- [The Kanban Guide](https://kanbanguides.org/the-kanban-guide/)
- [Open Guide to Kanban](https://kanbanguides.org/open-guide-to-kanban/2025.7/)
- [The Official Kanban Guide - Kanban University](https://kanban.university/kanban-guide/)
- [DORA: Work in process limits](https://dora.dev/capabilities/wip-limits/)
- [DORA: Visibility of work in the value stream](https://dora.dev/capabilities/work-visibility-in-value-stream/)
- [DORA: Value stream management](https://dora.dev/guides/value-stream-management/)
- [Lean Enterprise Institute: Value-stream mapping](https://www.lean.org/lexicon-terms/value-stream-mapping/)

## Conclusion

Cycle time tells the story of elapsed time for finished work, queue time identifies where that elapsed time accumulated as waiting, throughput counts how much finished, and work item age exposes risk in work that has not finished yet. Define a common workflow boundary, keep the underlying transition history, and use each metric for its own question. Together they turn a busy board into evidence for forecasting, daily intervention, and system-level improvement.
