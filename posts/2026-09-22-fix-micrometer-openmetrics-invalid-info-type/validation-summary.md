# Validation Summary: How to Fix Micrometer OpenMetrics 'Invalid Metric Type info' in Prometheus

## Status

validated

## Post Type

Technical troubleshooting guide.

## Technologies Covered

- Prometheus scrape configuration, text exposition, and PromQL
- OpenMetrics 1.0 and HTTP content negotiation
- Micrometer Prometheus registry and Prometheus Java client
- Java and Spring Boot Actuator
- curl, ingress proxies, and intermediate metric collectors

## Sources Consulted

- [Micrometer 1.13 migration guide](https://github.com/micrometer-metrics/micrometer/wiki/1.13-Migration-Guide#info-vs-gauge-type): Info conversion, series naming, and framework compatibility.
- [Micrometer Prometheus documentation](https://docs.micrometer.io/micrometer/reference/implementations/prometheus.html#_scrape_format): scrape APIs, default serialization, and OpenMetrics support.
- [Spring Boot Prometheus Actuator endpoint](https://docs.spring.io/spring-boot/api/rest/actuator/prometheus.html): endpoint path and Accept-based format selection.
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/): Info family and sample naming, sample value, metadata, and EOF marker.
- [Prometheus exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/): classic text syntax and supported metric types.
- [Prometheus scrape protocol content negotiation](https://prometheus.io/docs/instrumenting/content_negotiation/): protocol names, media types, versions, and preference ordering.
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/): scrape_protocols, fallback_scrape_protocol, metrics_path, and static_configs.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/): job labels and the up series.
- [curl manual](https://curl.se/docs/manpage.html): fail, silent, show-error, dump-header, output, and header options.

## Issues Found

No technical issues found.

## Review Notes

- The OpenMetrics example correctly uses service_build as the family name, service_build_info as the sample name, a value of 1, and a terminating EOF marker. Classic Prometheus text does not accept info as a metric type.
- The Micrometer 1.13 behavior described applies to micrometer-registry-prometheus using the newer Prometheus Java client. The migration guide confirms both the stable Info series name and the need for compatible Spring Boot integration.
- Both Java statements match the documented PrometheusMeterRegistry API and assume an existing registry instance. Serialization alone does not configure HTTP response headers.
- The curl commands correctly request separate representations and save response headers and bodies separately. The URLs and target hostname are illustrative deployment placeholders; no live application was supplied for end-to-end scraping.
- The YAML uses documented, case-sensitive protocol identifiers and valid scrape configuration fields. Its classic fallback means a lower-priority negotiated representation, not a retry after an OpenMetrics parse failure. The separate fallback parser discussion correctly limits its use to missing or unusable Content-Type values.
- Spring Boot documents both classic text and OpenMetrics responses for the Actuator endpoint. Endpoint exposure and authentication remain deployment-specific.
- The linked technical documentation resolved to the intended resources. The README required no changes. Validation was based on official documentation and static review; no Java application or Prometheus integration test was run.
