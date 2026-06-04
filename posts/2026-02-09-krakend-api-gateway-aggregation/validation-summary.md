# Validation Summary: How to Deploy KrakenD API Gateway for High-Performance API Aggregation

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- KrakenD API Gateway
- KrakenD JSON configuration
- Docker
- Kubernetes Deployments, Services, and ConfigMaps
- Rate limiting
- HTTP caching
- Circuit breakers
- KrakenD telemetry, extended metrics, OpenCensus, and Prometheus

## Sources Consulted
- KrakenD v2.5 Docker deployment documentation: https://www.krakend.io/docs/v2.5/deploying/docker/
- KrakenD v2.5 endpoint configuration documentation and schema: https://www.krakend.io/docs/v2.5/endpoints/ and https://www.krakend.io/schema/v2.5/endpoint.json
- KrakenD v2.5 backend configuration documentation and schema: https://www.krakend.io/docs/v2.5/backends/ and https://www.krakend.io/schema/v2.5/backend.json
- KrakenD v2.5 API composition and response manipulation documentation: https://www.krakend.io/docs/v2.5/endpoints/response-manipulation/
- KrakenD v2.5 router rate limiting documentation: https://www.krakend.io/docs/v2.5/endpoints/rate-limit/
- KrakenD circuit breaker documentation: https://www.krakend.io/docs/v2.0/backends/circuit-breaker/
- KrakenD v2.5 backend caching documentation: https://www.krakend.io/docs/v2.5/backends/caching/
- KrakenD v2.5 extended metrics documentation: https://www.krakend.io/docs/v2.5/telemetry/extended-metrics/
- KrakenD v2.5 Prometheus telemetry documentation: https://www.krakend.io/docs/v2.5/telemetry/prometheus/
- Current KrakenD Prometheus/OpenTelemetry documentation for version caveats: https://www.krakend.io/docs/telemetry/prometheus/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes ConfigMap volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- The Docker image examples used `devopsfaith/krakend:2.5`, while the KrakenD v2.5 official Docker documentation uses the official `krakend:2.5` image. Updated the `docker pull` command and Kubernetes Deployment image.
- The timeout section claimed backend-level timeouts and retries. KrakenD v2.5 exposes `timeout` on the endpoint object, and `timeout` is not a valid backend field in the v2.5 backend schema. Updated the section title and explanation, removed invalid backend `timeout` fields, and changed the example to a valid GET aggregation.
- The checkout timeout example implicitly configured multiple unsafe POST backends, which KrakenD v2.5 documentation says is not allowed without sequential proxying. Updated the example to a GET checkout summary aggregation.
- The HTTP cache namespace used the legacy `github.com/devopsfaith/krakend-httpcache` key. Updated it to the documented KrakenD v2.5 namespace `qos/http-cache`.
- The circuit breaker example used camelCase keys `maxErrors` and `logStatusChange`. Updated them to the documented snake_case keys `max_errors` and `log_status_change`, and adjusted the explanation to match the threshold behavior.
- The monitoring section said KrakenD exposes Prometheus metrics at `/__stats` by default and described the snippet as OpenTelemetry. In KrakenD v2.5, `/__stats` is provided by the optional `telemetry/metrics` component, while Prometheus scraping uses the OpenCensus exporter. Updated the text and added the documented `sample_rate` and `reporting_period` fields.
- The performance section claimed horizontal scaling is linear without caveats. Reworded it to note that proportional scaling depends on the gateway being the bottleneck and on backend and network capacity.

## Review Notes
- KrakenD 2.5 is an older release. The post is internally consistent with v2.5 after the fixes, but current KrakenD versions use `telemetry/opentelemetry` for Prometheus instead of the v2.5 OpenCensus configuration.
- The Kubernetes examples are plausible and use valid ConfigMap and Deployment patterns, but a production manifest would also normally include namespace creation, readiness/liveness probes, and a rollout strategy.
