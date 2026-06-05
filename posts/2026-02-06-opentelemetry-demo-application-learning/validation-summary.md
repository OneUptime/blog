# Validation Summary: How to Use the OpenTelemetry Demo Application for Learning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Demo Application
- OpenTelemetry Collector
- OpenTelemetry semantic conventions
- Docker Compose
- Kubernetes and Helm
- Jaeger
- Prometheus
- Grafana
- OpenFeature / flagd feature flags
- Go, Python, TypeScript, JavaScript, Java, .NET, C++, Kotlin, PHP, Ruby, Rust, and Elixir services

## Sources Consulted
- OpenTelemetry Demo documentation: https://opentelemetry.io/docs/demo/
- OpenTelemetry Demo Docker deployment documentation: https://opentelemetry.io/docs/demo/docker-deployment/
- OpenTelemetry Demo Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/demo/
- OpenTelemetry Demo feature flags documentation: https://opentelemetry.io/docs/demo/feature-flags/
- OpenTelemetry Demo GitHub repository: https://github.com/open-telemetry/opentelemetry-demo
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/

## Issues Found
- The post described an older 11-service demo and omitted current languages and components. Updated the service/language description to match the current OpenTelemetry Demo documentation.
- The Docker prerequisites and startup command were outdated. Updated RAM guidance to about 6GB for the full application and changed the Docker Compose command to the current documented form.
- UI URLs were outdated. Updated Jaeger, Grafana, Feature Flags, and Load Generator access paths to use the frontend proxy paths documented by OpenTelemetry.
- The Kubernetes section incorrectly claimed ingress and persistence were included. Replaced that with the current documented `kubectl port-forward` commands for the frontend proxy and Collector OTLP/HTTP receiver.
- The post referred to Redis caching in the cart service. Updated this to Valkey, which is what the current demo uses.
- Several Jaeger examples used old service names such as `productcatalogservice`, `paymentservice`, and `cartservice`. Updated them to current service names such as `product-catalog`, `payment`, and `cart`.
- The feature flag examples described outdated or incorrect flags, including product catalog caching and ad service memory leaks. Updated the examples to current flags such as `recommendationServiceCacheFailure`, `productCatalogFailure`, `paymentServiceFailure`, and `cartServiceFailure`.
- Semantic convention attributes used older names such as `http.method`, `http.status_code`, `http.url`, `db.system`, and `db.statement`. Updated the examples to current attributes such as `http.request.method`, `http.response.status_code`, `url.full`, `db.system.name`, `db.query.text`, and `db.operation.name`.
- The Grafana PromQL example used an outdated metric name. Updated it to `rate(http_server_request_duration_seconds_count[5m])`.
- The payment service stop command used the wrong Compose service name. Updated it from `paymentservice` to `payment`.
- The Collector path and exporter names were outdated. Updated the path to `src/otel-collector/otelcol-config.yml` and changed the example exporter names to match the current observability configuration.
- The Node.js custom metric example implied the current frontend was an Express app and returned an undefined `result`. Reworded it as a generic Node.js service example and fixed the response.

## Review Notes
The post is technically relevant and valid after correction. The OpenTelemetry Demo evolves quickly, so service lists, feature flags, and metric names should be rechecked against the official demo docs during future reviews.
