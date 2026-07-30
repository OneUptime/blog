# DORA Metrics for Platform Teams: What They Measure-and What They Miss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DORA, Platform Engineering, DevOps, Software Delivery, Developer Experience

Description: Apply DORA metrics to platform engineering without mistaking application delivery outcomes for a complete platform product scorecard.

---

DORA metrics can show whether the software delivery system used by a team is fast and stable. They do not, by themselves, tell you whether developers want an internal platform, can use it without help, or find that it reduces friction.

That distinction matters because a platform team influences delivery without owning every factor that determines it. DORA metrics belong in a platform scorecard, but they should sit beside adoption, task success, developer experience, and platform reliability measures.

## Use the Current Five-Metric Model

DORA's model has evolved. Current guidance groups five metrics into throughput and instability.

### Throughput

**Change lead time** is the time from a change being committed to version control until it is successfully deployed to production.

**Deployment frequency** is the number of deployments in a period, or equivalently the time between deployments.

**Failed deployment recovery time** is the time required to recover from a deployment that failed and needed immediate intervention.

### Instability

**Change fail rate** is the share of deployments that require immediate intervention, such as a rollback or hotfix.

**Deployment rework rate** is the share of deployments that are unplanned work performed in response to a production incident.

The fifth metric, deployment rework rate, was added to DORA's model in 2024. Failed deployment recovery time is deliberately narrower than the older, ambiguous use of "mean time to restore": it concerns recovery from a failed deployment.

Use a documented definition and record its version. A dashboard silently mixing older and current definitions will create false trends.

## What DORA Can Tell a Platform Team

Platform capabilities often alter the delivery system:

- a standard pipeline can shorten and stabilize commit-to-production time;
- automated deployment can make small, frequent releases practical;
- progressive delivery and rollback automation can reduce recovery time;
- consistent tests and policy checks can reduce failed changes; and
- reusable remediation paths can reduce unplanned deployment work.

Measure the DORA metrics at the application or service level. DORA explicitly cautions against blending unlike applications or using the metrics to make disparate teams compete. A mobile application, a batch settlement system, and a critical mainframe service have different constraints.

For each service, retain the raw deployment, change, and incident linkage needed to calculate the metrics. At minimum:

```text
deployment_id, service_id, environment, deployed_at, result
included_commit_ids, caused_failure, recovery_deployment_id
planned_or_rework, platform_path, platform_version
```

The platform path and version are not part of DORA's definitions, but they let you study whether adoption is associated with changed outcomes.

## Calculate Consistently

For a reporting window:

```text
deployment frequency = successful production deployments / time window

change fail rate =
  production deployments requiring immediate intervention
  / production deployments

deployment rework rate =
  unplanned incident-response deployments
  / production deployments
```

Calculate lead time per deployed change and recovery time per failed deployment, then report distributions such as median and p90. An arithmetic mean can conceal a long tail and is especially unstable with a small number of failures.

Decide how to handle:

- multi-service releases;
- several commits in one deployment;
- feature-flag activation versus artifact deployment;
- rollbacks and roll-forwards;
- automatically retried failed jobs;
- emergency changes; and
- deployments with no customer exposure.

There is no tool-independent universal event model for these cases. The important requirements are a definition that reflects your delivery process, consistent application over time, and visible exclusions.

## Use DORA as an Outcome, Not a Platform Target

Suppose a new golden path is followed by a drop in lead time. That is encouraging, but it does not prove attribution. Teams that volunteer first may already have better tests, newer architectures, or more delivery expertise.

A stronger evaluation uses phased adoption:

1. Record at least several reporting periods before exposure.
2. Define adopters from actual workflow events, not enrollment.
3. Match or stratify services by risk, architecture, and delivery cadence.
4. Compare the before-to-after change for adopters with the same-period change for non-adopters.
5. Check whether other initiatives changed at the same time.

A simple difference-in-differences estimate is:

```text
platform-associated delta =
  (adopter after - adopter before)
  - (comparison after - comparison before)
```

Do not publish this as a causal effect unless the study design supports that claim. Present the assumptions, sample sizes, and confidence intervals where practical.

Avoid turning a DORA metric into a quota. Requiring every service to deploy daily encourages empty or artificially split deployments. Setting change fail rate as an individual performance goal encourages under-reporting and arguments over incident classification. Use the set as a conversation about constraints, not a league table.

## What DORA Misses

### Whether Developers Choose the Platform

DORA does not measure eligible-team adoption, repeat use, bypasses, or abandonment. Delivery may improve because of a platform capability used by few teams, or despite a mandated tool that developers route around.

### Whether the Platform Is Self-Service

A deployment can be fast after waiting two days in an access queue. DORA's commit-to-production clock may expose some of that delay, but it cannot identify manual handoffs, approval waits, or support effort. Instrument the workflow stages directly.

### Developer Experience

DORA does not measure satisfaction, cognitive load, discoverability, or perceived effort. The SPACE framework treats developer productivity as multidimensional and explicitly combines human and system perspectives.

### Platform Reliability

Application delivery metrics do not replace SLOs for the portal, APIs, runners, secrets broker, or control plane. Track platform availability, latency, error-budget consumption, and workflow success separately.

### Coverage, Security, and Cost

DORA does not show which services lack the supported path, how often policy exceptions occur, whether shadow tooling is growing, or the cost per successful workflow. Those are separate product and governance questions.

### Work Before Commit

Change lead time begins at commit. Discovery, environment setup, local build delays, issue queue time, and review work that occurs before the selected commit boundary may contain most developer friction. Value-stream mapping should cover the broader journey.

## A Balanced Platform Scorecard

Use DORA as the delivery-outcome layer:

| Layer | Example measure |
| --- | --- |
| Platform demand | Eligible teams with voluntary repeat use |
| Task success | Self-service completion and abandonment |
| Developer experience | Transactional effort and satisfaction |
| Delivery outcome | Five service-level DORA metrics |
| Platform operation | SLO attainment and error-budget burn |
| Guardrails | Exceptions, incidents, and cost per completion |

For each new platform capability, select only the metrics connected to its hypothesis. A secrets self-service feature may plausibly affect access wait, support volume, and remediation time. Claiming it should increase deployment frequency without an explicit mechanism weakens the evaluation.

## A Review Pattern That Works

During a monthly platform review:

1. Inspect DORA trends per service and adopter cohort.
2. Look for a corresponding change in the target workflow.
3. Check platform reliability and security guardrails.
4. Read survey comments and interview unexpected outliers.
5. Choose one constraint to address next.

DORA metrics are valuable because they keep attention on software delivery outcomes rather than platform output. Their limit is equally useful: they force the platform team to gather the product and experience evidence needed to explain *why* those outcomes changed.

## Official Documentation

- [DORA: Software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [DORA: A history of software delivery metrics](https://dora.dev/insights/dora-metrics-history/)
- [DORA: Value stream mapping for software delivery](https://dora.dev/guides/value-stream-management/)
- [Microsoft Research: The SPACE of Developer Productivity](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/)
