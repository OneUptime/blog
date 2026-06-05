# Validation Summary: How to Set Up OpenTelemetry Metrics Collection in C++ Applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry C++ API and SDK
- OpenTelemetry metrics instruments: counters, histograms, observable gauges
- OTLP HTTP metric exporter
- Metric readers, aggregation, and views
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry C++ repository README and examples: https://github.com/open-telemetry/opentelemetry-cpp
- OpenTelemetry C++ OTLP HTTP metrics example: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/examples/otlp/http_metric_main.cc
- OpenTelemetry C++ metrics example with views: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/examples/metrics_simple/metrics_ostream.cc
- OpenTelemetry C++ Meter API header: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/api/include/opentelemetry/metrics/meter.h
- OpenTelemetry C++ synchronous instruments header: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/api/include/opentelemetry/metrics/sync_instruments.h
- OpenTelemetry C++ asynchronous instruments and observer result headers: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/api/include/opentelemetry/metrics/async_instruments.h and https://github.com/open-telemetry/opentelemetry-cpp/blob/main/api/include/opentelemetry/metrics/observer_result.h
- OpenTelemetry C++ SDK MeterProvider and MeterContext headers: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/sdk/include/opentelemetry/sdk/metrics/meter_provider.h and https://github.com/open-telemetry/opentelemetry-cpp/blob/main/sdk/include/opentelemetry/sdk/metrics/meter_context.h
- OpenTelemetry C++ View and aggregation configuration headers: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/sdk/include/opentelemetry/sdk/metrics/view/view.h and https://github.com/open-telemetry/opentelemetry-cpp/blob/main/sdk/include/opentelemetry/sdk/metrics/aggregation/aggregation_config.h
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry metric semantic conventions and units: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry HTTP semantic conventions and migration notes: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/ and https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/

## Issues Found
- The SDK setup used an invalid current `MeterProvider` constructor that passed a metric reader directly. Updated it to create a `MeterContext`, add the `PeriodicExportingMetricReader`, create the provider with `MeterProviderFactory`, and then set the global provider.
- The observable gauge example passed callbacks directly to `CreateInt64ObservableGauge` / `CreateDoubleObservableGauge`, which is not the current C++ API. Updated it to create observable instruments first and register callbacks with `AddCallback`.
- The observable gauge members were typed as `std::unique_ptr`, but the C++ API returns `nostd::shared_ptr<ObservableInstrument>`. Updated the member types.
- The observable callbacks called `Observe` directly on `ObserverResult`, but the C++ type is a variant of typed observer results. Updated the callbacks to extract the correct typed `ObserverResultT` before observing values.
- The view example used a non-current `View` constructor shape and an invalid `MeterProvider` constructor. Updated it to use `HistogramAggregationConfig`, `InstrumentSelector`, `MeterSelector`, `View`, `MeterContext::AddView`, and `MeterProviderFactory`.
- The histogram description said histograms provide percentiles directly. Updated it to state that histograms export bucket counts, count, sum, and optional min/max, and that backends can calculate percentiles from bucketed data.
- Several metric units used non-conventional strings such as `bytes`, `percent`, `requests`, and `tasks`. Updated them to OpenTelemetry unit guidance such as `By`, `1`, and UCUM annotations like `{request}`.
- HTTP attributes used older semantic convention names `http.method` and `http.status_code`, with status code as a string. Updated them to `http.request.method` and `http.response.status_code`, with status code recorded as an integer attribute value.

## Review Notes
The examples still use placeholder application types and helper functions such as `HTTPRequest`, `HTTPResponse`, `CreateServiceResource`, and platform-specific resource helpers. That is acceptable for a tutorial, but readers would need to provide those definitions in a complete application.
