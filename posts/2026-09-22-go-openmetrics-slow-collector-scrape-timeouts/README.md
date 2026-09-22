# How to Bound Slow Go OpenMetrics Collectors After Scrape Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Prometheus, Monitoring, Troubleshooting

Description: Bound slow collector work, coalesce overlapping gathers, and limit outstanding scrapes without mistaking HTTP timeouts for cancellation.

An HTTP scrape timeout does not necessarily stop a Go collector. If collection takes thirty seconds while scrapers retry every five seconds, several abandoned gathers can remain active simultaneously. The endpoint looks unavailable while the exporter and its upstream dependencies become busier.

Address three separate limits: the upstream operation's deadline, concurrent gather execution, and outstanding requests. This example uses `client_golang` v1.24.1, which includes the experimental `CoalesceGather` option.

## Understand what the handler timeout actually bounds

`promhttp.HandlerOpts.Timeout` bounds the client-facing response and can return HTTP 503. It does not cancel `Gather` or the collectors running inside it. A collector implements `Collect(chan<- prometheus.Metric)` without receiving the incoming HTTP request's context. The [promhttp API documentation](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp#HandlerOpts) calls out this distinction explicitly.

Giving Prometheus a shorter `scrape_timeout` therefore does not solve abandoned work inside the exporter. Wrapping an unbounded collector operation in a goroutine and selecting on a timer is also insufficient: the goroutine can continue after its caller gives up.

## Put cancellation into the actual source operation

Create a module using Go 1.25 or newer:

```bash
go mod init example.com/bounded-exporter
go get github.com/prometheus/client_golang/prometheus/promhttp@v1.24.1
```

Save this as `main.go`. Its source endpoint is expected to return a JSON object such as `{"depth": 12}`:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

type queueCollector struct {
    url string
    client *http.Client
    depth *prometheus.Desc
}

func (c *queueCollector) Describe(ch chan<- *prometheus.Desc) {
    ch <- c.depth
}

func (c *queueCollector) Collect(ch chan<- prometheus.Metric) {
    ctx, cancel := context.WithTimeout(context.Background(), 1500*time.Millisecond)
    defer cancel()
    value, err := c.read(ctx)
    if err != nil {
        ch <- prometheus.NewInvalidMetric(c.depth, err)
        return
    }
    ch <- prometheus.MustNewConstMetric(c.depth, prometheus.GaugeValue, value)
}

func (c *queueCollector) read(ctx context.Context) (float64, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.url, nil)
    if err != nil { return 0, err }
    resp, err := c.client.Do(req)
    if err != nil { return 0, err }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return 0, fmt.Errorf("source returned %s", resp.Status)
    }
    raw, err := io.ReadAll(io.LimitReader(resp.Body, 4097))
    if err != nil { return 0, err }
    if len(raw) > 4096 { return 0, fmt.Errorf("source response too large") }
    var data struct { Depth *float64 `json:"depth"` }
    if err := json.Unmarshal(raw, &data); err != nil { return 0, err }
    if data.Depth == nil || *data.Depth < 0 {
        return 0, fmt.Errorf("invalid queue depth")
    }
    return *data.Depth, nil
}

func main() {
    registry := prometheus.NewRegistry()
    registry.MustRegister(&queueCollector{
        url: "http://127.0.0.1:8081/stats",
        client: &http.Client{Timeout: 1500*time.Millisecond},
        depth: prometheus.NewDesc("source_queue_depth", "Items queued", nil, nil),
    })
    handler := promhttp.HandlerFor(registry, promhttp.HandlerOpts{
        EnableOpenMetrics: true,
        CoalesceGather: true,
        MaxRequestsInFlight: 4,
        Timeout: 2*time.Second,
        ErrorLog: log.Default(),
    })
    mux := http.NewServeMux()
    mux.Handle("/metrics", handler)
    server := &http.Server{
        Addr: "127.0.0.1:9100", Handler: mux,
        ReadHeaderTimeout: 2*time.Second,
    }
    log.Fatal(server.ListenAndServe())
}
```

The context is attached to the outgoing request, including response-body reads. The source budget is shorter than the handler budget, leaving time to encode and return a meaningful error. With several sequential dependencies, share an overall deadline instead of giving each dependency the full scrape budget. See the Go [HTTP client](https://pkg.go.dev/net/http#Client) and [context timeout](https://pkg.go.dev/context#WithTimeout) contracts.

## Coalesce gathering and cap outstanding requests

With `CoalesceGather`, overlapping requests through this handler share one gather result. It is not a cache with a configured TTL, and it does not coordinate separately constructed handlers. Construct the handler once at startup.

`MaxRequestsInFlight` bounds admitted requests. Excess requests receive 503. A timed-out request retains its slot until the underlying gather finishes, so this option also bounds abandoned admitted requests. Coalescing keeps the shared gather count at one; it cannot rescue a permanently stuck collector. These details follow the [v1.24.1 handler implementation](https://github.com/prometheus/client_golang/blob/v1.24.1/prometheus/promhttp/http.go).

Keep `CoalesceGather` version-pinned because it is experimental. A custom transactional gatherer that modifies shared metric-family objects in place after `Gather` returns and before `done` is called is incompatible with the option. For slow sources that cannot support cancellation, isolate refresh work from scraping and expose an immutable cached snapshot with success and freshness metrics.

## Verify under deliberate slowness

First return a valid source response and request OpenMetrics with `Accept: application/openmetrics-text; version=1.0.0`. Expect the gauge and final `# EOF`.

Then delay the test source beyond 1.5 seconds and issue several concurrent scrapes. The source read should terminate, the scrape should fail, and outstanding work should drain. Temporarily shorten the handler timeout below the source timeout to reproduce a 503 while source work remains active, then confirm that work still ends at its own deadline. Restore the intended budget afterward.

Measure source calls and goroutine counts during repeated waves. A bounded plateau followed by recovery demonstrates that the limit works; a steady increase indicates another unbounded operation, a handler being recreated per request, or separate handlers bypassing the same coalescing state.
