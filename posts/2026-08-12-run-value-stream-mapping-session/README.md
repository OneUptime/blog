# Run a Value-Stream Mapping Session

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Continuous Improvement, Value-Stream Mapping, Lean, DORA, Flow, Software Delivery

Description: Facilitate an evidence-based value-stream mapping session that exposes queues, feedback loops, rework, and costly handoffs from customer request to delivered outcome.

---

Most software delivery delays are not visible in a list of engineering tasks. Work waits for clarification, review, environments, approvals, release windows, and customer feedback. It moves between tools and teams, sometimes returning upstream after a defect or misunderstood requirement. A value-stream map makes that end-to-end journey visible.

The output is not a decorative process diagram. It is a shared model of how one kind of customer demand actually becomes a delivered outcome, supported by timestamps and examples. A useful session distinguishes processing from waiting, records rework loops, and shows the information needed at each handoff. It ends with a small number of owned improvements and a date to check the result.

## Choose a narrow product and a wide boundary

Lean Enterprise Institute guidance starts with a particular product family rather than an abstract map of the whole organization. In software, choose one recognizable service and demand type: a standard product change, a defect correction, or an infrastructure capability, for example. Mixing emergency incidents, routine changes, and major programs creates an “average” path that no real item follows.

Keep the boundary end to end. DORA warns that mapping only part of a value stream can create local optimizations. A useful boundary might begin when an eligible customer or business request is selected and end when the change is operating in production and the intended result can be observed. If the session covers only commit to deployment, label that narrower scope and do not claim it represents idea-to-value lead time.

Write a one-sentence scope before inviting participants:

~~~text
Map a normal self-service billing change from accepted customer problem
through observable production use, using the last eight completed changes.
~~~

This identifies the service, start, finish, demand class, and evidence set.

## Invite the people who experience the handoffs

DORA recommends including representatives from the groups involved throughout the stream, such as business, design, development, testing, operations, and support. Add security, legal, data, or platform participants when their work is truly on the path. A map created solely by managers tends to describe policy; a map created solely by developers stops at the edge of their toolchain.

Useful roles for the session are:

- **Sponsor:** supplies the customer purpose and can remove organizational obstacles.
- **Facilitator:** protects the scope, asks for evidence, and prevents blame.
- **People doing the work:** explain actual states, queues, exceptions, and rework.
- **Data helper:** brings sample timelines and checks calculations during or after the session.
- **Recorder:** maintains the map, decisions, unknowns, and action owners.

One person can hold two roles, but the facilitator should not dominate the process content. Invite the owner of a painful downstream step rather than guessing what happens after a handoff.

## Prepare evidence before the workshop

Do not wait until the session to discover that every tool uses a different identifier. Select several recently finished, representative items and reconstruct their timelines. Include one ordinary item and a few slower cases; exclude an incident only if incidents are outside the declared service.

Collect what is available from request systems, source control, CI/CD, review tools, incident records, and deployment platforms:

- request accepted and work started timestamps;
- every meaningful state transition;
- review request and completion;
- test, security, and approval events;
- deployment and production verification;
- blocked intervals and reasons;
- returns to an earlier state;
- customer or business validation;
- WIP and queue size snapshots, if available.

Bring raw examples as well as summaries. A median may establish typical flow, while an individual timeline reveals that “Awaiting approval” actually includes three separate handoffs. Mark missing data honestly. The workshop can produce an instrumentation action rather than an invented number.

Use a shared canvas with a horizontal time direction. For a remote session, create one row for process steps, one for information flow, and one timeline for processing and waiting. Make all notes readable without opening nested cards.

## A focused 150-minute agenda

A first map does not require a multi-day event. A two-and-a-half-hour session can reveal enough to start if prework is sound.

| Time | Activity | Output |
| ---: | --- | --- |
| 0–15 min | Reconfirm customer, product family, boundary, and rules | Shared scope |
| 15–55 min | Walk the current state from request to outcome | Five to fifteen major process blocks |
| 55–90 min | Add queues, handoffs, information, and rework loops | Actual flow, not ideal flow |
| 90–115 min | Add data and calculate the timeline | Processing and elapsed-time evidence |
| 115–135 min | Identify the largest systemic obstacles | Ranked improvement opportunities |
| 135–150 min | Sketch target conditions and assign experiments | Owners, measures, and review date |

DORA's work-visibility guidance suggests roughly five to fifteen process blocks. That level is detailed enough to locate delay without turning the map into a transcription of every click.

## Map the current state as it actually operates

Start with a recent item and ask, “What happened next?” For every block, record the entry condition, work performed, exit condition, responsible group, supporting system, and destination. Lean value-stream mapping includes both work flow and information flow, so draw how a request, approval, test result, or deployment signal moves-not just the artifact being changed.

A structured worksheet helps:

| Field | What to record |
| --- | --- |
| Process | A meaningful activity with a clear entry and exit |
| Owner/collaborators | People or team actually involved |
| Processing time | Time actively spent advancing one item |
| Elapsed time | Entry-to-exit time including waiting |
| Queue/WIP | Items waiting or present at the step |
| Percent complete and accurate | Share received that needs no clarification or correction |
| Handoff | Tool, signal, recipient, and acceptance policy |
| Rework | Return destination, frequency, and reason |
| Evidence | Source and sample period |

Walk downstream first to establish the sequence, then challenge it from the customer end backward. A downstream-first review often exposes information that should have been supplied earlier.

Use neutral language. “Security waits four business days for missing threat context” is actionable. “Developers send bad tickets” assigns blame without explaining the entry policy, queue, or information gap.

## Make wait time impossible to hide

For each step, separate active processing time from elapsed time. If a review takes 35 minutes of attention but a pull request remains open for three days, show both values. Do not distribute the three days across fictional review activity.

Draw explicit buffers or queues between processes. Ask:

- What signal says an item is ready?
- Where does it sit until someone responds?
- Is the receiving team aware that it is waiting?
- Does work arrive singly or in batches?
- Is there a work-in-progress limit or service policy?
- What happens when downstream capacity is full?

Lean guidance for administrative flows highlights inbox waiting as a major contributor to long lead times. Digital work is especially easy to hide because it occupies no physical floor space. Count it anyway.

At the bottom of the map, build a timeline. Add processing time across the stream, add total elapsed time, and derive waiting as the supported difference rather than asking participants for a vague percentage. If clocks use different calendars or pause policies, note that limitation.

## Draw rework as a loop, not another step

Rework moves an item backward or repeats work because the output was incomplete, incorrect, or no longer suitable. Draw an arrow to the actual return point. Label the trigger and, when supported, frequency.

DORA and Lean mapping guidance use percent complete and accurate to capture whether a downstream recipient can perform their task without returning for missing information or correction. Ask the recipient, not the sender. A team may believe that 95 percent of its handoffs are complete while the next team reconstructs context for half of them.

Examples include:

- a design returns for missing acceptance criteria;
- a pull request requires architectural rework after late review;
- a deployment fails and returns to implementation;
- support reopens a change because the original customer problem remains;
- a security assessment repeats after scope changes.

Do not combine all feedback with failure. Rapid, expected feedback inside collaborative development is valuable. The map should expose avoidable loops and late discovery, especially where a defect travels far before detection.

## Examine every handoff

A handoff is not automatically waste; specialized knowledge and independent controls can be necessary. It is a risk point because context can be lost and work can enter a queue.

For each handoff, capture:

- the exact completion and acceptance policies;
- the signal used-conversation, ticket, pull request, email, or scheduled meeting;
- the information and evidence transferred;
- queue ownership and expected response;
- rejection or clarification rate;
- whether upstream and downstream could collaborate earlier.

Look for asynchronous inboxes with no pull signal, scheduled boards that add days to a short decision, duplicate entry across systems, and approvals that do not change the decision. Preserve controls that manage real risk, but test whether they can be automated, brought earlier, or made self-service.

## Find leverage without blaming the busiest box

Circle the largest waits, oldest queues, frequent rework loops, and fragile handoffs. Also look at the ratio between total elapsed time and total processing time. Treat that ratio as a diagnostic, not a performance target: teams can game any isolated efficiency number.

Avoid selecting a change merely because one process box looks slow. Lean emphasizes improving the whole stream, and DORA notes that improving a non-bottleneck may have little end-to-end effect or even make the system worse. Faster implementation that feeds a fixed testing queue simply increases inventory.

Rank opportunities with four questions:

1. Does this obstacle materially affect customer-facing elapsed time, quality, or reliability?
2. Is it recurring across the sampled items?
3. Can the group influence it?
4. Can a small, reversible change test the causal belief?

Select one to three experiments. Examples include limiting the ready-for-review queue, adding an automated environment check, pairing security with design before implementation, or changing a weekly approval meeting to an explicit on-demand policy.

## Sketch the future state and close the loop

Lean value-stream mapping pairs a current-state map with a future-state map. DORA recommends a target state far enough ahead to express meaningful change; an immediate experiment can still represent the first step toward it.

For every experiment, record:

~~~text
Observed obstacle: Changes wait a median of 3.2 days for deployment approval.
Hypothesis: Risk-based automatic approval for the standard change class will
reduce that queue without increasing failed deployments.
Owner: Release engineering lead
Measures: Queue time, cycle-time distribution, failed deployment rate
Review date: Four weeks after rollout
Decision options: Keep, revise, or revert
~~~

Digitize the map after the workshop, but preserve uncertainty and disputed facts. Publish the current-state map, future-state intent, data definitions, experiment owners, and review date together. Schedule another mapping pass; the flow will change, and the map should not become obsolete wall art.

## Facilitation mistakes to avoid

- Mapping the documented procedure instead of recent real items.
- Starting with every product and exception at once.
- Ending at a team boundary while claiming an end-to-end result.
- Recording only active time and omitting inboxes and scheduled waits.
- Treating all handoffs as bad or all approvals as necessary.
- Designing a perfect future state before agreeing on the current one.
- Turning the map into an individual performance evaluation.
- Leaving with ten ideas, no owners, and no review date.

The session succeeds when participants gain a shared, testable understanding of flow and act on it. Artistic completeness is irrelevant.

## Official Documentation

- [Lean Enterprise Institute: Value-stream mapping](https://www.lean.org/lexicon-terms/value-stream-mapping/)
- [Lean Enterprise Institute: Learning to See excerpt](https://www.lean.org/wp-content/uploads/2021/01/Learning-to-See-part1.pdf)
- [Lean Enterprise Institute: Mapping administrative operations](https://www.lean.org/the-lean-post/articles/helpful-hints-about-mapping-off-the-plant-floor-in-support-of-administrative-operations/)
- [DORA: Value stream management](https://dora.dev/guides/value-stream-management/)
- [DORA: Visibility of work in the value stream](https://dora.dev/capabilities/work-visibility-in-value-stream/)
- [DORA: Continuous delivery](https://dora.dev/capabilities/continuous-delivery/)
- [The Kanban Guide](https://kanbanguides.org/the-kanban-guide/)

## Conclusion

A productive value-stream mapping session follows a defined kind of demand across a customer-relevant boundary, using real item histories and the people who perform every part of the work. Separate processing from waiting, draw feedback loops, inspect the information carried at handoffs, and quantify what the evidence supports. Then choose a few reversible system-level experiments with owners, measures, and review dates. The map creates value only when it changes how the delivery system learns.
