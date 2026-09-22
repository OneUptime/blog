# How to Dual-Serve OpenMetrics 1.0 and Experimental 2.0 During an Exporter Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, HTTP

Description: Plan an opt-in OpenMetrics 2.0 exporter canary while keeping validated OpenMetrics 1.0 negotiation and production scraping intact.

---

Dual-serving OpenMetrics versions requires two serializers and a deliberate negotiation policy. Changing `version=1.0.0` to `version=2.0.0` in the response header does not migrate an endpoint.

As of September 22, 2026, the published [OpenMetrics 2.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec_2_0/) is experimental, version `2.0.0-rc0`. The current [Prometheus scrape configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config) does not list an `OpenMetricsText2.0.0` protocol. Treat the following as an exporter migration and experimental consumer workflow, not a claim that a released Prometheus server can scrape version 2.0.

## Establish the support matrix first

Record the exporter library version, enabled serializers, scraper binary version, and any feature flags. For the experimental path, record the exact parser build or source revision that implements the draft. A specification describes the contract; it does not install an implementation.

Keep production scraping on a known supported representation. Do not add an invented `scrape_protocols` value to Prometheus configuration. If no compatible 2.0 parser exists in your toolchain, complete the 1.0 migration and keep 2.0 testing at the serializer-fixture stage.

A useful acceptance matrix is:

| Consumer request | Exporter behavior |
| --- | --- |
| OpenMetrics 1.0 explicitly requested | Serialize OpenMetrics 1.0 |
| OpenMetrics 2.0 explicitly requested and supported | Serialize with the tested experimental 2.0 encoder |
| No newer version requested | Default to 1.0 for the OpenMetrics path |
| Only unsupported representations acceptable | Apply the documented negotiation failure policy |

The [official client-library migration guide](https://prometheus.io/docs/guides/open_metrics_2_0_migration/) requires the older default unless the consumer requests the newer format. Respect HTTP quality values and `q=0` exclusions; a substring search for `2.0.0` is not content negotiation.

## Share measurements, not serialized text

Collect one internal snapshot and feed it to two version-specific encoders. Keep counter values, units, timestamps, and metadata in structured objects. Avoid passing version 1.0 text through string replacements: composite measurements and naming rules change too substantially.

For example, the same cumulative request total can use this 1.0 representation:

```text
# TYPE checkout_requests counter
checkout_requests_total{method="POST"} 108
# EOF
```

The experimental 2.0 representation associates the sample with an identically named family:

```text
# TYPE checkout_requests_total counter
checkout_requests_total{method="POST"} 108
# EOF
```

Serve the corresponding response header:

```text
application/openmetrics-text; version=1.0.0; charset=utf-8
```

or:

```text
application/openmetrics-text; version=2.0.0; charset=utf-8
```

That simple counter is intentionally a small fixture. Histograms, summaries, created timestamps, and exemplars need separate tests against the draft. Do not extrapolate a passing counter fixture into full format support. Keep any separate `/metrics-experimental` route explicitly gated and require the 2.0 request there as well.

## Exercise both paths over HTTP

Use the real negotiation handler rather than invoking only an encoder function:

```bash
curl --fail-with-body -sS -D om1.headers \
  -H 'Accept: application/openmetrics-text;version=1.0.0' \
  http://localhost:9108/metrics -o om1.txt

curl --fail-with-body -sS -D om2.headers \
  -H 'Accept: application/openmetrics-text;version=2.0.0' \
  http://localhost:9108/metrics -o om2.txt
```

Parse each body with its corresponding parser. Check complete-document validation, final EOF handling, and agreement between the response header and the accepted grammar. Test an unsupported version, an absent Accept header, and requests with different preference weights.

If a cache sits in front of the exporter, ensure negotiated representations cannot be mixed; `Vary: Accept` communicates that the response depends on this header. The [Prometheus negotiation specification](https://prometheus.io/docs/instrumenting/content_negotiation/) provides the broader model for matching supported protocols and content types.

## Compare behavior before expanding the canary

Compare semantic values, not line counts. Version 2.0 can represent composite measurements differently, so fewer lines need not mean lost observations. Check names, label identity, observation count, sum, and distribution behavior with controlled fixtures.

Keep the production consumer on 1.0 while the experimental consumer writes to isolated test storage. Two consumers feeding the same destination can create duplicate collection or misleading comparisons.

Rollback should disable only experimental exposure and restore the tested negotiation policy. Promote broader support only after a released or deliberately pinned experimental consumer accepts the format and the full workload passes compatibility checks. Retest whenever the draft, encoder, or consumer revision changes.
