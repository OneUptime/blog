# How to Negotiate HTTP OpenMetrics and Prometheus Text Formats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, HTTP, Monitoring, Observability

Description: Implement a metrics endpoint that negotiates OpenMetrics and Prometheus text correctly, then verify each format with explicit Accept headers.

---

A metrics endpoint may serve Prometheus, a diagnostic script, and an older monitoring agent. These consumers can support different exposition formats. HTTP negotiation lets one URL select an appropriate representation while keeping the collected metrics consistent.

The two headers have different jobs: `Accept` describes the requester's preferences; `Content-Type` identifies the representation actually returned. The [Prometheus negotiation specification](https://prometheus.io/docs/instrumenting/content_negotiation/) documents the protocol media types, version parameters, quality weights, and name-escaping parameters used during scrapes.

## Use one registry and two encoders

Do not maintain separate counters for each format. Collect once into a metric registry, then let the selected encoder serialize the same logical metrics. Otherwise, content negotiation can produce different observations simply because one code path updates its own counter.

The Go client provides this behavior through [`promhttp.HandlerFor`](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp). Enable OpenMetrics support while preserving the traditional Prometheus text representation:

```go
package main

import (
    "log"
    "net/http"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
    registry := prometheus.NewRegistry()
    jobs := prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "worker_jobs_total",
            Help: "Jobs completed since worker startup.",
        },
        []string{"result"},
    )
    registry.MustRegister(jobs)
    jobs.WithLabelValues("success").Add(12)
    jobs.WithLabelValues("failure").Add(2)

    handler := promhttp.HandlerFor(registry, promhttp.HandlerOpts{
        EnableOpenMetrics: true,
    })
    http.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Add("Vary", "Accept")
        w.Header().Set("Cache-Control", "no-store")
        handler.ServeHTTP(w, r)
    })
    log.Fatal(http.ListenAndServe("127.0.0.1:8000", nil))
}
```

Use a pinned client-library version in your module. The handler's documented `EnableOpenMetrics` option enables negotiation; it does not require every response to use OpenMetrics. Let the library set the response media type, including parameters appropriate to the negotiated format.

`Vary: Accept` identifies representation selection to HTTP caches. Metrics should normally bypass caching because an otherwise correct cached response can make a service appear frozen. If a proxy compresses responses, it also needs correct handling of `Accept-Encoding` and `Content-Encoding`.

## Exercise both representations

Request OpenMetrics explicitly and save headers separately from the body:

```bash
curl -sS --fail-with-body -D om.headers \
  -H 'Accept: application/openmetrics-text;version=1.0.0' \
  http://127.0.0.1:8000/metrics -o metrics.om

curl -sS --fail-with-body -D prom.headers \
  -H 'Accept: text/plain;version=0.0.4' \
  http://127.0.0.1:8000/metrics -o metrics.prom
```

Expect OpenMetrics metadata to describe the counter family without `_total`, followed by a `_total` sample and the final `# EOF`. The traditional text response uses its own metadata conventions and does not require OpenMetrics' EOF marker. These differences follow the [exposition-format documentation](https://prometheus.io/docs/instrumenting/exposition_formats/) and the [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/).

Compare parsed metric names, label sets, and values instead of comparing entire response files byte for byte. Legitimate metadata differences are part of the protocol change.

## Test the negotiation boundary

Add requests that represent realistic compatibility cases:

| Request | What to verify |
| --- | --- |
| OpenMetrics preferred, text allowed at lower quality | A supported preferred representation wins. |
| Text preferred, OpenMetrics lower quality | The preference affects the returned representation. |
| OpenMetrics with `q=0` and acceptable text | An explicitly excluded representation is not selected. |
| No `Accept` header | The endpoint has a documented default. |
| An unsupported format only | The deployed handler's fallback behavior is understood. |
| Prometheus 3 header with `escaping` parameters | Parameters do not accidentally trigger framework rejection. |

For a custom implementation, avoid a substring check such as `"openmetrics" in accept`. It ignores weights, explicit exclusions, versions, and wildcards. Parse media ranges with a maintained HTTP parser, match parameters against the encoder's actual capabilities, and test the chosen library's behavior with your supported client matrix.

Prometheus documents a text fallback for unsupported negotiation cases, so do not automatically impose a generic API framework's `406 Not Acceptable` behavior on a metrics route. The resulting response must still tell the truth about its body.

## Verify the deployed path

Run the same requests through ingress, authentication middleware, and any service mesh. Check for duplicate or rewritten `Content-Type` headers and HTML error pages that happen to carry status 200. Then inspect Prometheus target health and a known counter series across a canary deployment.

Keep the old representation available until every required consumer has passed the format-specific checks. A successful OpenMetrics request alone cannot prove that an older scraper still works.
