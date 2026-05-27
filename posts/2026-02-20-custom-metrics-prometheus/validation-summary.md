# Validation Summary: How to Create and Expose Custom Prometheus Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Prometheus
- PromQL
- Prometheus Python client
- FastAPI
- Kubernetes service discovery for Prometheus
- YAML configuration

## Sources Consulted
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus histograms and summaries best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Python client Counter documentation: https://prometheus.github.io/client_python/instrumenting/counter/
- Prometheus Python client labels documentation: https://prometheus.github.io/client_python/instrumenting/labels/
- Prometheus Python client Histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/
- Prometheus Python client Summary documentation: https://prometheus.github.io/client_python/instrumenting/summary/
- Prometheus Python client multiprocess mode documentation: https://prometheus.github.io/client_python/multiprocess/

## Issues Found
- The metric type diagram described summaries as "Pre-calculated quantiles" with a percentile example. That is accurate for some Prometheus client libraries, but not for the Python client used in this post. The official Prometheus Python client Summary documentation states that it does not compute quantiles locally and exposes count and sum. Updated the Summary nodes to describe count/sum observations and response time averages.

## Review Notes
- The Python code examples are syntactically valid. Some names such as `charge_payment`, `fulfill_order`, and `PaymentError` are application placeholders rather than complete runnable definitions.
- The FastAPI metrics endpoint follows the Prometheus Python client exposition pattern, including the documented `CollectorRegistry` and `multiprocess.MultiProcessCollector` approach for multiprocess deployments.
- The PromQL examples are valid for counters and classic histograms. Aggregation may be needed in real dashboards when combining multiple label values or instances.
