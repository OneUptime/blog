# Reporting MTTR Without Perverse Incentives

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Blameless Culture, Incident Management, Reliability Metrics, SRE

Description: Report recovery time as a system-learning measure without rewarding early closure, hidden incidents, severity downgrades, or responder ranking.

---

When MTTR becomes a target for individual performance, people can improve the number without improving reliability. They can declare impact later, resolve tickets earlier, downgrade severity, split or merge incidents strategically, and avoid recording near misses. The solution is not to abandon measurement; it is to design reporting around learning, balanced outcomes, and auditable definitions.

## Decide What the Metric Is For

Use recovery metrics to answer system questions:

- Are customers returning to acceptable service faster?
- Which response phase creates the longest tail?
- Which failure modes need safer rollback or better diagnosis?
- Are mitigation actions successful and durable?
- Does error-budget impact fall as recovery changes?

Do not use raw MTTR to rank individual responders. An on-call engineer does not choose the architecture, traffic peak, dependency failure, incident mix, access system, or number of teams required. Ranking also discourages escalation and accurate recording.

Team-level trends need the same care. A team that declares every incident will look worse than one that keeps events in chat. Good reporting behavior should improve data quality, not damage a score.

## Anticipate the Common Gaming Paths

| Incentive | Predictable behavior | Countermeasure |
| --- | --- | --- |
| Minimize declaration-to-resolution | Delay declaration or resolve before SLI recovery | Use telemetry-backed impact and restoration clocks |
| Keep severe MTTR low | Downgrade severity | Retain initial and peak severity plus impact evidence |
| Reduce incident count | Merge unrelated failures | Versioned episode-linking and causal review |
| Reduce duration | Split one long outage into short tickets | Union impact windows under a parent episode |
| Reward permanent fix speed | Mark workaround as permanent | Separate restoration and remediation workflows |
| Publish only completed incidents | Leave difficult incidents open | Show open count and current age |
| Penalize false positives | Avoid paging on uncertain threats | Measure alert quality without blaming responders |

No policy eliminates judgment. The point is to make the important choices visible and reviewable.

## Use Evidence-Backed Clocks

Define impact start and restoration from scoped service conditions where possible. Keep detection, declaration, acknowledgment, mitigation, resolution, and closure as separate timestamps. If a human correction changes impact start, retain the prior value, evidence, reason, author, and policy version.

A stability window prevents a single green sample or quick ticket transition from ending recovery. Reopens and flapping should follow a predefined episode policy rather than altering past results opportunistically.

Show coverage: eligible incidents, completed durations, open incidents, missing starts, missing restoration, exclusions, and manual overrides. A lower median paired with collapsing timestamp coverage is not an improvement.

## Pair Speed with Guardrails

Recovery time should appear beside:

- SLO bad events, error-budget share, or user-minutes;
- incident frequency and repeat-incident rate;
- p75 and p90, not only mean;
- mitigation success and reopen rate;
- customer communication and data-integrity outcomes;
- reactive responder-hours and on-call load;
- age and risk of temporary remediations;
- follow-up completion.

A fast but harmful rollback should fail a recovery-success guardrail. A feature kill switch that rapidly protects most users while a small cohort remains degraded should show both the mitigation benefit and full-restoration tail.

Avoid collapsing the scorecard into one weighted score. Once compensation depends on a composite, its weights become new gaming targets and important tradeoffs disappear.

## Report Distributions and Context

For every cohort publish count, median, p75 or p90, mean, maximum, open count, and the slowest incident links. Segment by service, severity, and failure mode while keeping the pooled view and composition visible.

Do not remove outliers merely because they distort the mean. Confirm whether they are data defects, workflow tails, or genuine hard recoveries. Correct data with an audit trail; retain legitimate extremes.

Use confidence bounds or raw points for small cohorts. Avoid league tables where a team with three incidents appears directly comparable to one with fifty.

## Make Review Blameless and Consequential

Google SRE describes blameless postmortems as focusing on contributing causes without indicting individuals. That does not mean avoiding accountability. It means assigning actions to improve systems, procedures, training, and architecture while assuming responders acted with the information and tools available.

Review tail incidents with questions such as:

- What information was unavailable at each decision?
- Which permission, dependency, or control delayed safe action?
- Did escalation and incident roles work as designed?
- Was the recovery path tested?
- Which guardrail prevented faster mitigation?
- Did the metric definition misrepresent the customer experience?

Track whether agreed actions are completed and effective. Celebrating a low number while the same incident recurs is performance theater.

## Establish Metric Governance

Maintain a versioned measurement contract owned jointly by reliability, product, data, and service representatives. Changes to inclusion, clocks, severity, or stability windows require review. Recompute history under the new rule or draw a visible discontinuity.

Audit a sample of included and excluded incidents. Monitor unusual changes in declaration delay, manual overrides, severity distribution, reopen behavior, and missingness. Give teams a safe way to challenge a metric when it conflicts with incident evidence.

Restrict person-level data. Operational timelines need roles and actions for coordination and learning, but dashboards can aggregate at appropriate cohort levels. Apply minimum group sizes where privacy or re-identification is a concern.

## Reward the Behaviors You Want

Recognize early declaration, timely escalation, accurate impact correction, effective communication, well-tested rollback, high-quality postmortems, and completion of preventive work. Some of these behaviors may initially increase incident count or measured duration because visibility improves.

Set goals around capabilities and outcomes, such as instrumenting restoration, testing failover quarterly, or reducing p90 recovery for a defined failure mode. These are harder to game and easier to connect to engineering investment than a universal MTTR quota.

## Official Documentation

- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [Google SRE Workbook: Incident Response](https://sre.google/workbook/incident-response/)
- [Google SRE Workbook: Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)

## Conclusion

MTTR is safest as a system-learning signal, not an individual score. Use evidence-backed clocks, publish distributions and data coverage, pair speed with impact and recovery quality, and govern definition changes. Reward honest declaration, escalation, learning, and durable reliability work even when better visibility makes the metric look worse at first.
