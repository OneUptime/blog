# Validation Summary: How to Create Prometheus Metrics in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core
- prometheus-net
- Prometheus metrics
- Grafana
- Kubernetes
- Prometheus Operator ServiceMonitor

## Sources Consulted
- prometheus-net official README and API examples: https://github.com/prometheus-net/prometheus-net
- prometheus-net ASP.NET Core metric server middleware source: https://github.com/prometheus-net/prometheus-net/blob/master/Prometheus.AspNetCore/MetricServerMiddlewareExtensions.cs
- prometheus-net HTTP request metrics source: https://github.com/prometheus-net/prometheus-net/blob/master/Prometheus.AspNetCore/HttpMetrics/HttpRequestCountMiddleware.cs
- prometheus-net HTTP request duration source: https://github.com/prometheus-net/prometheus-net/blob/master/Prometheus.AspNetCore/HttpMetrics/HttpRequestDurationMiddleware.cs
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Microsoft .NET CLI package add documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft ASP.NET Core routing and middleware documentation: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/routing

## Issues Found
- The initial ASP.NET Core setup used `app.UseMetricServer()` for the `/metrics` endpoint. This still exists, but current prometheus-net ASP.NET Core examples use endpoint routing with `MapMetrics()`. Changed the example to call `app.MapMetrics()` and kept `UseHttpMetrics()` in the request pipeline.
- The Kubernetes separate-port example used `app.UseMetricServer(port: 9090)`, which filters requests on an existing listener rather than creating a separate metrics listener by itself. Changed it to `builder.Services.AddMetricServer(options => { options.Port = 9090; });`, matching prometheus-net documentation for a pipeline-integrated separate port.
- Two custom histogram examples used the metric name `http_request_duration_seconds`, which collides with prometheus-net's built-in ASP.NET Core HTTP request duration metric when `UseHttpMetrics()` is enabled. Renamed those custom metrics to `app_http_request_duration_seconds`.
- The ServiceMonitor snippet used `port: metrics` without stating the required assumption. Added a short note that the selected Kubernetes Service must expose a named port called `metrics` pointing to port 9090.

## Review Notes
The remaining examples are illustrative and depend on application-specific types such as `IOrderService`, `OrderDto`, and `PaymentFailedException`. The metric APIs, metric type explanations, label-cardinality guidance, histogram bucket usage, summary objectives, and ServiceMonitor field shapes are technically consistent with the consulted documentation. The local environment did not have the .NET SDK installed, so snippets were reviewed against official documentation and source rather than compiled locally.
