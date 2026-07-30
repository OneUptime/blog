# How to Measure the Success of Platform Documentation and Discoverability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Documentation, Discoverability, Developer Experience, Search, Analytics

Description: Measure platform documentation from discovery through successful task completion, with freshness, trust, and support outcomes as guardrails.

---

Page views tell you that a document loaded. They do not tell you whether a developer found the right page, understood it, completed a task, or discovered that it was dangerously out of date.

Platform documentation succeeds when an eligible developer can discover trustworthy guidance and use it to reach a correct outcome with reasonable effort. Measure that journey, not content traffic alone.

## Define the Documentation Job

For each critical workflow, state:

- intended audience;
- question or task;
- entry points;
- expected document;
- successful next action;
- owner;
- freshness requirement.

Example:

```text
Audience: developer onboarding a production service
Question: which service template fits a standard HTTP API?
Entry points: portal search, catalog, CLI error link, external search
Success: correct template selected and scaffold completes
Owner: service-platform team
Freshness: reviewed after template changes and at least every 90 days
```

This turns “improve docs” into an observable product outcome.

## Measure the Discovery Funnel

Instrument a low-cardinality funnel:

```text
need or workflow entry
  -> search or navigation
  -> relevant result shown
  -> result selected
  -> document viewed
  -> workflow resumed
  -> task succeeded or support requested
```

Useful search measures:

- searches per eligible workflow;
- zero-result rate;
- result selection rate;
- rank of selected result;
- repeated query reformulation;
- time from first query to useful selection;
- searches that end without a document or workflow action;
- top zero-result query categories;
- search-to-support escalation.

Backstage’s Analytics API exposes concepts such as navigation, search, result discovery with rank, and TechDocs not-found events. Those are useful raw events, but your organization still needs to define success.

Do not place raw search strings in a metric label. Queries can contain service names, incident details, customer data, or credentials. Store access-controlled event data only when necessary; classify or hash it for aggregate reporting.

## Measure Task Success

For each document-assisted workflow:

```text
documentation-assisted success rate =
  eligible sessions with relevant documentation interaction
  followed by verified task success within a defined window
  / eligible documentation-assisted sessions
```

Be explicit about the window and causal limitation. A docs visit followed by success is an association, not proof the page caused the success.

Compare:

- users offered two documentation variants;
- staged content rollouts;
- workflows with and without contextual guidance;
- pre- and post-change cohorts with stable definitions.

Use guardrails: task failure, rollback, policy exception, or repeated retry. Faster completion is not success if the page recommends an unsafe shortcut.

## Ask Whether the Page Was Useful

Use a brief contextual prompt after a meaningful interaction:

- Did this page help you complete the task?
- Was any required step missing or wrong?
- What did you still need?

Avoid a generic thumbs-up as the only measure. A page can be well written but irrelevant to the user’s task. Record sample count and workflow context.

Periodically survey broader concepts:

- I know where to look for platform guidance.
- Search returns a relevant result.
- I trust platform documentation to reflect current behavior.
- Examples work as written.
- I can recover from a workflow failure using available guidance.

Keep wording and scales stable for trend analysis.

## Track Freshness as Evidence, Not a Footer Date

A page updated yesterday can still describe an obsolete workflow. Record:

- content owner;
- owning system or capability;
- last substantive review;
- next review due;
- associated platform or API version;
- automated link and example checks;
- source-code or configuration dependencies;
- known deprecation date;
- open documentation defects.

Calculate:

```text
freshness compliance =
  in-scope pages reviewed within their policy
  / in-scope pages

orphan rate =
  in-scope pages without an active owner
  / in-scope pages
```

Use risk-based review periods. Emergency access and production rollback guidance deserve more scrutiny than a historical design note.

Whenever a template, API, CLI flag, policy, or workflow changes, trigger review of linked documentation. Docs-as-code can place this work near the system change, but repository proximity does not guarantee accuracy.

## Measure Documentation Defects

Create structured defect categories:

- missing;
- not discoverable;
- incorrect;
- outdated;
- incomplete prerequisite;
- broken example;
- ambiguous;
- broken link;
- permission or audience mismatch;
- duplicate or contradictory.

Track:

- defects per 100 relevant views or workflow attempts;
- severity;
- time to acknowledge and correct;
- repeated defects;
- incidents or failed changes involving documentation;
- percentage found by users versus automated checks.

Do not reward low defect counts without looking at reporting channels. A difficult feedback process suppresses evidence.

## Evaluate Support Deflection Carefully

Useful measures include:

```text
how-to contacts per 100 workflow attempts
repeated support category volume
support contact after docs interaction
active support minutes for documented tasks
```

A drop in tickets can mean the docs improved. It can also mean developers stopped asking, found a workaround, or were forced into a different channel. Pair ticket data with task success, abandonment, and survey trust.

Documentation should not eliminate valuable consultation. The goal is to remove routine discovery and execution friction, not discourage architectural questions.

## Include External Discoverability Where Relevant

If internal platform documentation is intentionally accessible through a web search engine, Search Console can show impressions, clicks, and queries before a visitor arrives, while site analytics shows behavior after arrival. Google documents that these systems have different counting rules and should not be expected to match exactly.

For private documentation, the equivalent sources may be portal search, browser search, catalog navigation, CLI help, and links embedded in errors. Treat each entry point as its own funnel before combining it.

## Segment the Experience

Important segments include:

- new versus experienced developers;
- frequent versus occasional workflows;
- role and workload type;
- internal versus external entry point;
- standard versus exception path;
- language or region;
- documentation version.

Protect privacy with minimum group sizes and aggregation. Documentation analytics should improve information architecture, not evaluate which individuals “read enough.”

## Build a Documentation Scorecard

For each critical workflow, review:

| Dimension | Example measure |
| --- | --- |
| Coverage | Eligible workflow has owned documentation |
| Discovery | Relevant result selection and zero-result rate |
| Usefulness | Contextual helpfulness response |
| Task outcome | Verified success after documentation interaction |
| Effort | Search reformulations and time to useful result |
| Freshness | Review compliance and version alignment |
| Quality | Defect rate and correction time |
| Support | Routine contact rate and active handling minutes |
| Trust | Stable survey item |

Keep page views as context. High traffic may signal importance, excellent discoverability, or a confusing workflow that forces repeated reading.

## Run Content Experiments

For a high-friction workflow:

1. identify a specific failure in the funnel;
2. form a content or discovery hypothesis;
3. preserve baseline and guardrails;
4. change one major element;
5. stage or randomize exposure when practical;
6. measure task and support outcomes;
7. inspect qualitative feedback;
8. retain, revise, or revert.

Examples:

- put prerequisites before the procedure;
- replace a generic landing page with task-oriented choices;
- add an exact error-to-remediation link;
- test a runnable example in CI;
- improve result titles and synonyms;
- archive a duplicate page and redirect it.

## Avoid Documentation Metric Traps

- **Page views as success:** they measure access, not resolution.
- **Time on page:** long time can mean engagement or confusion.
- **Bounce rate:** a one-page answer can produce a successful “bounce.”
- **Search count:** more searches can mean greater use or poor information architecture.
- **Ticket deflection alone:** silence can be abandonment.
- **Coverage by page count:** duplicate content inflates the number.
- **Last modified date as freshness:** cosmetic edits reset it.
- **One aggregate score:** a failing rollback guide hides behind popular onboarding pages.

Platform documentation is an interface. Measure whether developers can discover the correct interface, trust it, and complete their task. Search and page analytics locate friction; workflow outcomes, freshness evidence, support patterns, and direct feedback tell you whether the documentation worked.

## Official Documentation

- [Backstage: Plugin Analytics](https://backstage.io/docs/frontend-system/building-plugins/analytics/)
- [Backstage: Search](https://backstage.io/docs/features/search/)
- [Backstage: TechDocs](https://backstage.io/docs/techdocs/generated-index/)
- [Google Search Central: Using Search Console and Google Analytics data](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console)
- [DORA: Platform engineering](https://dora.dev/capabilities/platform-engineering/)
