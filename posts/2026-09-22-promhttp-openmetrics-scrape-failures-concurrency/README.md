# How to Monitor OpenMetrics Scrape Failures and Concurrent Requests with promhttp

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Prometheus, Monitoring, Observability

Description: Instrument promhttp status codes, collection errors, and concurrent scrapes with an independent diagnostics endpoint that survives collector failures.

Prometheus's `up` metric tells you whether a scrape succeeded. An exporter also needs to explain what happened inside its HTTP handler: how many requests arrived, whether scrapes overlapped, and whether gathering or encoding failed.

The Go client provides these measurements, but the helpers serve different purposes. `HandlerFor` does not automatically instrument its requests. Wrap it with `InstrumentMetricHandler`, and set `HandlerOpts.Registry` to record internal handler errors.

## Keep diagnostics reachable when business collection fails

If diagnostics share a registry with a broken custom collector, every scrape can fail before Prometheus stores those diagnostics. A separate registry and endpoint lets you observe failures continuously.

The following complete example targets `client_golang` v1.24.1 and Go 1.25 or newer:

```bash
go mod init example.com/instrumented-exporter
go get github.com/prometheus/client_golang/prometheus/promhttp@v1.24.1
```

Save `main.go`:

```go
package main

import (
    "log"
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
    business := prometheus.NewRegistry()
    diagnostics := prometheus.NewRegistry()

    ready := prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "warehouse_ready", Help: "Warehouse is ready",
    })
    business.MustRegister(ready)
    ready.Set(1)

    scrapeHandler := promhttp.HandlerFor(business, promhttp.HandlerOpts{
        EnableOpenMetrics: true,
        ErrorHandling: promhttp.HTTPErrorOnError,
        ErrorLog: log.Default(),
        Registry: diagnostics,
        MaxRequestsInFlight: 4,
        CoalesceGather: true,
        Timeout: 3*time.Second,
    })
    scrapeHandler = promhttp.InstrumentMetricHandler(diagnostics, scrapeHandler)

    mux := http.NewServeMux()
    mux.Handle("/metrics", scrapeHandler)
    mux.Handle("/metrics/diagnostics", promhttp.HandlerFor(
        diagnostics, promhttp.HandlerOpts{EnableOpenMetrics: true},
    ))
    server := &http.Server{
        Addr: "127.0.0.1:9100", Handler: mux,
        ReadHeaderTimeout: 2*time.Second,
    }
    log.Fatal(server.ListenAndServe())
}
```

Register real source collectors in `business`. Keep diagnostics limited to inexpensive, in-memory measurements. This separation does not protect against a process crash or exhausted host resources, but it removes a broken business gatherer from the diagnostic request path.

## Understand the three signals

| Metric | Meaning |
|---|---|
| `promhttp_metric_handler_requests_total{code="..."}` | Completed requests through the instrumented business handler |
| `promhttp_metric_handler_requests_in_flight` | Requests currently inside that wrapper |
| `promhttp_metric_handler_errors_total{cause="..."}` | Internal gathering or encoding errors recorded by `HandlerOpts.Registry` |

The request counter is incremented after the response completes. A scrape cannot include its own final status in its response. The in-flight gauge counts the request exposing it when instrumentation and exposition share an endpoint; in this design, the uninstrumented diagnostics request observes only business scrapes. [InstrumentMetricHandler reference](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp#InstrumentMetricHandler)

Internal error counts are different from HTTP failure counts. Encoding can fail after a 200 status was sent, and `ContinueOnError` can return partial results with a successful status. Timeout and concurrency-limit 503s are not necessarily gather errors. Inspect both categories and the error log. The behavior is visible in the [handler source](https://github.com/prometheus/client_golang/blob/v1.24.1/prometheus/promhttp/http.go).

An HTTP timeout can finish the outer instrumented request while collection continues underneath. Consequently, the in-flight gauge is not a count of collector goroutines. Use source deadlines and gather coalescing to control that work, then track source-specific collection duration if you need deeper visibility.

## Configure two scrape jobs

For a Prometheus process on the same host:

```yaml
scrape_configs:
  - job_name: warehouse
    scrape_interval: 15s
    scrape_timeout: 5s
    static_configs:
      - targets: ['127.0.0.1:9100']
  - job_name: warehouse-diagnostics
    metrics_path: /metrics/diagnostics
    scrape_interval: 15s
    static_configs:
      - targets: ['127.0.0.1:9100']
```

Diagnose completed failures with:

```promql
sum by (instance, code) (
  rate(promhttp_metric_handler_requests_total{
    job="warehouse-diagnostics",code=~"5.."
  }[5m])
)
```

Check internal errors separately:

```promql
sum by (instance, cause) (
  increase(promhttp_metric_handler_errors_total{
    job="warehouse-diagnostics"
  }[5m])
)
```

Also alert on `up{job="warehouse"} == 0` and `up{job="warehouse-diagnostics"} == 0`. A high request count is not inherently a problem: multiple Prometheus replicas and manual scrapes all contribute. Use Prometheus's `scrape_duration_seconds` to compare observed scrape latency against the configured budget. [Jobs and automatically generated scrape series](https://prometheus.io/docs/concepts/jobs_instances/)

## Exercise failures before relying on the dashboard

Scrape `/metrics` twice and confirm the diagnostics request counter advances by two. Request OpenMetrics explicitly to check content negotiation. In a test build, register a collector that returns `NewInvalidMetric`; business scraping should fail while diagnostics remains readable and shows the error. Finally, test concurrent delayed requests and confirm that overload produces 503 responses without preventing diagnostics from responding.

Do not enable `ContinueOnError` merely to keep the dashboard green. Use it only when partial business results are intentional and an error alert makes that incompleteness visible.
