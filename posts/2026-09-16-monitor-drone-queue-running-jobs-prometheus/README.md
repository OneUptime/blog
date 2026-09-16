# How to Monitor Drone Queue Depth and Running Jobs with the Built-In Prometheus Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Prometheus, Monitoring, CI/CD, Observability

Description: Monitor Drone pending and running jobs with authenticated Prometheus scraping, accurate build-versus-pipeline interpretation, and actionable queue alerts.

A growing Drone queue can mean insufficient runner capacity, mismatched runner labels, or an intentional deployment concurrency limit. The built-in metrics show where to start, but they do not identify the cause on their own.

Begin by separating a build from its jobs. One webhook-triggered build can contain multiple pipelines, and Drone counts those pipelines as jobs in its server metrics. A build with three pipelines can therefore contribute one pending build and several pending jobs.

## Scrape the authenticated endpoint

Drone exposes its metrics at `/metrics`. Its [metrics documentation](https://docs.drone.io/server/metrics/) describes creating an administrative machine user for scraping. Provision that account through an administrator, store the resulting bearer token in your secret manager, and treat it as an administrative credential. Restrict who can read it and which networks can reach the server.

Mount a token file readable by the Prometheus process and use HTTPS:

```yaml
scrape_configs:
  - job_name: drone
    scheme: https
    metrics_path: /metrics
    scrape_interval: 30s
    scrape_timeout: 10s
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/secrets/drone-token
    static_configs:
      - targets: ['drone.example.com']
```

This uses Prometheus's [HTTP authorization configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/). Replace the hostname and mount the file into the scraper's filesystem. For a private certificate authority, configure the corresponding CA trust. A successful HTTP connection with an untrusted certificate is not a reason to turn off verification.

Inspect the target's scrape status. Authentication failures, HTML returned by a login proxy, and an incorrect metrics route should be fixed before writing queue alerts. Confirm that the sample labels include the expected `job` and `instance` values.

## Graph jobs and builds separately

The principal instantaneous measurements are:

```promql
drone_pending_jobs{job="drone"}
drone_running_jobs{job="drone"}
drone_pending_builds{job="drone"}
drone_running_builds{job="drone"}
```

These describe current populations. Do not use `rate()` on pending jobs as though it were a cumulative event counter. A falling queue can mean jobs started, builds were canceled, or records were cleaned up; it is not necessarily completed throughput.

Create one dashboard row for jobs and another for builds. Add `up{job="drone"}` alongside them. A queue graph with no samples during a failed scrape is unknown, not zero. Keep the dashboard label selection consistent with the alert rules.

For multiple Drone installations, retain an installation label. When multiple replicas expose the same shared database state, blindly summing their counts can multiply the apparent backlog. Verify the behavior of your installed HA implementation and choose one authoritative scrape or a documented deduplication strategy. Independent installations should remain separate until an intentional aggregate is needed.

## Alert on a sustained condition

Start with an alert that exposes both backlog and loss of visibility:

```yaml
groups:
  - name: drone-queue
    rules:
      - alert: DroneQueueGrowing
        expr: drone_pending_jobs{job="drone"} > 10
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: Drone has a sustained job backlog
      - alert: DroneMetricsUnavailable
        expr: up{job="drone"} == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Prometheus cannot scrape Drone
```

The threshold is an example. A ten-job burst may be routine for one team and unacceptable for another. Choose duration and backlog based on the delay users can tolerate. Prometheus documents how [`for` delays firing](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/); it should absorb ordinary bursts without concealing an outage.

An `up == 0` rule detects failing configured targets. If service discovery removes a target entirely, that series can disappear; handle expected-target absence separately with inventory-aware rules or an appropriate `absent()` expression.

## Turn the alert into a diagnosis

A high pending count with few running jobs suggests unavailable runners, routing mismatches, a paused queue, or concurrency gates. High pending and high running counts more often justify inspecting execution duration and capacity. Neither pattern proves its cause.

Open representative pending builds and compare their pipeline type, platform, labels, dependencies, and creation time with available runners. Separate deployment queues from test queues: increasing global capacity will not bypass a deliberate one-at-a-time production gate.

The server metric set does not provide a per-label runner-capacity breakdown or a queue-wait histogram. Do not invent metric names for those views. If queue age is your service objective, collect creation and start timestamps from supported build APIs or an explicitly maintained exporter, with bounded label cardinality. Never attach arbitrary commit SHAs or build numbers to every Prometheus time series.

Finally, trigger a small canary build and observe pending-to-running-to-complete behavior. Keep that verification distinct from a production load test. The dashboard is useful when an operator can move from its signal to one concrete stalled pipeline and explain why it is waiting.
