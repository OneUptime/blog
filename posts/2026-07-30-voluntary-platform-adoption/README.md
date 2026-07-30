# How to Measure Voluntary Platform Adoption Without Confusing Usage with Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Platform Adoption, Internal Developer Platform, Product Metrics, Developer Experience

Description: Separate genuine platform choice from mandates, defaults, and incidental traffic with eligibility-aware adoption and retention metrics.

---

A platform can reach 100% usage because policy leaves teams no alternative. That may achieve standardization, but it does not show that the platform has earned developer preference.

Voluntary adoption answers a narrower product question: when an eligible team has a real choice, does it select the supported platform path and keep using it? Measure that choice explicitly. Keep compliance in a separate series.

## Define the Choice Before Counting It

Classify every platform use by the conditions under which it happened:

| Adoption mode | Meaning |
| --- | --- |
| Voluntary | A supported alternative existed and the team freely selected the platform |
| Defaulted | The platform was preselected, but the team could opt out at reasonable cost |
| Mandated | Policy, funding, or access rules required the platform |
| Migrated | A central program moved the workload on the team's behalf |
| Inherited | The team took ownership of a service already using the platform |

These categories should be mutually exclusive for a given service, capability, and period. Do not infer them from traffic. Record the applicable policy and migration context in an adoption registry.

Defaults deserve their own category because they affect behavior. A technically available opt-out that requires executive approval is not a meaningful choice.

## Choose the Right Unit

Adoption can be measured at several levels:

- **Developer:** useful for personal tools such as a CLI;
- **Team:** useful for shared workflows and operating practices;
- **Service:** useful for CI/CD, observability, and runtime capabilities;
- **Workflow:** useful when the same team can choose different paths per task.

Do not mix them. Ten developers from one team using a CLI are not ten adopted teams. A service generated from a template once is not necessarily an active platform service.

For most internal platforms, the most stable headline is eligible-team or eligible-service adoption, with developer activity as a diagnostic.

## Build an Eligibility Denominator

The denominator should contain entities for which the capability is relevant and usable:

```text
voluntary adoption rate =
  eligible entities actively using the capability by choice
  / eligible entities with a meaningful choice
```

Define "eligible" with auditable rules. For a Kubernetes deployment path, it might mean active containerized services in supported regions that do not have a documented regulatory exception. Remove retired services and pre-production experiments. Keep excluded entities in an exclusion table with a reason and expiry date.

Never use all employees, all repositories, or all catalog entries merely because those totals are easy to obtain. An inflated denominator makes a useful niche capability look weak; a denominator limited to portal visitors makes adoption look artificially strong.

## Require Meaningful Activity

Define active use as a completed value-producing event, not a login, page view, installation, or enrollment. Examples include:

- a successful production deployment through the supported pipeline;
- an environment provisioned and verified ready;
- an access grant completed through policy automation; or
- a service consuming the platform's managed observability path.

Set a capability-appropriate window. Deployment tooling may require activity in 30 days; disaster-recovery workflows may need a much longer period or an evidence-of-configuration measure.

Then distinguish first use from repeat use:

```text
repeat adoption =
  voluntary adopters with successful use in at least two periods
  / voluntary first-time adopters eligible to return
```

Retention is stronger evidence of value than a launch spike.

## Measure the Adoption Funnel

Instrument the journey:

```text
eligible -> exposed -> explored -> started -> completed -> repeated
```

For each transition, calculate conversion and time to the next stage. This separates different product problems:

- low exposure suggests discoverability;
- exploration without a start suggests unclear value or prerequisites;
- starts without completion suggest usability or reliability;
- completion without repeat use suggests a one-time task or disappointing value.

Record the first credible exposure, such as documentation viewed after search, a catalog result displayed, or a platform capability discussed during team planning. Do not mark every employee "exposed" because an announcement was sent.

## Track Bypasses as Product Evidence

Adoption analysis is incomplete without the alternative path:

```text
voluntary choice share =
  eligible voluntary completions on the platform
  / all eligible voluntary completions across known paths
```

Discover alternatives from cloud inventories, CI systems, source repositories, service-desk data, identity systems, and developer interviews. Classify bypasses:

- capability missing;
- unsupported edge case;
- migration cost too high;
- platform slower or less reliable;
- insufficient permissions or documentation;
- team preference;
- approved exception;
- emergency procedure; or
- unknown.

A falling platform share accompanied by a rise in "unknown" is not an explanation. Treat unknown paths as an instrumentation backlog.

Do not call all bypasses noncompliance. A team using an approved path for a workload the platform cannot support is giving useful scope feedback.

## Separate Adoption From Compliance

Publish two views:

```text
compliance coverage =
  in-scope entities meeting the required control
  / all entities subject to the control

voluntary platform adoption =
  eligible entities choosing the platform
  / eligible entities with a choice
```

The platform may help produce compliance, but the questions differ. Compliance asks whether a required outcome exists. Adoption asks whether customers prefer a product. Combining them rewards mandates and hides dissatisfaction.

When a capability becomes mandatory, close the voluntary time series for newly mandated cohorts. Continue measuring task success, effort, bypass attempts, and exceptions; these show product quality after choice disappears.

## Use Cohorts Instead of One Company Number

Group adopters by first-use month, business domain, service type, and adoption mode. Compare:

- 30-, 60-, and 90-day retention;
- successful tasks per active entity;
- support contacts per 100 tasks;
- time to first value;
- effort survey results; and
- relevant delivery outcomes.

Show sample sizes and confidence intervals for survey measures. Suppress tiny team cuts that could identify individuals.

Phased availability provides better evidence than a company-wide launch. Compare eligible teams offered the capability with comparable teams not yet offered it. Early adopters may be unusually motivated, so do not generalize their behavior without later cohorts.

## Guard Against Gaming

Adoption becomes unreliable when it is a target tied to team evaluation. Common distortions include:

- registering unused services;
- routing a token job through the platform;
- counting centrally migrated workloads as team choice;
- narrowing eligibility after the fact; and
- removing failed or abandoned attempts.

Version the metric definition, store raw events, and have a group outside the platform team review eligibility and adoption-mode changes.

## What Good Evidence Looks Like

A credible adoption report might say:

> Of 84 eligible teams, 52 had a meaningful choice. Thirty-four chose the platform and completed a production workflow in the last 30 days, for 65% voluntary adoption. Twenty-eight returned in the following period. Twelve eligible teams used another path, primarily because regulated-region support is missing; six had no observed workflow. Mandated use is reported separately.

That statement is less flattering than a count of 3,000 portal users, but far more actionable. It shows who chose the platform, whether they received value, and why others did not.

## Official Documentation

- [Microsoft Learn: Adoption of platform services, tools, and technologies](https://learn.microsoft.com/en-us/platform-engineering/adoption)
- [Microsoft Learn: Platform Engineering Capability Model](https://learn.microsoft.com/en-us/platform-engineering/platform-engineering-capability-model)
- [Microsoft Learn: Platform engineering principles](https://learn.microsoft.com/en-us/platform-engineering/about/principles)
- [CNCF TAG App Delivery: Platforms White Paper](https://tag-app-delivery.cncf.io/whitepapers/platforms/)
