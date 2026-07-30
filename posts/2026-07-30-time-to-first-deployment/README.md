# Time to First Deployment: A Practical Metric for Developer Onboarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Developer Onboarding, Platform Engineering, Developer Experience, Deployment, Metrics

Description: Define time to first deployment as a fair onboarding-system metric with clear boundaries, stage diagnostics, and privacy protections.

---

Time to first deployment can reveal whether a new developer can navigate access, local setup, code review, CI, and release systems. It should measure the onboarding system—not rank individual engineers.

The metric becomes useful only after "start," "deployment," and the eligible cohort are defined. A generated README change deployed by a mentor on day one and an independently authored production fix on day ten answer different questions.

## Define the Event You Actually Care About

A practical primary definition is:

```text
time to first deployment =
  first successful production deployment containing
  an eligible new developer's authored change
  - onboarding start timestamp
```

Specify each term.

**Onboarding start** may be employment start, transfer into the team, or the time the person receives a complete onboarding assignment. Employment start captures organizational access delay; access-ready start isolates the engineering workflow. Keep both if those questions matter:

```text
organizational TTFD = first_deployed_at - team_start_at
engineering TTFD = first_deployed_at - engineering_access_ready_at
```

**Successful production deployment** means the change reached the intended production environment and passed the team's normal verification. A merge, build, staging deployment, or release request is an intermediate milestone.

**Authored change** should be attributed through version-control metadata. Decide how co-authored and paired changes count. Do not require the new engineer to press the deployment button if the team's normal process deploys automatically.

**Eligible change** should be meaningful but not artificially large. Exclude automated account setup, centrally generated commits, and cosmetic changes created solely to improve the metric. Avoid a minimum line count; lines are a poor proxy for value.

## Track a Milestone Ladder

The headline duration tells you that onboarding is slow. Milestones tell you why:

```text
team start
  -> identity and required access ready
  -> development environment verified
  -> repository cloned and local build passed
  -> first eligible change started
  -> first pull request opened
  -> first pull request approved
  -> first pull request merged
  -> first production deployment verified
```

Use stable person, team, service, change, and deployment IDs to join authoritative events. Record stage timestamps rather than trying to reconstruct them later from mutable issue fields.

Calculate stage durations:

```text
access delay = access_ready_at - team_start_at
environment setup = local_build_passed_at - access_ready_at
first-change preparation = pr_opened_at - local_build_passed_at
review wait = pr_approved_at - pr_opened_at
deploy wait = first_deployed_at - pr_merged_at
```

These stages prevent an internal platform from taking credit for improvements caused by a team changing its first-task design, and they show where platform work can help.

## Report Distributions and Censored Cases

Publish cohort median and p75 or p90, not an individual leaderboard. The distribution is usually skewed, and an average is sensitive to a few long onboardings.

People who have not yet deployed are not zeroes and should not be discarded. They are right-censored observations: the final duration is not known at the reporting cutoff. Use one of these approaches:

- report the share reaching first deployment within 7, 14, and 30 days;
- use a fixed maturity window and only compare fully observed cohorts; or
- use a time-to-event survival curve.

Always show cohort size and the number still censored. Recent cohorts can otherwise look deceptively fast because only their quickest members have completed.

For small teams, aggregate over longer periods and suppress slices that could identify people.

## Segment by Context, Not Personal Traits

Useful segments include:

- new hire versus internal transfer;
- service and repository type;
- supported golden path versus custom path;
- office or remote setup when infrastructure differs;
- regulated versus standard environment;
- onboarding program version; and
- team or product area at a sufficiently large aggregation.

Do not compare individuals or use TTFD in performance evaluation. Role, task availability, production risk, prior domain experience, part-time schedules, and leave can dominate the number. The threat of evaluation also encourages trivial first changes and under-reporting of obstacles.

## Pair Speed With Quality and Experience

Faster is not always better. Use guardrails:

- first-change rollback or remediation;
- change fail rate for the cohort, reported only at safe aggregation;
- review quality and test completion;
- support contacts and manual handoffs;
- onboarding satisfaction or effort;
- documentation findability; and
- sustained progress to later milestones.

A new developer who deploys a token change quickly but remains unable to build or operate the service has not successfully ramped up. Google Research's onboarding work distinguishes early onboarding events from broader ramp-up; TTFD is one milestone, not a complete productivity measure.

Useful follow-on measures may include time to first independent on-call contribution, time to first substantive feature, or a structured self-assessment of role confidence. Choose only milestones relevant to the role.

## Diagnose Common Patterns

**Long start-to-access, short access-to-deploy:** identity, hardware, or entitlement provisioning is the constraint.

**Long local setup, normal review and deploy:** development environments or setup documentation need work.

**Fast PR opening, long review wait:** reviewer capacity, ownership, or first-task scope is the issue.

**Fast merge, long deployment wait:** release windows, environment queues, or manual approval dominate.

**Good median, poor p90:** the common path works, but a region, platform, or access class creates severe outliers.

**Faster TTFD with worse survey responses:** the organization may be forcing a ceremonial change while broader onboarding remains confusing.

Interview a sample from the fastest, median, slowest, and censored journeys. Telemetry locates delay; developers explain the missing prerequisites, unclear documentation, and social coordination behind it.

## Evaluate a Platform Change

Suppose a platform team launches a preconfigured development environment:

1. Freeze the TTFD and milestone definitions.
2. Record several baseline cohorts.
3. Roll out the environment to a subset of eligible teams.
4. Compare environment-setup duration and overall TTFD with teams not yet exposed.
5. Check cohort mix, censoring, quality, and satisfaction guardrails.
6. Investigate whether later stages became the new constraint.

Do not claim the environment caused the entire TTFD change if access automation, first-task policy, or team staffing changed simultaneously.

## A Good Metric Contract

Document the metric next to the dashboard:

```text
Population: engineers newly joining product teams
Start: first scheduled day on the team
End: first verified production deployment containing an authored eligible change
Clock: calendar elapsed time
Window: monthly start cohort, observed for 30 days
Statistics: median, p75, deployed-within-14-days, censored count
Exclusions: interns under two weeks, leave longer than five days, no-production roles
Owner: Developer Experience Analytics
Definition version: 2.1
```

Keep exclusions auditable and report their count. If the metric contract changes, annotate the series rather than presenting a false continuous trend.

Microsoft's platform engineering guidance suggests median days to a first pull request as an onboarding measure. Extending the boundary to verified production deployment tests more of the delivery path. Used with stage metrics and humane governance, TTFD becomes a practical measure of how quickly the organization enables a developer to contribute—not how quickly a person proves their worth.

## Official Documentation

- [Microsoft Learn: Plan and prioritize a platform engineering journey](https://learn.microsoft.com/en-us/platform-engineering/plan)
- [Google Research: Developer Productivity for Humans—Onboarding and Ramp-Up](https://research.google/pubs/developer-productivity-for-humans-part-5-onboarding-and-ramp-up/)
- [DORA: Continuous delivery](https://dora.dev/capabilities/continuous-delivery/)
- [DORA: Documentation quality](https://dora.dev/capabilities/documentation-quality/)
