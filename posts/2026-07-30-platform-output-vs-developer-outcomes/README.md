# Platform Output vs Developer Outcomes: Measure Friction, Not Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Developer Experience, Product Management, Metric, Value Stream

Description: Replace platform feature counts with workflow-level measures that reveal developer waiting, handoffs, failure, and cognitive effort.

---

A platform roadmap can be delivered exactly as planned while developer work remains just as difficult. Templates shipped, APIs added, documentation pages published, and tickets closed are evidence that the platform team produced output. They are not evidence that developers achieved a better outcome.

The corrective move is to measure friction in a real developer journey. Pick a task, define its successful end state, instrument the complete path, and ask whether developers reach that state with less waiting, effort, and failure.

## Output Is Necessary but Not Sufficient

Platform outputs are things the team controls directly:

- capabilities released;
- templates and components published;
- integrations completed;
- documentation created;
- migrations executed; and
- roadmap milestones reached.

They are useful for planning capacity and communicating delivery. They become dangerous when treated as value. Ten new templates can increase choice overload. A portal migration can preserve every existing manual approval. More documentation can make search worse if ownership and freshness are unclear.

Developer outcomes describe changed conditions for the platform's customers:

- a new engineer reaches production sooner;
- a service owner provisions an environment without a ticket;
- a deployment completes with fewer handoffs;
- feedback arrives soon enough to act on;
- developers can find the supported path; and
- exceptions and recoveries require less effort.

The platform should retain output metrics internally, but judge investment decisions by outcomes and guardrails.

## Define Friction Operationally

"Reduce friction" is not measurable until tied to a task. For each critical workflow, define:

- **Start:** the observable event that represents developer intent;
- **Success:** the user-visible result, not merely an accepted request;
- **Eligible population:** requests for which the platform path applies;
- **Stages:** automated work, queues, approvals, and human handoffs;
- **Failures:** rejection, timeout, abandonment, rollback, or incorrect result; and
- **Window:** the period and cohorts included.

For infrastructure provisioning, `request_submitted` may be the start and `resource_verified_ready` the success. An API returning `202 Accepted` is not success if the database becomes usable two hours later.

## Four Kinds of Friction

### Waiting

Measure end-to-end elapsed time and break it into active processing and queue time:

```text
total time = processing time + queue time + approval wait + retry delay
```

Report median and p90. A median improvement can coexist with an unacceptable tail for teams using a particular cloud account or policy.

### Handoffs and Interruptions

Count manual approvals, team transfers, support contacts, context switches, and requests for missing information. A fast automated stage does not compensate for repeated human coordination.

Useful measures include:

```text
manual-handoff rate =
  eligible attempts with at least one manual handoff
  / eligible attempts

support demand =
  workflow-related support contacts / 100 attempts
```

### Failure and Rework

Track failed attempts, retries, abandonment, rollback, policy rejection, and duplicate requests. Separate failures the developer can fix from platform faults and external dependency faults. Error taxonomy is a product discovery tool: a large "unknown" bucket means the team cannot yet explain the experience.

### Cognitive Effort

Some burden is invisible in event logs: choosing among overlapping paths, interpreting policy errors, remembering credentials, or understanding ownership. Use short transactional surveys and interviews:

> Completing this task through the platform was easy.

Keep a stable scale, ask immediately after the workflow, and invite a reason. Combine the response with telemetry; neither source replaces the other.

## Build a Friction Funnel

Instrument meaningful milestones with a shared `journey_id`:

```text
intent_recorded
path_selected
inputs_validated
request_submitted
approval_completed
resource_created
verification_passed
developer_confirmed
```

For each transition, calculate:

```text
stage conversion = journeys reaching next stage / journeys entering stage
stage latency = next_stage_at - current_stage_at
```

This exposes drop-off. If 95% of users open a template but only 40% submit it, "template views" exaggerate adoption. If requests are submitted successfully but stall before approval, improving the form will not fix the dominant constraint.

Retain outcome and reason fields for every terminal state. Do not delete abandoned sessions from the denominator simply because they lack a completion event.

## Connect Platform Work to a Testable Hypothesis

Turn roadmap items into expected movements:

| Platform output | Expected outcome | Guardrail |
| --- | --- | --- |
| Service template | Lower time to first deploy | Template rollback and support rate |
| Automated access policy | Lower approval wait | Unauthorized grants and exceptions |
| Standard CI workflow | Shorter, less variable feedback | Test escape and rework rate |
| Unified catalog | Higher task discoverability | Stale and orphaned entity rate |
| Environment API | Higher self-service completion | Provisioning failures and unit cost |

Write the baseline and target before release. Otherwise, it is easy to choose a favorable metric after seeing the data.

## Evaluate Change Without Overclaiming

At minimum, compare the same workflow before and after a release. Stronger designs roll out in cohorts and compare adopters with similar teams not yet exposed:

```text
difference-in-differences estimate =
  (adopter after - adopter before)
  - (comparison after - comparison before)
```

Check cohort composition. Early adopters may be more experienced; newly onboarded teams may have different needs. Segment by workflow, platform version, team tenure, and relevant risk class.

Do not optimize only the median. Review the distribution, failure modes, survey comments, and bypasses. A platform that works brilliantly for the central case but requires a week of support for regulated environments has an important product gap.

## Avoid Common Metric Traps

**Portal traffic:** A visit can mean success, confusion, or an automatically opened home page. Tie interaction to a completed task.

**Ticket reduction:** Tickets may fall because the workflow improved, because developers gave up, or because requests moved to chat. Count demand across channels and measure completion.

**Automation percentage:** An automated action can still require manual preparation and verification. Measure the whole journey.

**Average duration:** A few very slow attempts can disappear inside an average, while timeouts may be excluded. Publish median, tail percentiles, and censored attempts.

**Developer activity:** Lines changed, commits, and pull requests are not direct productivity measures. The SPACE framework explicitly treats productivity as multidimensional.

**One universal score:** A composite score hides tradeoffs and arbitrary weights. Keep a small set of interpretable measures in productive tension.

## Run Friction Reviews, Not Feature Reviews

Replace a roadmap demo with a monthly journey review:

1. Select the highest-value workflow.
2. Inspect its funnel, stage latency, failures, and survey feedback.
3. Watch recordings or interview developers at the largest drop-off.
4. Identify the constraint, not the most requested feature.
5. Fund one change and state its expected outcome.
6. Review the same cohort after release.

Celebrate outputs as completed work, but renew investment only when the expected outcome appears or the team learns why it did not.

## The Better Platform Narrative

An output narrative says:

> We shipped 18 templates and migrated 60 repositories.

An outcome narrative says:

> Among eligible teams, self-service environment completion rose from 52% to 81%. Median request-to-ready time fell from 9 hours to 24 minutes, while p90 remained high for regulated accounts because approvals still require two handoffs. That approval path is the next constraint.

The second narrative makes the platform's value and its next decision visible. That is the point of measurement: not to make the platform team look productive, but to make developer work measurably better.

## Official Documentation

- [Microsoft Learn: Plan and prioritize a platform engineering journey](https://learn.microsoft.com/en-us/platform-engineering/plan)
- [DORA: Value stream mapping for software delivery](https://dora.dev/guides/value-stream-management/)
- [Microsoft Research: The SPACE of Developer Productivity](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/)
- [Google Research: Measuring Flow and Friction for Developers](https://research.google/pubs/measuring-flow-and-friction-for-developers-part-6-measuring-flow-and-friction-for-developers/)
