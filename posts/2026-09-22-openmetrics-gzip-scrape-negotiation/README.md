# How to Serve OpenMetrics with Gzip Compression Without Breaking Scrape Negotiation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Go, HTTP, Monitoring

Description: Serve compressed OpenMetrics with independent media-type and content-encoding negotiation, then verify raw and decoded responses.

---

Gzip changes the encoding of an HTTP response body. It does not change the metrics format inside that body. A compressed OpenMetrics response still needs an OpenMetrics Content-Type, a matching gzip Content-Encoding, and a complete payload after decompression.

Treat `Accept` and `Accept-Encoding` independently. The first selects the metrics representation; the second selects transport compression. Combining those decisions in one ad hoc header check is a common source of scrape failures.

## Let the metrics handler negotiate compression

The Go client's [promhttp handler](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp) supports compression negotiation. With a current client library, this complete example offers gzip and uncompressed responses while enabling OpenMetrics:

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
    depth := prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "worker_queue_depth",
        Help: "Jobs currently waiting.",
    })
    registry.MustRegister(depth)
    depth.Set(7)

    metrics := promhttp.HandlerFor(registry, promhttp.HandlerOpts{
        EnableOpenMetrics: true,
        OfferedCompressions: []promhttp.Compression{
            promhttp.Gzip, promhttp.Identity,
        },
    })
    http.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Cache-Control", "no-store")
        w.Header().Add("Vary", "Accept")
        w.Header().Add("Vary", "Accept-Encoding")
        metrics.ServeHTTP(w, r)
    })
    log.Fatal(http.ListenAndServe("127.0.0.1:8000", nil))
}
```

Pin the client dependency in your Go module. `OfferedCompressions` is a library-version-dependent option; older versions can still negotiate gzip through their documented defaults. Do not add a second gzip wrapper without understanding whether the underlying metrics handler already compresses responses.

The wrapper sets cache policy while leaving Content-Type and Content-Encoding to the metrics handler. That preserves the relationship between the selected encoder and the bytes it writes.

## Inspect the actual compressed bytes

Capture a gzip response without curl's automatic decompression:

```bash
curl -fsS -D gzip.headers -o metrics.gz \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  -H 'Accept-Encoding: gzip' \
  http://127.0.0.1:8000/metrics

gzip -t metrics.gz
gzip -dc metrics.gz > metrics.om
```

The headers should describe OpenMetrics and include `Content-Encoding: gzip`. The decompressed file should contain the gauge and finish with `# EOF`.

For a convenient decoded inspection, curl can perform decompression itself:

```bash
curl -fsS --compressed \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  http://127.0.0.1:8000/metrics
```

Do not run `gzip -d` on output that curl already decompressed. Seeing plain text together with a saved gzip header can be normal when the HTTP client transparently decoded the body.

## Test format and compression as separate axes

The [Prometheus negotiation specification](https://prometheus.io/docs/instrumenting/content_negotiation/) describes the protocol and transport headers. Verify four combinations: OpenMetrics with gzip, OpenMetrics with identity, classic text with gzip, and classic text with identity.

For a registry whose values are fixed, decoded gzip and identity responses for the same media type should agree. For live metrics, compare parsing success, metric identity, and expected changing values rather than requiring byte-for-byte equality between different scrapes.

Also test `Accept-Encoding: gzip;q=0, identity;q=1`. The endpoint must respect an explicit refusal of gzip. A proxy that always compresses because the substring `gzip` appears in the request will fail this case.

## Check proxies and response completion

Run the same matrix through the deployed ingress. If the application works directly but fails through the proxy, inspect whether the proxy strips Content-Encoding, decompresses without updating headers, or compresses an already compressed response without representing both encodings correctly.

Do not retain an uncompressed Content-Length after compression. Let the server determine framing or the compressed length. Ensure the compressor closes cleanly so its final bytes are written; a truncated gzip stream can fail before an OpenMetrics parser even reaches the EOF marker.

Finally, monitor target health and scrape duration after enabling compression. Prometheus's [scrape configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config) includes compression control, while body-size limits apply to the uncompressed response. Gzip reduces transferred bytes; it does not bypass a configured decoded-body limit or eliminate exporter CPU cost. Keep the response valid first, then measure whether compression improves your actual scrape path.
