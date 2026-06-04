# Validation Summary: How to Configure Prometheus Target Relabeling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus scrape configuration
- Prometheus target relabeling and metric relabeling
- Kubernetes service discovery
- Kubernetes pod, EndpointSlice, StatefulSet, and Service metadata
- Prometheus HTTP API

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus relabeling configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
- Prometheus Kubernetes service discovery documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes Service and EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The dynamic port selection example claimed a fallback to the first port but rewrote `__address__` to only the host, removing the port. I changed the example to select named metrics ports and preserve the discovered `host:port` address.
- The service discovery example used the older `endpoints` role. I updated it to `endpointslice`, which is the current Prometheus recommendation for Kubernetes clusters using EndpointSlices.
- The HTTPS section implied TLS verification could be configured per target by relabeling to `__param_tls_skip_verify`. Relabeling to `__param_*` only creates scrape URL query parameters and does not configure Prometheus TLS verification. I removed that incorrect rule and kept TLS configuration at the job level.
- The StatefulSet stable-address example used `__meta_kubernetes_service_name` with pod discovery, where that metadata label is not available. I changed the example to build a StatefulSet DNS name from pod name, namespace, and an annotation-provided port, using a placeholder headless Service name.
- The debugging example used `__tmp_*` labels for values the reader was supposed to inspect later. Prometheus reserves `__tmp` labels for temporary relabeling intermediates, so I changed them to visible temporary debug labels.
- The multi-container example said it kept all containers while the rule actually kept only metrics-named ports. I corrected the comment.

## Review Notes
- `promtool` was not installed in the local environment, so full Prometheus configuration validation was performed by checking the snippets against the official Prometheus configuration documentation rather than running `promtool check config`.
- The common annotation-based pod scrape pattern can create duplicate targets for multi-port pods if all discovered container ports are rewritten to the same annotated port. The post now uses named port selection where it discusses multi-port handling.
