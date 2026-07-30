# Golden Path Adoption: How to Measure Use, Bypasses, and Drop-Off Points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Golden Paths, Developer Experience, Adoption Metrics, DORA

Description: Measure whether developers discover, complete, repeat, or bypass golden paths without turning recommended workflows into vanity metrics.

---

A golden path is a supported, highly automated way to complete a common engineering task. Its purpose is to make a good practice the easiest practical choice, not merely to place a template in a portal.

Measuring golden-path adoption therefore requires more than counting template launches. Track the full funnel, compare completions across all known paths, inspect repeat use, and classify bypasses.

## Give Every Path an Observable Identity

Create a registry:

```text
path_id
path_version
capability
eligible_use_cases
supported_variants
owner
effective_from
deprecated_at
```

Emit `path_id` and `path_version` from every interface: portal, CLI, API, CI workflow, and generated repository. Template identity alone is insufficient because teams can scaffold once and replace the resulting pipeline.

Where ongoing conformance matters, add a non-invasive evidence check for the maintained capability, such as the supported workflow reference, policy bundle, or managed service binding. Call this *current path coverage*, not adoption, because it describes state rather than a recent choice.

## Define the Denominator by Task

For a specific workflow:

```text
golden-path completion share =
  eligible successful completions through the golden path
  / successful eligible completions through all known paths
```

Examples:

- production deployments for services supported by the standard pipeline;
- newly created services in supported languages;
- database provisioning requests in supported regions; or
- observability onboarding for eligible production services.

Do not divide by every repository or employee. Maintain explicit eligibility rules and time-bounded exceptions. Include known legacy, custom, ticket-based, and direct-provider completions in the denominator.

Also report:

```text
golden-path attempt success =
  successful golden-path attempts
  / terminal eligible golden-path attempts
```

The first metric measures choice share; the second measures whether the path works.

## Instrument the Funnel

A useful generic funnel is:

```text
eligible
  -> path shown
  -> documentation or preview opened
  -> path started
  -> inputs validated
  -> execution started
  -> resource or service ready
  -> first production use
  -> repeated use
```

Not every capability needs every step. Select milestones that represent a change in intent or state, and link them with a journey ID.

For each stage calculate:

```text
stage conversion = journeys reaching next stage / journeys entering stage
stage latency = next_stage_at - stage_at
```

Retain terminal reasons such as validation failure, platform failure, user cancellation, timeout, or switch to another path. An attempt that begins in the portal and finishes through a ticket should appear as a drop-off and an assisted completion—not disappear.

## Locate the Drop-Off, Then Investigate It

Different funnel breaks imply different responses:

**Eligible but not shown:** catalog, search, or integration coverage is incomplete.

**Shown but not started:** the value proposition, prerequisites, or supported scope may be unclear.

**Started but not validated:** inputs, terminology, defaults, or policy feedback may be poor.

**Validated but not ready:** platform reliability, external dependencies, approvals, or execution time may be the constraint.

**Ready but not used in production:** generated output may require undocumented integration or fail to meet the team's needs.

**First use but no repeat:** the task may be one-off, or teams may be replacing the path after encountering limitations.

Telemetry tells you where to look. Session research, support conversations, and interviews explain why. Avoid recording sensitive form values or developer behavior unrelated to the task.

## Treat Bypasses as First-Class Data

Discover non-golden paths from CI systems, cloud audit logs, infrastructure state, source-code references, service tickets, and interviews. Assign a reason:

- unsupported language, region, or architecture;
- capability gap;
- reliability or performance concern;
- migration effort;
- required exception;
- emergency response;
- team preference;
- legacy path awaiting retirement; or
- unknown.

Separate justified exceptions from avoidable bypasses. A platform that supports 80% of workloads can be successful, but presenting the remaining 20% as noncompliant adoption failures hides product scope.

Track bypass volume and the developer time associated with it. Ten manual workflows taking a week each may matter more than a hundred quick, approved exceptions.

## Measure Repeat Use and Survival

For recurring tasks, first use is weak evidence. Build cohorts by the month of first successful golden-path completion and measure return:

```text
period-N retention =
  adopters successfully using the path again in period N
  / adopters with an eligible opportunity to return
```

The phrase "eligible opportunity" matters. A team cannot repeat service creation every month, while it may deploy daily. Choose retention logic that matches task frequency.

For created services, measure survival differently:

- still on the supported pipeline after 30, 90, and 180 days;
- template or policy version current;
- no replacement shadow workflow;
- production readiness achieved; and
- ownership metadata still valid.

Version transitions should be visible. A declining v1 path may be healthy if teams are moving to v2.

## Pair Adoption With Outcomes and Guardrails

Golden-path use is not inherently good. DORA's 2024 research found benefits from internal developer platforms while also warning that implementation can coincide with reduced delivery throughput and stability. Measure the result.

Pair path adoption with:

- end-to-end task time and p90;
- self-service completion;
- support contacts and manual handoffs;
- effort survey results;
- relevant service-level DORA trends;
- platform SLO attainment;
- change failures or rollbacks;
- policy exceptions; and
- cost per completed task.

Compare adopters with their own baseline and, where practical, similar teams not yet exposed. Avoid claiming causality from a simple correlation between adoption and delivery performance.

## Make the Path Improve Through Use

Review a path as a product:

1. Inspect the funnel and the largest time-weighted drop-off.
2. Sample failed journeys and unknown bypasses.
3. Interview successful, failed, and bypassing teams.
4. Choose one friction hypothesis.
5. Ship a versioned change to a cohort.
6. Check conversion, outcome, and guardrail movement.

Do not make adoption a performance quota for developer teams. Quotas produce token use, hidden alternatives, and under-reported failures. A golden path should earn preference by reducing cognitive load and waiting while preserving necessary control.

The honest headline is not "1,200 template launches." It is:

> The golden path completed 68% of eligible new-service journeys. Eighty-six percent of attempts reached production, compared with 61% last quarter. Most remaining bypasses require a language the path does not yet support; the largest drop-off is during access-policy validation.

That tells the platform team what is working and what to build next.

## Official Documentation

- [DORA: 2024 Accelerate State of DevOps Report](https://dora.dev/research/2024/dora-report/)
- [Microsoft Learn: Self-service with guardrails](https://learn.microsoft.com/en-us/platform-engineering/about/self-service)
- [Microsoft Learn: Adoption of platform services, tools, and technologies](https://learn.microsoft.com/en-us/platform-engineering/adoption)
- [CNCF TAG App Delivery: Platforms White Paper](https://tag-app-delivery.cncf.io/whitepapers/platforms/)
