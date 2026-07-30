# Survey Data vs Workflow Telemetry: How to Combine Qualitative and Quantitative Platform Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Developer Experience, Telemetry, Survey, Metrics, Privacy

Description: Combine developer surveys and workflow telemetry through shared questions, stable definitions, and privacy-preserving analysis rather than forcing either source to stand alone.

---

A developer survey and a platform event stream answer different questions.

Surveys reveal whether people can find a path, trust it, understand failures, and feel that it helps. Workflow telemetry reveals where people start, wait, fail, retry, ask for help, or leave. Neither source is a more objective version of the other.

The useful unit is a decision supported by both.

## Start with a Measurement Question

Do not begin by joining every available table. Begin with a product question:

> Did the new deployment workflow make routine production releases easier without reducing safety?

Turn it into a small measurement model:

| Part | Example |
| --- | --- |
| User | Application teams with at least one production service |
| Task | Deploy a normal code change |
| Intervention | New platform deployment workflow |
| Perceived outcome | Clearer steps, lower effort, greater confidence |
| Behavioral outcome | More successful self-service completions and fewer repeated failures |
| Delivery outcome | Shorter change lead time |
| Guardrail | No increase in failed deployments or policy exceptions |

This prevents an analytics dashboard from becoming the goal.

## Know What Each Source Can Say

Survey data is best for concepts that are not directly observable:

- perceived effort;
- confidence;
- satisfaction;
- trust;
- clarity of feedback;
- ability to maintain focus;
- reasons for avoiding or bypassing the platform.

Telemetry is best for observable events:

- starts, completions, and abandonments;
- duration and queue time;
- retries and repeated validation failures;
- transitions between workflow stages;
- support escalation;
- platform version and path selected;
- resulting deployment or infrastructure state.

Interviews and free-text responses add mechanisms and vocabulary. They can reveal, for example, that a “validation failure” event actually represents three different user problems. Use that insight to improve event classification and survey wording.

## Give Both Sources the Same Spine

The data becomes comparable when both sources use a shared set of dimensions:

- workflow name and version;
- observation period;
- adoption cohort;
- workload type;
- team or organizational group;
- experience band;
- standard path or exception path.

Do not immediately join on a developer identity. Most platform questions can be answered at a team-by-week or workflow-by-month level. Aggregation reduces privacy risk and avoids interpreting normal individual variation as performance.

For example:

```text
survey grain:     workflow + cohort + calendar month
telemetry grain:  workflow + cohort + calendar month
```

The join then compares the experience of a population with the behavior of the same population, not one person’s answer with a dossier of their actions.

## Design Events Around a State Machine

Instrument the workflow as states and transitions:

```text
started
  -> input_validated
  -> policy_evaluated
  -> execution_started
  -> verification_completed
  -> succeeded

any state
  -> failed
  -> abandoned
  -> resumed
```

Each event should have:

- a documented name;
- a precise condition for emission;
- one event time;
- a workflow execution identifier;
- a schema version;
- bounded attributes needed for analysis;
- an owner and retention policy.

OpenTelemetry semantic conventions demonstrate why consistent names and attributes matter across signals. Even when a platform workflow has no standard semantic convention, use the same discipline: low-cardinality names, explicit units, stable meanings, and no sensitive payloads.

Test whether one logical workflow can accidentally emit duplicate starts or successes. Decide how timeouts, cancellation, automation retries, and resumed sessions are counted.

## Design Surveys for Repeated Measurement

Keep a core set of questions unchanged across releases. Ask about a recent, named task:

- I knew where to begin.
- The workflow gave me clear feedback.
- I could recover from a failure without routine assistance.
- The workflow required a reasonable amount of effort.
- I would choose this workflow again for the same task.

Add an optional question for the main obstacle and one open field for context. Record the workflow and cohort, but avoid collecting identity unless there is a justified research need and explicit governance.

Report response count and response rate with every score. A score of 4.5 from 12 enthusiastic early adopters is not equivalent to 4.5 from a representative user population.

Avoid changing the scale, anchors, wording, and delivery channel simultaneously. A survey redesign creates a new series; it is not a clean continuation of the old one.

## Combine Evidence with a Triangulation Table

For each hypothesis, specify a survey measure, a behavioral measure, and a guardrail:

| Hypothesis | Survey signal | Telemetry signal | Guardrail |
| --- | --- | --- | --- |
| Discovery is easier | “I knew where to begin” | Fewer exits before first action | Search result quality |
| Failures are clearer | “I knew what to do next” | Fewer identical retries; more successful resumes | Error-class distribution |
| Self-service improved | “I did not need routine help” | Lower support escalation per 100 starts | Completion rate |
| Workflow is faster | Perceived effort | Lower p50 and p90 end-to-end time | Failure and rollback rates |
| Teams trust the path | Intention to reuse | Higher repeat use and retention | Exception-path need |

The measures need not move in lockstep. Their disagreement is often the most useful finding.

## Investigate Divergence

### Survey improves, telemetry does not

The language, documentation, or feedback may have improved even if the number of steps did not. It may also be a honeymoon effect or a nonrepresentative response pool. Repeat the measure and inspect cohorts.

### Telemetry improves, survey does not

Automation may have shortened execution while leaving concepts, diagnostics, or control unclear. Interview users who completed the task but rated it poorly.

### Adoption rises, satisfaction falls

The path may have become mandatory, or a migration may have shifted difficult workloads onto it. Adoption is context, not proof of value.

### Time falls, failure rate rises

A faster early exit may look like an improvement in duration. Compare time among successful workflows and report failure separately.

### Support tickets fall, survey effort rises

Developers may have stopped asking for help and adopted workarounds. Look for abandonment, bypasses, shadow automation, and missing eligible demand.

## Use Windows and Cohorts Deliberately

Align both sources to an observation window long enough to include the workflow’s natural cadence. Daily deployment workflows may support weekly analysis; quarterly access recertification does not.

Separate:

- pre-adoption baseline;
- migration period;
- first-use learning period;
- established use.

Compare like with like. A mature adopter cohort should not be compared directly with first-time users if the question is whether the platform itself improved.

When possible, stage rollout and keep a comparable not-yet-adopted cohort. Mark incidents, freezes, policy changes, and organization changes on the time series.

## Do Not Manufacture Precision

An overall “developer experience index” can conceal more than it reveals. If a composite is necessary:

1. define its components and weights before looking at results;
2. keep the component measures visible;
3. do not mix incompatible units without normalization;
4. do not silently replace missing data with zero;
5. version the formula when it changes.

Use medians and distributions for skewed task times. Show uncertainty or, at minimum, sample counts and variation. Avoid team rankings when team contexts differ.

## Protect Trust in the Measurement

Publish a plain-language data contract:

- what is collected;
- why it is collected;
- what is explicitly not collected;
- who can see raw data;
- how long it is retained;
- the minimum group size for reporting;
- whether it will be used in performance management;
- how developers can report a bad event or metric definition.

The safest default is that workflow telemetry improves the product and system, not evaluates an individual. Never place usernames, repository names, branch names, error messages, or free-form input in metric labels. Review surveys for accidental collection of health, personnel, security, or customer data.

## Run a Monthly Evidence Review

A productive review is short:

1. State the product decision under review.
2. Check data quality and coverage.
3. Review the stable survey items.
4. Review the corresponding workflow funnel and timing.
5. Examine guardrails.
6. Discuss divergent signals.
7. Select one change and the expected measurable result.
8. Record the decision and revisit date.

This is the difference between collecting feedback and operating a measurement loop.

Surveys tell you what a workflow feels like. Telemetry tells you what the workflow did. Combine them through common questions and stable population-level dimensions, then use disagreement to guide investigation instead of forcing the two sources into a single number.

## Official Documentation

- [DORA: Choosing measurement frameworks to fit your organizational goals](https://dora.dev/research/2025/measurement-frameworks/)
- [DORA: Platform engineering](https://dora.dev/capabilities/platform-engineering/)
- [Microsoft Research: The SPACE of Developer Productivity](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/)
- [OpenTelemetry: Semantic conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/)
