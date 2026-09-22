# How to Fix “Invalid Metric Type info” When Prometheus Scrapes a Micrometer OpenMetrics Endpoint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Micrometer, Java, Spring Boot, Monitoring

Description: Repair Micrometer info-type scrape failures by matching the response body, Content-Type, and negotiated Prometheus format.

---

An `invalid metric type "info"` error often means an OpenMetrics response reached a parser expecting the older Prometheus text format. The declaration itself can be correct. Before changing instrumentation, capture the HTTP response that Prometheus actually receives.

Micrometer's [1.13 migration guide](https://github.com/micrometer-metrics/micrometer/wiki/1.13-Migration-Guide#info-vs-gauge-type) explains a relevant change: gauges ending in `.info` use the Prometheus Java client's Info type. The family metadata changes while the queryable `_info` series name remains stable. A library upgrade can therefore reveal a pre-existing mistake in a custom endpoint or proxy.

## Identify which bytes and headers disagree

A valid OpenMetrics example is:

```text
# TYPE service_build info
# HELP service_build Build metadata.
service_build_info{version="4.2.0",revision="d52ab7e"} 1
# EOF
```

The family is `service_build`; `_info` belongs to its sample name. Do not mechanically rename the TYPE line to `service_build_info` or replace every occurrence of `info` with `gauge`.

Request both formats explicitly, saving headers separately:

```bash
curl -fsS -D openmetrics.headers -o openmetrics.body \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  https://app.example.com/actuator/prometheus

curl -fsS -D prometheus.headers -o prometheus.body \
  -H 'Accept: text/plain; version=0.0.4' \
  https://app.example.com/actuator/prometheus
```

The OpenMetrics response should advertise `application/openmetrics-text` with its version and end in `# EOF`. A classic text response must use the classic encoder and appropriate `text/plain` media type. An OpenMetrics body labeled `text/plain` is the mismatch to fix; changing only the response header in the opposite direction is equally unsafe.

Repeat the requests against the application directly, then through its ingress. A difference narrows the problem to response transformations, cached variants, or header forwarding. Compare the complete family rather than only its first TYPE line: other types, exemplars, and counter naming also differ between formats.

## Prefer the framework's negotiated endpoint

[Micrometer's Prometheus documentation](https://docs.micrometer.io/micrometer/reference/implementations/prometheus.html#_scrape_format) documents `scrape()` for default Prometheus text and an overload for OpenMetrics:

```java
String prometheusBody = registry.scrape();
String openMetricsBody = registry.scrape("application/openmetrics-text");
```

Those calls select serialization; they do not set an HTTP response header on an arbitrary controller. A custom controller must pair the chosen encoder with its matching Content-Type and implement Accept negotiation. Returning `registry.scrape("application/openmetrics-text")` from a method that advertises `text/plain` is a common way to create this failure.

Spring Boot's Prometheus Actuator endpoint already supports both formats. Enable and use that endpoint when possible instead of wrapping it in a controller that removes negotiation. Keep Micrometer versions aligned with Spring Boot's dependency management, because a registry implementation upgrade can require matching framework integration.

For a service that intentionally supports only classic text, call the classic serializer and let the library perform the representation conversion. Preserve the metric meaning and sample names instead of editing serialized output with a regular expression.

## Check Prometheus and intermediate collectors

Prometheus chooses a parser from the response media type. The [scrape protocol documentation](https://prometheus.io/docs/instrumenting/content_negotiation/) lists the protocol/media-type mappings. Inspect the target's last scrape error and the loaded scrape configuration, particularly any explicit `scrape_protocols` setting.

For a contemporary Prometheus deployment, a diagnostic job can prefer OpenMetrics while retaining classic fallback:

```yaml
scrape_configs:
  - job_name: app-info-diagnostic
    scrape_protocols:
      - OpenMetricsText1.0.0
      - PrometheusText0.0.4
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["app.internal:8080"]
```

Use the configuration reference for your installed Prometheus version. A fallback parser setting repairs missing or unusable media types only under its documented conditions; it does not reliably correct a valid but dishonest `text/plain` header.

If an agent sits between the application and Prometheus, verify that agent's input parser too. Prometheus accepting a captured payload does not prove the intermediary supports the same format.

## Verify the repair without changing dashboards

Confirm that `up{job="app-info-diagnostic"}` becomes `1`, the target reports no parse error, and `service_build_info` retains its expected labels. Compare normal counters and histograms as well, since a protocol change affects the whole response.

Finally, make the two explicit curl requests part of the endpoint's regression checks. Assert body/header agreement and parser acceptance for each supported representation. That catches this class of failure at the HTTP boundary before an otherwise harmless metadata change breaks monitoring.
