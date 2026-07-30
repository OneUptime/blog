# Calculate Self-Service Rate for Infrastructure, Deployments, and Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Self-Service, Infrastructure Automation, Deployment Automation, Access Management

Description: Define and calculate self-service rates with honest denominators, end-to-end completion events, and workflow-specific guardrails.

---

Self-service means a developer can request, track, and receive an approved result without another team performing routine fulfillment work. A portal form alone is not self-service. If it creates a ticket that an operator completes, the interface changed but the operating model did not.

The most useful rate compares touchless successful fulfillment with all eligible successful fulfillment. A second rate shows whether attempts on the self-service path actually succeed.

## Use Two Rates, Not One

### Self-Service Fulfillment Rate

This measures channel shift across all known ways the organization fulfills the task:

```text
self-service fulfillment rate =
  touchless successful completions
  / all eligible successful completions
```

The denominator includes platform, ticket, chat, runbook, and direct operator completions. It excludes requests that are genuinely ineligible under a documented rule.

### Self-Service Success Rate

This measures the quality of the self-service path:

```text
self-service success rate =
  successful eligible self-service attempts
  / all terminal eligible self-service attempts
```

Terminal attempts include success, rejection, failure, timeout, and abandonment when abandonment can be observed. A high fulfillment share with a low success rate means the organization is pushing demand into a poor experience.

Also publish the count of started, still-running, and censored attempts. Do not quietly drop timeouts or requests that never emitted a completion event.

## Define "Touchless" Precisely

A request is touchless when routine fulfillment completes through predefined automation and policy without a provider-side person making a decision or changing the target system.

These can still be self-service:

- automated policy evaluation;
- approval inherent in a previously granted role;
- asynchronous workflow execution;
- automated security and cost checks;
- a developer correcting invalid input; and
- notification to an operations team that requires no action.

These are assisted fulfillment:

- a service-desk agent approves or completes the request;
- an operator edits infrastructure code for the requester;
- security manually evaluates a routine access grant;
- a platform engineer repairs the workflow before it can finish; or
- a person verifies the result before releasing it.

Keep a second label for *human-approved but automatically fulfilled* requests. Some regulated workflows cannot remove the decision, but can still eliminate manual implementation. Collapsing these into touchless self-service hides the bottleneck.

## Establish the Eligible Demand

Define eligibility per capability and version. A request is eligible only if the platform supports its resource type, region, risk tier, and required configuration at the time of intent.

Maintain:

```text
capability, eligibility_rule_version, effective_from, effective_to
request_id, eligible, exclusion_reason
```

Valid exclusions may include a resource class not yet supported or a legal requirement for case-by-case review. "Used the old process" is not an exclusion. Neither is a failed platform attempt.

Find demand across every channel. Reconcile portal events with service-desk categories, chat workflows, infrastructure state, deployment systems, and identity audit logs. Otherwise, the denominator merely measures what the platform can see.

## Instrument an End-to-End Request

Use a durable request ID across interfaces and providers:

```text
request_started
request_submitted
policy_evaluated
approval_started
approval_completed
fulfillment_started
resource_created
verification_passed
request_ready
request_failed
request_abandoned
```

The success event must represent a usable result. `terraform apply` exiting zero may not mean a database accepts connections. A deployment controller accepting a manifest does not mean the rollout became healthy. An identity record being written does not mean credentials work at the target.

Record stage timestamps, actor type (`requester`, `automation`, or `provider_human`), channel, outcome, and reason. OpenTelemetry spans are one standards-based way to represent the operation and its nested stages.

## Calculate by Workflow

### Infrastructure

Start with intent or submission and end when the resource passes readiness checks. Count provider-side plan edits, approvals, remediation, and verification as human touches.

Guardrails:

- median and p90 request-to-ready time;
- failure and rollback rate;
- drift or policy exception rate;
- cost per ready resource; and
- support contacts per 100 attempts.

### Deployments

Define the eligible unit: production release, environment promotion, or deployment request. A fully automated pipeline triggered by a developer can be self-service. A release board or operator-run promotion is assisted.

Guardrails:

- successful rollout rate;
- queue and approval time;
- change fail rate;
- failed deployment recovery time; and
- emergency bypass frequency.

Do not count every pipeline job as a separate request when retries belong to one developer intent. Model an attempt under a stable journey ID.

### Access Requests

End at verified access, not approval. Policy-based entitlement within established guardrails can be touchless. Manager or data-owner review makes the decision assisted even if grant propagation is automatic.

Report at least:

```text
touchless decision-and-fulfillment rate
human-approved, automatically fulfilled rate
manually fulfilled rate
```

Guardrails include inappropriate grants, revocation latency, expired access still active, policy exceptions, and access-related incidents. A high self-service rate is not useful if least-privilege controls weaken.

## Example Calculation

In one month, an organization observes 500 eligible environment requests:

- 310 completed touchlessly;
- 70 completed after a human approval;
- 50 were manually fulfilled;
- 30 self-service attempts failed;
- 20 were abandoned; and
- 20 were still running at the cutoff.

The fulfillment rate uses successful completions:

```text
310 / (310 + 70 + 50) = 72.1%
```

If 360 terminal attempts entered the self-service path-310 successful, 30 failed, and 20 abandoned-the path success rate is:

```text
310 / 360 = 86.1%
```

The 20 running requests are reported but not yet in the terminal-attempt denominator. For long-running workflows, use a maturity window or survival analysis so recent requests do not make performance look better.

## Segment Before Acting

Break rates down by:

- capability and template version;
- business domain and risk tier;
- cloud, region, and environment;
- new versus experienced platform users;
- request complexity; and
- failure or assistance reason.

Always show the numerator, denominator, and sample size. A percentage can jump because demand changed, not because the platform improved.

Review the manual remainder. Rank reasons by volume and total waiting time. Automating a rare five-minute approval may matter less than fixing a common validation failure that causes hundreds of abandoned attempts.

## Avoid Misleading Variants

**Portal-submission rate** measures interface use, not fulfillment.

**Automation rate** can count an automated middle step surrounded by manual work.

**Ticket deflection** may improve because developers stopped asking; reconcile it with completed demand and surveys.

**Straight-through processing** is a useful synonym only when start, ready state, eligibility, and human-touch rules are explicit.

**One combined rate** across infrastructure, deployments, and access is usually meaningless. Their demand frequency and control requirements differ. Publish capability-level rates and aggregate only counts with a clearly stated weighting.

Self-service rate is valuable because it turns an architectural aspiration into observable behavior. Its integrity depends on measuring the entire request, including the work that occurs outside the portal.

## Official Documentation

- [Microsoft Learn: Self-service with guardrails](https://learn.microsoft.com/en-us/platform-engineering/about/self-service)
- [Microsoft Learn: Design a developer self-service foundation](https://learn.microsoft.com/en-us/platform-engineering/developer-self-service)
- [CNCF TAG App Delivery: Platforms White Paper](https://tag-app-delivery.cncf.io/whitepapers/platforms/)
- [OpenTelemetry Specification: Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)
