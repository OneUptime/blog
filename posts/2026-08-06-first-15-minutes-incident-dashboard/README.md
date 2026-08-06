# Build a First-15-Minutes Incident Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Dashboard, SRE, OpenTelemetry, Observability, Monitoring

Description: Design an incident landing dashboard that establishes impact, change context, dependency health, and useful drill-downs quickly.

---

The first incident dashboard should help a responder make good decisions, not display every metric a service exports. In the first 15 minutes, the responder needs to establish user impact, scope, direction, likely change correlation, dependency involvement, and the safest next action.

Design that workflow before choosing panels. A dashboard that is excellent for capacity analysis can still be poor for emergency triage.

## Define the Questions in Order

The landing view should answer these questions without requiring a new query:

1. **Is there real user impact?**
2. **Which journeys, regions, tenants, or operations are affected?**
3. **When did impact begin, and is it improving or worsening?**
4. **What changed near that time?**
5. **Are direct dependencies failing or slow?**
6. **Is the service saturated, unavailable, or deliberately degraded?**
7. **Where can the responder inspect representative failures?**
8. **Which mitigation is safe, and who owns the next escalation?**

Root cause is not required before mitigation. Keep the landing page oriented around impact and decisions, with links into deeper diagnostics.

## Row 1: User Impact and Alert Context

Place the service SLIs first. Google SRE recommends putting SLI metrics prominently on the service dashboard. Show at least:

- availability or success ratio against the relevant SLO;
- latency distribution for the user journey;
- traffic or demand, so a good ratio over near-zero traffic is not mistaken for health;
- correctness or freshness where success status alone is insufficient;
- current error-budget burn or other paging condition;
- firing alert value, threshold, window, and start time.

Break down impact using bounded, operationally meaningful dimensions such as region, operation, response class, client type, or release track. Do not add user IDs, trace IDs, or other unbounded values as metric labels.

An illustrative Prometheus query for a server-error ratio is:

```promql
sum(rate(app_request_total{
  service="checkout-api",
  outcome="server_error"
}[5m]))
/
sum(rate(app_request_total{
  service="checkout-api"
}[5m]))
```

The metric names and `5m` window are examples, not OpenTelemetry semantic convention names or universal alert settings. Use the same validated SLI definition that drives the service objective so the dashboard and page do not disagree.

## Row 2: Scope and Timeline

Show the same impact signals split by a few useful dimensions:

| View | What it distinguishes |
| --- | --- |
| Region or zone | localized infrastructure or dependency failure |
| API operation or journey | one broken capability versus whole-service failure |
| Stable versus canary revision | release-attributable regression |
| Response class | server failure, throttling, client error, or timeout |
| Priority or workload class | interactive impact versus background backlog |

Display an absolute event start timestamp and consistent time range across panels. Include a timezone indicator. During an incident, changing panel windows independently can create false correlations.

Make missing data visible. `No data`, `zero traffic`, and `zero errors` are different states.

## Row 3: Recent Intended Changes

Google SRE recommends monitoring binary version, command-line flags, and dynamic configuration version because intended changes are common incident triggers.

Overlay or list:

- application and infrastructure deployments;
- configuration and feature-flag changes;
- schema migrations and backfills;
- autoscaling or capacity changes;
- certificate, DNS, routing, and policy changes;
- dependency releases when available.

Every change marker should link to an immutable revision, actor, start and completion time, rollout scope, and rollback or owner record. A marker saying only `deployment` wastes the correlation opportunity.

Prefer a finite `revision` or `track` label for aggregate metrics. Keep commit hashes, change IDs, and full event detail in deployment events or logs if their cardinality is unbounded.

## Row 4: Direct Dependency Health

Even when the service did not change, a dependency may have. For every critical direct dependency, show client-observed:

- request rate;
- latency distribution;
- errors by stable category;
- timeout and cancellation rate;
- retry attempt rate;
- circuit-breaker or load-shed rejections;
- queue age or connection-pool pressure where applicable.

Client-side telemetry answers whether *this service* is receiving useful responses. A dependency's own green dashboard does not prove that network path, credentials, quota, method, or tenant is healthy for your caller.

Order dependencies by critical user journey rather than alphabetically. Link each row to the dependency owner, status dashboard, and escalation path.

## Row 5: Saturation and Degraded State

Show resources that explain loss of useful work:

- CPU throttling and utilization;
- memory working set, limit, and restarts;
- active requests, workers, threads, or goroutines;
- connection-pool use and wait time;
- queue depth and oldest-item age;
- disk, file descriptor, or quota headroom;
- replica count, ready capacity, and autoscaler limits.

Also show operational modes as first-class state:

```text
read-only mode: off
optional recommendations: disabled since 14:07 UTC
load shedding: active for low-priority requests
checkout canary traffic: 0 percent
configuration version: cfg-1847
```

An active mitigation changes how metrics should be interpreted. Hiding it in a flag console forces responders to rediscover current behavior.

## Row 6: Logs and Traces as Drill-Downs

Metrics establish scale and direction; representative logs and traces help explain individual failures. Provide prepared links that inherit dashboard time, service, environment, region, operation, and revision.

OpenTelemetry LogRecords can carry `TraceId`, `SpanId`, and Resource attributes. Consistent Resource identity allows logs, metrics, and traces from the same service instance to be correlated in a backend. Use that correlation to provide:

- sampled traces for failed and slow journeys;
- structured errors grouped by stable error type;
- logs around a selected trace or deployment revision;
- exemplars from a latency or error histogram when supported.

Do not put secrets, credentials, raw payment data, or unnecessary personal data into telemetry. A fast incident link must still respect access control and retention policy.

Avoid embedding an enormous live log stream on the landing page. It is noisy, expensive, and easy to anchor on one dramatic but rare error. Show grouped counts and curated examples, then link to search.

## Include an Incident Control Strip

Keep these controls visible at the top or side:

- service owner and current on-call;
- runbook and architecture map;
- incident channel and status record;
- current incident commander, if declared;
- last dashboard refresh and data delay;
- safe rollback, kill-switch, or traffic-shift procedure;
- dependency escalation directory;
- dashboard source revision and owner.

Links should work with responder access. Test them from a clean on-call account, not only from the dashboard author's privileged session.

## Keep the Landing Page Small

Use progressive disclosure:

```text
service landing page
  -> user journey detail
  -> dependency detail
  -> infrastructure detail
  -> logs and traces
  -> release and configuration history
  -> capacity and long-term trends
```

The landing page should load quickly during the likely failure domain. Avoid making it depend on the service it monitors for authentication, rendering, or data proxying where feasible. Monitor the monitoring path itself.

## Treat Dashboard Configuration as Code

Review dashboard changes alongside service changes. Give each panel:

- a decision it supports;
- query owner;
- unit and clear legend;
- documented missing-data behavior;
- sensible default time range;
- bounded labels and cost expectation;
- test or screenshot fixture where tooling permits.

Google SRE recommends treating monitoring configuration as code and using consistent basic coverage across services. Standardize the first rows so responders moving between teams do not relearn navigation during an outage, while allowing service-specific correctness and dependency panels below them.

## Run a Timed Game Day

Give a responder only the page and normal on-call access. Inject one realistic failure and record whether they can, within the team's chosen objective:

1. state the user impact and affected scope;
2. identify when it began;
3. find or rule out a recent change;
4. identify the failing dependency or saturated resource;
5. open a representative trace or structured error;
6. choose a documented mitigation or escalation;
7. verify whether the mitigation improves the SLI.

The 15-minute phrase in this article is a design target, not a Google SRE requirement. Set a target that matches incident severity and response objectives. Turn every failed navigation, missing split, broken link, and ambiguous panel into owned work.

## Readiness Checklist

```yaml
incident_dashboard_gate:
  sli_definitions_match_alerts: true
  no_data_state_tested: true
  recent_changes_visible: true
  direct_dependencies_covered: true
  degraded_modes_visible: true
  log_trace_links_preserve_context: true
  normal_responder_access_tested: true
  timed_game_day_passed: true
  owner: team-checkout
  last_drilled: 2026-08-03
```

This schema is example team policy. Attach the alert, dashboard revision, and game-day record so that `true` remains evidence rather than assertion.

## Official Documentation

- [Google SRE Workbook: Monitoring](https://sre.google/workbook/monitoring/) covers SLI-first dashboards, intended changes, direct dependency metrics, saturation, structured logs, and monitoring configuration as code.
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) introduces the four golden signals and recommends dashboards that answer basic service questions.
- [OpenTelemetry Logs specification](https://opentelemetry.io/docs/specs/otel/logs/) documents log correlation through trace context and Resource identity.
- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/) explains correlation of traces and logs using propagated Trace ID and Span ID context.

## Conclusion

A first-15-minutes dashboard is an incident workflow, not a wall of graphs. Lead with shared SLI definitions, make scope and missing data explicit, surface changes and direct dependencies, show active mitigations, and preserve context into logs and traces. Then time a responder using normal access and improve every point of hesitation.
