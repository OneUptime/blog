# Did the Platform Improve Delivery? How to Attribute Changes in DORA Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, DORA, Causal Inference, Software Delivery, Metric, Experimentation

Description: Evaluate a platform’s effect on delivery by preserving service-level DORA definitions and estimating a credible counterfactual instead of relying on a before-and-after chart.

---

Suppose change lead time falls after an internal developer platform launches. The platform may have helped. The same period may also contain smaller pull requests, a release freeze ending, a team reorganization, improved tests, or a product with fewer changes.

“After” is not the same as “because.”

DORA’s software delivery metrics are valuable outcomes, but they are not attribution machinery. To estimate whether a platform caused a change, you need stable measures, explicit exposure, comparable units, and a credible picture of what would have happened without the platform.

## Preserve What the DORA Measures Mean

DORA currently describes five software delivery performance measures:

- **Change lead time:** time from commit to production.
- **Deployment frequency:** deployments over a period or time between deployments.
- **Failed deployment recovery time:** time to recover from a deployment failure requiring immediate intervention.
- **Change fail rate:** proportion of deployments requiring immediate intervention.
- **Deployment rework rate:** proportion of unplanned deployments made because of a production incident.

Keep them at the application or service level. DORA explicitly cautions that combining unlike applications or making disparate comparisons can be misleading.

Write definitions that survive the platform rollout:

```text
deployment
  = a successful production release event for one service

failed deployment
  = a deployment followed within the defined window by rollback,
    hotfix, disablement, or other immediate remedial intervention

change lead time for each change
  = production deployment time - that change's commit time
```

Version any change to repository mapping, squashed-commit handling, incident linkage, or deployment detection.

## Define Platform Exposure

Avoid a single `adopted = true` flag. Record when and how a service is exposed:

```text
eligible_date
invited_date
first_platform_deployment
majority_platform_deployments_date
legacy_path_disabled_date
platform_workflow_version
golden_path_or_exception
```

Under a randomized offer or rollout assignment, “invited” supports an intent-to-treat question: what was the effect of offering the platform? “Majority platform deployments” supports a usage question but is more vulnerable to self-selection, because motivated or easier-to-migrate teams may adopt first.

Choose the question before selecting the exposure definition.

## Prefer a Designed Rollout

The cleanest practical design is often a staggered rollout:

1. Identify eligible services.
2. Group comparable services into rollout waves.
3. Randomize the order when operationally acceptable.
4. Keep measurement definitions identical across waves.
5. Avoid shipping unrelated delivery changes to only one wave.
6. Analyze assigned rollout as the primary comparison, and analyze actual usage with its additional selection assumptions made explicit.

Randomization is not always possible. A transparent staged rollout still provides not-yet-treated services as potential contemporaneous comparisons, provided teams do not anticipate adoption or receive spillover effects before their assigned wave.

Do not withhold a critical security or reliability fix merely to preserve an experiment. The design must remain operationally and ethically sound.

## Use Difference-in-Differences Carefully

With treated and comparison services measured before and after rollout, a basic estimate is:

```text
platform effect =
  (treated_after - treated_before)
  - (comparison_after - comparison_before)
```

For a metric where lower is better, a negative result may represent improvement.

Example:

```text
treated lead time:     72h -> 40h   change = -32h
comparison lead time:  60h -> 52h   change =  -8h

estimated platform-associated change = -32h - (-8h) = -24h
```

This is credible only if, absent the rollout, the groups would plausibly have continued on similar trends. Plot multiple pre-rollout periods. If treated services were already improving much faster, the simple estimate is suspect.

Use an estimator appropriate to the design. In a nonrandom staggered rollout, a conventional two-way fixed-effects regression can be biased when effects vary by rollout cohort or time since adoption; use a staggered-adoption estimator robust to that heterogeneity. Cluster uncertainty at the treatment-assignment level, often the service or team, and involve someone qualified in experimental or causal analysis for consequential claims.

## When No Comparison Group Exists

An interrupted time series can be better than one before/after average:

- collect many periods before and after;
- mark rollout and migration phases;
- model the previous level and trend;
- account for seasonality and serial correlation;
- check whether a level or slope changes at intervention;
- annotate other simultaneous interventions.

A counterfactual time-series method can use unaffected control series to predict what the outcome would have been. Google’s CausalImpact documentation is explicit that such conclusions depend on strong assumptions: control series must not be affected by the intervention, and their pre-period relationship with the treated series must remain stable.

If every service migrates at the same time as a reorganization and CI replacement, honest attribution may be impossible. Report association and uncertainty rather than inventing causality.

## Control for Important Context Without Explaining Away the Effect

Potential confounders include:

- service type and architecture;
- team size and experience;
- change volume and batch size;
- repository migration;
- test-suite improvement;
- incident and freeze periods;
- regulatory release windows;
- team ownership changes;
- simultaneous CI/CD or observability work;
- workload retirement or rapid growth.

Record these before rollout. Do not add controls only because they make the platform estimate favorable. Also distinguish mediators from confounders. For example, smaller batch size may be a mechanism through which the platform improves delivery; controlling it away answers a different question.

## Examine All Five Measures Together

Platform impact can shift the balance:

| Pattern | Interpretation to investigate |
| --- | --- |
| Lead time down, failure stable | Delivery likely became faster without visible stability loss |
| Frequency up, rework up | More deployments may include more unplanned remediation |
| Recovery faster, failure unchanged | Detection, rollback, or diagnostics may have improved |
| Lead time down, failure up | Path may prioritize speed over safe feedback |
| Metrics flat, developer effort down | Platform value may appear first in experience or toil |

DORA warns against one metric ruling them all. Platform engineering guidance also recommends a balanced scorecard of delivery, developer experience, adoption, retention, and task success.

## Test the Mechanism

Delivery metrics are distant outcomes influenced by many factors. Add platform-specific leading measures:

- percentage of eligible deployments using the path;
- wait time in platform-controlled stages;
- manual approvals per deployment;
- repeated validation failures;
- rollback initiation time;
- percentage of failures with actionable diagnostics;
- self-service completion;
- developer-reported deployment pain.

If change lead time falls but no platform-controlled stage changes and actual exposure is low, the platform explanation is weak. If approval wait falls sharply at rollout and lead time follows, the mechanism is more plausible.

## Avoid Selection and Survivorship Bias

Early adopters are rarely random. They may have:

- modern architectures;
- supportive managers;
- existing automation;
- lower regulatory constraints;
- more platform advocates.

Also retain failed, rolled-back, abandoned, and retired migrations in the analysis. Measuring only services that complete adoption turns migration difficulty into invisible data.

Use eligibility-based cohorts, match on pre-rollout characteristics where needed, and publish exclusions with reasons.

## Pre-Register the Analysis

Before viewing the post-rollout result, record:

- primary outcome and direction;
- metric definitions;
- service inclusion rules;
- exposure definition;
- comparison group;
- analysis window;
- migration or washout period;
- confounders to account for;
- guardrails;
- subgroup analyses;
- missing-data treatment;
- decision threshold.

This prevents switching from lead time to deployment frequency-or from median to average-after discovering which chart looks best.

## Report Claims at the Strength of the Design

Use wording that matches evidence:

- **Randomized staged rollout:** “The rollout caused an estimated change under the experiment’s design and assumptions.”
- **Strong quasi-experiment:** “The change is consistent with a platform effect under stated parallel-trend or counterfactual assumptions.”
- **Before/after with weak controls:** “The metric changed after adoption; attribution remains uncertain.”
- **Descriptive dashboard:** “Adopting services currently have different outcomes; this does not show that adoption caused them.”

Include effect size, uncertainty, sample size, pre-trends, exclusions, and known concurrent changes. Statistical significance alone does not tell you whether the operational effect matters.

The platform improves delivery only if a credible comparison says delivery would otherwise have been worse. Preserve DORA’s service-level definitions, design the rollout as an evaluation opportunity, inspect mechanisms and guardrails, and be precise about what the evidence can support.

## Official Documentation

- [DORA: DORA’s software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [DORA: Platform engineering](https://dora.dev/capabilities/platform-engineering/)
- [DORA: Choosing measurement frameworks to fit your organizational goals](https://dora.dev/research/2025/measurement-frameworks/)
- [Google CausalImpact documentation](https://google.github.io/CausalImpact/CausalImpact.html)
